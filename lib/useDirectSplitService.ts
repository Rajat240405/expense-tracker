/**
 * useDirectSplitService.ts
 *
 * Returns the correct 1-1 split service implementation based on auth state:
 *   - Authenticated users  → Supabase for email-linked splits + localStorage for
 *                            name-only ("offline friend") splits merged together.
 *   - Guest users          → localStorage only (guestDirectSplitService).
 *
 * Local splits created by auth users use IDs prefixed with "local:" so every
 * operation can route them to localStorage without touching Supabase.
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as SupabaseSvc from './directSplitService';
import * as GuestSvc    from './guestDirectSplitService';
import type { DirectSplit, DirectExpense } from '../types';

// ─── Shared interface ─────────────────────────────────────────────────────────

export interface DirectSplitService {
    fetchDirectSplits:   ()                                                    => Promise<DirectSplit[]>;
    createDirectSplit:   (input: Pick<DirectSplit, 'userTwo' | 'label' | 'currency'>) => Promise<DirectSplit>;
    deleteDirectSplit:   (id: string)                                          => Promise<void>;
    fetchDirectExpenses: (splitId: string)                                     => Promise<DirectExpense[]>;
    addDirectExpense:    (input: Omit<DirectExpense, 'id' | 'createdAt' | 'settled'>) => Promise<DirectExpense>;
    settleDirectExpense: (id: string)                                          => Promise<void>;
    deleteDirectExpense: (id: string)                                          => Promise<void>;
    /** true when data is stored locally (no cloud sync) */
    isGuest: boolean;
    /** stable user ID for the current session ('guest' for unauthenticated users) */
    currentUserId: string;
}

// ─── Helper: per-user localStorage split store ────────────────────────────────

function makeLocalStore(userId: string) {
    const SPLITS_KEY   = `local_splits:${userId}`;
    const EXPENSES_KEY = `local_expenses:${userId}`;

    const load = <T>(key: string): T[] => {
        try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
    };
    const save = <T>(key: string, val: T[]) => {
        localStorage.setItem(key, JSON.stringify(val));
    };

    return {
        getSplits:    (): DirectSplit[]  => load<DirectSplit>(SPLITS_KEY),
        saveSplits:   (s: DirectSplit[]) => save(SPLITS_KEY, s),
        getExpenses:  (): DirectExpense[]  => load<DirectExpense>(EXPENSES_KEY),
        saveExpenses: (e: DirectExpense[]) => save(EXPENSES_KEY, e),
    };
}

const isLocalId = (id: string) => id.startsWith('local:');

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDirectSplitService(): DirectSplitService {
    const { user } = useAuth();

    return useMemo<DirectSplitService>(() => {
        if (user) {
            const uid   = user.id;
            const store = makeLocalStore(uid);

            return {
                isGuest:       false,
                currentUserId: uid,

                fetchDirectSplits: async () => {
                    const [remote, local] = await Promise.all([
                        SupabaseSvc.fetchDirectSplits(),
                        Promise.resolve(
                            store.getSplits()
                                .sort((a, b) => b.createdAt - a.createdAt)
                                .map((s) => ({ ...s, isLocal: true })),
                        ),
                    ]);
                    return [...remote, ...local];
                },

                // Used only for name-only (no-email) offline splits — stored locally.
                createDirectSplit: async (input) => {
                    const split: DirectSplit = {
                        id:        `local:${crypto.randomUUID()}`,
                        userOne:   uid,
                        userTwo:   input.userTwo,
                        label:     input.label,
                        currency:  input.currency,
                        createdAt: Date.now(),
                        isLocal:   true,
                    };
                    store.saveSplits([split, ...store.getSplits()]);
                    return split;
                },

                deleteDirectSplit: async (id) => {
                    if (isLocalId(id)) {
                        store.saveSplits(store.getSplits().filter((s) => s.id !== id));
                        store.saveExpenses(store.getExpenses().filter((e) => e.splitId !== id));
                    } else {
                        await SupabaseSvc.deleteDirectSplit(id);
                    }
                },

                fetchDirectExpenses: async (splitId) => {
                    if (isLocalId(splitId)) {
                        return store.getExpenses()
                            .filter((e) => e.splitId === splitId)
                            .sort((a, b) => b.timestamp - a.timestamp);
                    }
                    return SupabaseSvc.fetchDirectExpenses(splitId);
                },

                addDirectExpense: async (input) => {
                    if (isLocalId(input.splitId)) {
                        const expense: DirectExpense = {
                            id:          `local:${crypto.randomUUID()}`,
                            splitId:     input.splitId,
                            paidBy:      input.paidBy,
                            amount:      Math.round(input.amount * 100) / 100,
                            description: input.description,
                            category:    input.category,
                            date:        input.date,
                            timestamp:   input.timestamp,
                            settled:     false,
                            createdAt:   Date.now(),
                        };
                        store.saveExpenses([expense, ...store.getExpenses()]);
                        return expense;
                    }
                    return SupabaseSvc.addDirectExpense(input);
                },

                settleDirectExpense: async (id) => {
                    if (isLocalId(id)) {
                        store.saveExpenses(
                            store.getExpenses().map((e) => e.id === id ? { ...e, settled: true } : e),
                        );
                    } else {
                        await SupabaseSvc.settleDirectExpense(id);
                    }
                },

                deleteDirectExpense: async (id) => {
                    if (isLocalId(id)) {
                        store.saveExpenses(store.getExpenses().filter((e) => e.id !== id));
                    } else {
                        await SupabaseSvc.deleteDirectExpense(id);
                    }
                },
            };
        }

        // ── Guest (unauthenticated) path ──────────────────────────────────────
        return {
            fetchDirectSplits:   GuestSvc.fetchDirectSplits,
            createDirectSplit:   GuestSvc.createDirectSplit,
            deleteDirectSplit:   GuestSvc.deleteDirectSplit,
            fetchDirectExpenses: GuestSvc.fetchDirectExpenses,
            addDirectExpense:    GuestSvc.addDirectExpense,
            settleDirectExpense: GuestSvc.settleDirectExpense,
            deleteDirectExpense: GuestSvc.deleteDirectExpense,
            isGuest:       true,
            currentUserId: 'guest',
        };
    // Depend only on user?.id — JWT token refreshes change the user object
    // reference without changing the identity, which would otherwise recreate
    // the service and trigger unnecessary data reloads in DirectSplitsView.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id ?? null]);
}
