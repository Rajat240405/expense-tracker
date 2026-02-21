/**
 * GroupService.ts
 *
 * All Supabase CRUD for groups, members, expenses, and settlements.
 * Converts between flat DB rows and the app's domain types.
 *
 * Architecture: strict authenticated-only.
 *   • group_members.user_id is NOT NULL → references profiles(id)
 *   • GroupMember.name is sourced from profiles.display_name
 *   • GroupExpense.paidByName is denormalised from the paid_by_member join
 */

import { supabase } from './supabase';
import type {
    Group,
    GroupMember,
    GroupExpense,
    ParticipantShare,
    Settlement,
    SplitType,
} from '../types';

// ─── DB row shapes ────────────────────────────────────────────────────────────

/** Nested profile sub-select — present on every join that touches profiles */
interface DbProfile {
    display_name: string | null;
}

interface DbGroup {
    id: string;
    name: string;
    description: string | null;
    currency: string;
    created_by: string;
    created_at: string;
    group_members: DbMember[];
}

interface DbMember {
    id: string;
    group_id: string;
    user_id: string;          // NOT NULL — always a real auth user
    is_you: boolean;
    joined_at: string;
    profiles: DbProfile;      // joined from profiles table
}

/** Lightweight member shape used inside the expense paid_by join */
interface DbExpenseMember {
    id: string;
    profiles: DbProfile;
}

interface DbExpense {
    id: string;
    group_id: string;
    description: string;
    total_amount: number;
    currency: string;
    paid_by_member_id: string;
    paid_by_member: DbExpenseMember;     // joined to resolve display name
    split_type: string;
    date: string;
    timestamp: number;
    category: string | null;
    created_by: string;
    group_expense_participants: DbParticipant[];
}

interface DbParticipant {
    member_id: string;
    share: number;
}

interface DbSettlement {
    id: string;
    group_id: string;
    from_member_id: string;
    to_member_id: string;
    amount: number;
    currency: string;
    note: string | null;
    date: string;
    timestamp: number;
}

// ─── Supabase select strings (single source of truth) ─────────────────────────

const GROUP_SELECT = `
  id, name, description, currency, created_by, created_at,
  group_members (
    id, group_id, user_id, is_you, joined_at,
    profiles ( display_name )
  )
` as const;

const EXPENSE_SELECT = `
  id, group_id, description, total_amount, currency,
  paid_by_member_id, split_type, date, timestamp, category, created_by,
  paid_by_member:group_members!paid_by_member_id (
    id,
    profiles ( display_name )
  ),
  group_expense_participants ( member_id, share )
` as const;

// ─── Converters ───────────────────────────────────────────────────────────────

function resolveDisplayName(profile: DbProfile, fallback: string): string {
    return profile.display_name?.trim() || fallback;
}

function toGroup(row: DbGroup, currentUserId: string): Group {
    return {
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        currency: row.currency,
        createdAt: new Date(row.created_at).getTime(),
        members: row.group_members.map((m) => toMember(m, currentUserId)),
    };
}

function toMember(row: DbMember, currentUserId: string): GroupMember {
    return {
        id: row.id,
        name: resolveDisplayName(row.profiles, row.user_id.slice(0, 8)),
        // Compute dynamically — the DB's is_you was set by the creator and
        // would be wrong for every other member who later views the group.
        isYou: row.user_id === currentUserId,
    };
}

function toExpense(row: DbExpense): GroupExpense {
    return {
        id: row.id,
        groupId: row.group_id,
        description: row.description,
        totalAmount: Number(row.total_amount),
        currency: row.currency,
        paidByMemberId: row.paid_by_member_id,
        paidByName: resolveDisplayName(
            row.paid_by_member.profiles,
            row.paid_by_member_id.slice(0, 8)
        ),
        splitType: row.split_type as SplitType,
        participants: row.group_expense_participants.map(
            (p): ParticipantShare => ({
                memberId: p.member_id,
                share: Number(p.share),
            })
        ),
        date: row.date,
        timestamp: row.timestamp,
        category: row.category ?? undefined,
    };
}

function toSettlement(row: DbSettlement): Settlement {
    return {
        id: row.id,
        groupId: row.group_id,
        fromMemberId: row.from_member_id,
        toMemberId: row.to_member_id,
        amount: Number(row.amount),
        currency: row.currency,
        note: row.note ?? undefined,
        date: row.date,
        timestamp: row.timestamp,
    };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Fetch all groups (with members + profile names) the current user belongs to. */
export async function fetchGroups(): Promise<Group[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id ?? '';

    const { data, error } = await supabase
        .from('groups')
        .select(GROUP_SELECT)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[GroupService] fetchGroups:', error.message);
        return [];
    }
    return (data as unknown as DbGroup[]).map((row) => toGroup(row, currentUserId));
}

/** Fetch a single group by id (e.g. after invite redemption). */
export async function fetchGroup(groupId: string): Promise<Group | null> {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id ?? '';

    const { data, error } = await supabase
        .from('groups')
        .select(GROUP_SELECT)
        .eq('id', groupId)
        .single();

    if (error) {
        // Throw so callers (e.g. createGroup) surface the real message in the UI
        throw new Error(`fetchGroup failed: ${error.message} (code: ${error.code})`);
    }
    return toGroup(data as unknown as DbGroup, currentUserId);
}

/**
 * Fetch expenses + participants + paid_by display name for a set of group ids.
 * Each expense carries paidByName (from profiles via the paid_by_member join).
 */
export async function fetchExpenses(groupIds: string[]): Promise<GroupExpense[]> {
    if (groupIds.length === 0) return [];

    const { data, error } = await supabase
        .from('group_expenses')
        .select(EXPENSE_SELECT)
        .in('group_id', groupIds)
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('[GroupService] fetchExpenses:', error.message);
        return [];
    }
    return (data as unknown as DbExpense[]).map(toExpense);
}

/** Fetch all settlements for a set of group ids. */
export async function fetchSettlements(groupIds: string[]): Promise<Settlement[]> {
    if (groupIds.length === 0) return [];

    const { data, error } = await supabase
        .from('group_settlements')
        .select('id, group_id, from_member_id, to_member_id, amount, currency, note, date, timestamp')
        .in('group_id', groupIds)
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('[GroupService] fetchSettlements:', error.message);
        return [];
    }
    return (data as unknown as DbSettlement[]).map(toSettlement);
}

// ─── Write: Groups ────────────────────────────────────────────────────────────

export interface CreateGroupInput {
    name: string;
    description?: string;
    currency: string;
    /** The authenticated user creating the group. */
    userId: string;
}

/**
 * Creates a group + the creator's group_members row in one atomic transaction
 * via the `create_group_with_member` SECURITY DEFINER RPC.
 *
 * Why RPC instead of two separate inserts?
 *   The old two-step approach hit a circular RLS deadlock:
 *     • group_members INSERT policy → needs to SELECT groups
 *     • groups SELECT policy         → needs a group_members row
 *   The RPC runs as the DB owner (SECURITY DEFINER) so RLS is skipped for
 *   both inserts; the function enforces auth itself (auth.uid() IS NOT NULL).
 *
 * Throws an Error (with the Supabase message) on failure so callers can
 * catch and display it — never silently returns null.
 */
export async function createGroup(input: CreateGroupInput): Promise<Group> {
    const { data: groupId, error: rpcErr } = await supabase.rpc(
        'create_group_with_member',
        {
            p_name:        input.name,
            p_description: input.description ?? null,
            p_currency:    input.currency,
        }
    );

    if (rpcErr) {
        console.error('[GroupService] createGroup — RPC error:', rpcErr);
        throw new Error(rpcErr.message ?? 'RPC create_group_with_member failed');
    }
    if (!groupId) {
        throw new Error('RPC returned no group id — check Supabase logs');
    }

    // Fetch the full group (resolves member display names from profiles join)
    const group = await fetchGroup(groupId as string);
    if (!group) {
        throw new Error(`Group created (id: ${groupId}) but could not be fetched — check RLS SELECT policies`);
    }
    return group;
}

export async function deleteGroup(groupId: string): Promise<boolean> {
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) { console.error('[GroupService] deleteGroup:', error.message); return false; }
    return true;
}

// ─── Write: Expenses ──────────────────────────────────────────────────────────

export async function addExpense(
    expense: Omit<GroupExpense, 'id' | 'timestamp' | 'paidByName'>,
    userId: string
): Promise<GroupExpense> {
    const timestamp = Date.now();

    const { data: row, error: eErr } = await supabase
        .from('group_expenses')
        .insert({
            group_id: expense.groupId,
            description: expense.description,
            total_amount: Math.round(expense.totalAmount * 100) / 100,
            currency: expense.currency,
            paid_by_member_id: expense.paidByMemberId,
            split_type: expense.splitType,
            date: expense.date,
            timestamp,
            category: expense.category ?? null,
            created_by: userId,
        })
        .select('id')
        .single();

    if (eErr || !row) {
        console.error('[GroupService] addExpense:', eErr);
        throw new Error(eErr?.message ?? 'Failed to insert expense');
    }

    const participants = expense.participants.map((p) => ({
        expense_id: row.id,
        member_id: p.memberId,
        share: p.share,
    }));

    const { error: pErr } = await supabase
        .from('group_expense_participants')
        .insert(participants);

    if (pErr) {
        console.error('[GroupService] addExpense participants:', pErr);
        await supabase.from('group_expenses').delete().eq('id', row.id);
        throw new Error(pErr.message ?? 'Failed to insert participants');
    }

    // Return optimistic local value; paidByName resolved on next full fetch
    return { ...expense, id: row.id, timestamp };
}

export async function deleteExpense(expenseId: string): Promise<boolean> {
    const { error } = await supabase.from('group_expenses').delete().eq('id', expenseId);
    if (error) { console.error('[GroupService] deleteExpense:', error.message); return false; }
    return true;
}

// ─── Write: Settlements ───────────────────────────────────────────────────────

export async function addSettlement(
    settlement: Omit<Settlement, 'id' | 'timestamp'>,
    userId: string
): Promise<Settlement | null> {
    const timestamp = Date.now();

    const { data: row, error } = await supabase
        .from('group_settlements')
        .insert({
            group_id: settlement.groupId,
            from_member_id: settlement.fromMemberId,
            to_member_id: settlement.toMemberId,
            amount: settlement.amount,
            currency: settlement.currency,
            note: settlement.note ?? null,
            date: settlement.date,
            timestamp,
            created_by: userId,
        })
        .select('id')
        .single();

    if (error || !row) {
        console.error('[GroupService] addSettlement:', error?.message);
        return null;
    }

    return { ...settlement, id: row.id, timestamp };
}

export async function deleteSettlement(settlementId: string): Promise<boolean> {
    const { error } = await supabase.from('group_settlements').delete().eq('id', settlementId);
    if (error) { console.error('[GroupService] deleteSettlement:', error.message); return false; }
    return true;
}
