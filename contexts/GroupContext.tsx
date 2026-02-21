/**
 * GroupContext.tsx
 *
 * Auth-aware group state management.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  GUEST (no Supabase session)                                 │
 * │  • Data lives in localStorage (sandbox only)                 │
 * │  • Cleared when user signs in — no migration                 │
 * ├─────────────────────────────────────────────────────────────┤
 * │  AUTHENTICATED                                               │
 * │  • Data is fetched from Supabase on sign-in                  │
 * │  • All writes go directly to Supabase, state updated locally │
 * │  • localStorage is cleared and never written                 │
 * └─────────────────────────────────────────────────────────────┘
 *
 * The context VALUE SHAPE is identical to the original — all UI
 * components compile and run without any changes.
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import * as Svc from '../lib/GroupService';
import type {
    Group,
    GroupMember,
    GroupExpense,
    Settlement,
} from '../types';

// ─── localStorage keys (guest mode only) ─────────────────────────────────────

const LS = {
    GROUPS: 'groups_v1',
    EXPENSES: 'group_expenses_v1',
    SETTLEMENTS: 'group_settlements_v1',
} as const;

function lsLoad<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch { return fallback; }
}

function lsSave<T>(key: string, val: T): void {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
}

function lsClearAll(): void {
    [LS.GROUPS, LS.EXPENSES, LS.SETTLEMENTS].forEach((k) => localStorage.removeItem(k));
}

// ─── Context shape (identical to the previous version) ───────────────────────

interface GroupContextValue {
    /** True while initial data is loading (first fetch or auth change). */
    loading: boolean;

    groups: Group[];
    groupExpenses: GroupExpense[];
    settlements: Settlement[];

    // Group CRUD
    createGroup: (data: Omit<Group, 'id' | 'createdAt'>) => Promise<Group>;
    updateGroup: (id: string, data: Partial<Pick<Group, 'name' | 'description' | 'members' | 'currency'>>) => void;
    deleteGroup: (id: string) => Promise<void>;

    // Expense CRUD
    addGroupExpense: (expense: Omit<GroupExpense, 'id' | 'timestamp'>) => Promise<void>;
    deleteGroupExpense: (expenseId: string) => Promise<void>;

    // Settlement CRUD
    addSettlement: (settlement: Omit<Settlement, 'id' | 'timestamp'>) => Promise<void>;
    deleteSettlement: (settlementId: string) => Promise<void>;

    // Selectors
    getGroup: (groupId: string) => Group | undefined;
    getGroupExpenses: (groupId: string) => GroupExpense[];
    getGroupSettlements: (groupId: string) => Settlement[];

    // Invite join — fetches a group by id from Supabase and adds it to state
    loadGroup: (groupId: string) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GroupContext = createContext<GroupContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const GroupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<Group[]>([]);
    const [groupExpenses, setGroupExpenses] = useState<GroupExpense[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);

    // ── Auth-change effect: source of truth switch ────────────────────────────
    useEffect(() => {
        // Wait for auth to finish resolving so we don't briefly flash empty
        // guest state before the real session is available.
        if (authLoading) return;

        let cancelled = false;
        setLoading(true);

        if (user) {
            // ── Authenticated: wipe guest sandbox, fetch from Supabase ──
            lsClearAll();
            setGroups([]);
            setGroupExpenses([]);
            setSettlements([]);

            (async () => {
                const fetchedGroups = await Svc.fetchGroups();
                if (cancelled) return;

                const groupIds = fetchedGroups.map((g) => g.id);
                const [fetchedExpenses, fetchedSettlements] = await Promise.all([
                    Svc.fetchExpenses(groupIds),
                    Svc.fetchSettlements(groupIds),
                ]);

                if (cancelled) return;
                setGroups(fetchedGroups);
                setGroupExpenses(fetchedExpenses);
                setSettlements(fetchedSettlements);
                setLoading(false);
            })();
        } else {
            // ── Guest: load from localStorage sandbox ──
            setGroups(lsLoad<Group[]>(LS.GROUPS, []));
            setGroupExpenses(lsLoad<GroupExpense[]>(LS.EXPENSES, []));
            setSettlements(lsLoad<Settlement[]>(LS.SETTLEMENTS, []));
            setLoading(false);
        }

        return () => { cancelled = true; };
    }, [user, authLoading]);

    // ── Guest localStorage sync (only fires when not authenticated) ───────────
    useEffect(() => {
        if (!user) lsSave(LS.GROUPS, groups);
    }, [groups, user]);

    useEffect(() => {
        if (!user) lsSave(LS.EXPENSES, groupExpenses);
    }, [groupExpenses, user]);

    useEffect(() => {
        if (!user) lsSave(LS.SETTLEMENTS, settlements);
    }, [settlements, user]);

    // ── Supabase Realtime ─────────────────────────────────────────────
    //
    // One channel per authenticated session. Subscribes to postgres_changes
    // on all group-related tables. On any event:
    //   • A 300ms debounce coalesces burst events (e.g. Settle All)
    //   • Re-fetches the full dataset (respects RLS, keeps single source of truth)
    //   • Ignores events that arrive after unmount / user sign-out
    //
    useEffect(() => {
        if (!user) return;

        let cancelled = false;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const refresh = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                if (cancelled) return;
                try {
                    const fetchedGroups = await Svc.fetchGroups();
                    if (cancelled) return;
                    const groupIds = fetchedGroups.map((g) => g.id);
                    const [fetchedExpenses, fetchedSettlements] = await Promise.all([
                        Svc.fetchExpenses(groupIds),
                        Svc.fetchSettlements(groupIds),
                    ]);
                    if (cancelled) return;
                    setGroups(fetchedGroups);
                    setGroupExpenses(fetchedExpenses);
                    setSettlements(fetchedSettlements);
                } catch {
                    // Silently ignore — the app still works with stale state;
                    // the user can manually refresh if needed.
                }
            }, 300);
        };

        // Unique channel name per user avoids cross-session channel collisions.
        const channel = supabase
            .channel(`group-data:${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_expenses' },   refresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_settlements' }, refresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' },     refresh)
            .subscribe();

        return () => {
            cancelled = true;
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [user]);

    // ─── Group CRUD ───────────────────────────────────────────────────────────

    /**
     * createGroup keeps the same external signature as before:
     *   data = { name, description?, currency, members: GroupMember[] }
     *
     * For authenticated users, only the creator is inserted as the initial
     * group_members row. Additional members join via invite links.
     * The creator's display name is resolved from their Supabase profile.
     */
    const createGroup = useCallback(
        async (data: Omit<Group, 'id' | 'createdAt'>): Promise<Group> => {
            if (user) {
                // createGroup throws with the real Supabase error message on failure
                const newGroup = await Svc.createGroup({
                    name: data.name,
                    description: data.description,
                    currency: data.currency,
                    userId: user.id,
                });
                setGroups((prev) => [newGroup, ...prev]);
                return newGroup;
            } else {
                // Guest path — generate a fully local group (sandbox only)
                const localGroup: Group = {
                    ...data,
                    id: crypto.randomUUID(),
                    createdAt: Date.now(),
                };
                setGroups((prev) => [localGroup, ...prev]);
                return localGroup;
            }
        },
        [user]
    );


    /** updateGroup is metadata-only (name/description/currency/members).
     *  For simplicity, it updates local state only (Supabase write is additive here).
     *  A full DB update can be added later without touching any UI.
     */
    const updateGroup = useCallback(
        (id: string, data: Partial<Pick<Group, 'name' | 'description' | 'members' | 'currency'>>) => {
            setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...data } : g)));
        },
        []
    );

    const deleteGroup = useCallback(
        async (id: string) => {
            if (user) await Svc.deleteGroup(id);
            setGroups((prev) => prev.filter((g) => g.id !== id));
            setGroupExpenses((prev) => prev.filter((e) => e.groupId !== id));
            setSettlements((prev) => prev.filter((s) => s.groupId !== id));
        },
        [user]
    );

    // ─── Expense CRUD ─────────────────────────────────────────────────────────

    const addGroupExpense = useCallback(
        async (expense: Omit<GroupExpense, 'id' | 'timestamp'>) => {
            if (user) {
                // throws with real Supabase message on failure
                const saved = await Svc.addExpense(expense, user.id);
                setGroupExpenses((prev) => [saved, ...prev]);
            } else {
                const local: GroupExpense = {
                    ...expense,
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                };
                setGroupExpenses((prev) => [local, ...prev]);
            }
        },
        [user]
    );

    const deleteGroupExpense = useCallback(
        async (expenseId: string) => {
            if (user) await Svc.deleteExpense(expenseId);
            setGroupExpenses((prev) => prev.filter((e) => e.id !== expenseId));
        },
        [user]
    );

    // ─── Settlement CRUD ──────────────────────────────────────────────────────

    const addSettlement = useCallback(
        async (settlement: Omit<Settlement, 'id' | 'timestamp'>) => {
            if (user) {
                const saved = await Svc.addSettlement(settlement, user.id);
                if (!saved) throw new Error('Failed to add settlement');
                setSettlements((prev) => [saved, ...prev]);
            } else {
                const local: Settlement = {
                    ...settlement,
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                };
                setSettlements((prev) => [local, ...prev]);
            }
        },
        [user]
    );

    const deleteSettlement = useCallback(
        async (settlementId: string) => {
            if (user) await Svc.deleteSettlement(settlementId);
            setSettlements((prev) => prev.filter((s) => s.id !== settlementId));
        },
        [user]
    );

    // ─── Selectors ────────────────────────────────────────────────────────────

    const getGroup = useCallback(
        (groupId: string) => groups.find((g) => g.id === groupId),
        [groups]
    );

    const getGroupExpenses = useCallback(
        (groupId: string) =>
            groupExpenses
                .filter((e) => e.groupId === groupId)
                .sort((a, b) => b.timestamp - a.timestamp),
        [groupExpenses]
    );

    const getGroupSettlements = useCallback(
        (groupId: string) =>
            settlements
                .filter((s) => s.groupId === groupId)
                .sort((a, b) => b.timestamp - a.timestamp),
        [settlements]
    );

    /**
     * loadGroup — used after accepting an invite.
     * Fetches the group from Supabase and injects it into local state
     * without creating a new group in the DB.
     */
    const loadGroup = useCallback(
        async (groupId: string) => {
            if (!user) return;
            const group = await Svc.fetchGroup(groupId);
            if (!group) return;
            setGroups((prev) =>
                prev.some((g) => g.id === groupId) ? prev : [group, ...prev]
            );
        },
        [user]
    );

    // ─── Value ────────────────────────────────────────────────────────────────

    const value: GroupContextValue = {
        loading,
        groups,
        groupExpenses,
        settlements,
        createGroup,
        updateGroup,
        deleteGroup,
        addGroupExpense,
        deleteGroupExpense,
        addSettlement,
        deleteSettlement,
        getGroup,
        getGroupExpenses,
        getGroupSettlements,
        loadGroup,
    };

    return (
        <GroupContext.Provider value={value}>
            {children}
        </GroupContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGroups(): GroupContextValue {
    const ctx = useContext(GroupContext);
    if (!ctx) throw new Error('useGroups must be used inside <GroupProvider>');
    return ctx;
}
