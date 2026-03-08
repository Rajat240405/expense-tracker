/**
 * directSplitService.ts
 *
 * Supabase CRUD for direct_splits and direct_expenses tables.
 * RLS ensures only the two participants can access each split.
 */

import { supabase } from './supabase';
import type { DirectSplit, DirectExpense } from '../types';

// ─── Direct Splits ────────────────────────────────────────────────────────────

export async function fetchDirectSplits(): Promise<DirectSplit[]> {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id ?? '';

    const { data, error } = await supabase
        .from('direct_splits')
        .select('id, user_one, user_two, label, currency, created_at')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    const splits = (data ?? []).map(toDirectSplit);

    // Resolve the partner's display name for each split.
    // Partner = the OTHER user (not the current user).
    const partnerIds = [...new Set(
        splits.map((s) => s.userOne === currentUserId ? s.userTwo : s.userOne).filter(Boolean)
    )];
    if (partnerIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, name')
            .in('id', partnerIds);
        const nameMap: Record<string, string> = {};
        for (const p of profiles ?? []) {
            nameMap[p.id as string] = (p.display_name as string) || (p.name as string) || '';
        }
        return splits.map((s) => {
            const partnerId = s.userOne === currentUserId ? s.userTwo : s.userOne;
            return { ...s, partnerName: nameMap[partnerId] || undefined };
        });
    }
    return splits;
}

export async function createDirectSplit(
    input: Pick<DirectSplit, 'userTwo' | 'label' | 'currency'>
): Promise<DirectSplit> {
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('direct_splits')
        .insert({
            user_one: me.user.id,
            user_two: input.userTwo,
            label:    input.label ?? null,
            currency: input.currency,
        })
        .select('id, user_one, user_two, label, currency, created_at')
        .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to create direct split');
    return toDirectSplit(data);
}

/**
 * Look up a partner by email and create a split in one atomic RPC call.
 * Requires the `create_direct_split_by_email` SECURITY DEFINER function
 * to be present in Supabase (see fix-new-tables.sql for the SQL).
 */
export async function createDirectSplitByEmail(
    partnerEmail: string,
    label: string | undefined,
    currency: string,
): Promise<DirectSplit> {
    const { data, error } = await supabase.rpc('create_direct_split_by_email', {
        partner_email: partnerEmail.trim().toLowerCase(),
        p_label:       label ?? null,
        p_currency:    currency,
    });

    if (error) throw new Error(error.message);
    if (data?.error === 'user_not_found')      throw new Error('No account found with that email.');
    if (data?.error === 'cannot_split_with_self') throw new Error('You cannot split with yourself.');
    if (data?.error || !data?.split_id)        throw new Error(data?.error ?? 'Failed to create split.');

    // Fetch the newly created split so we return a full DirectSplit object
    const { data: row, error: fetchErr } = await supabase
        .from('direct_splits')
        .select('id, user_one, user_two, label, currency, created_at')
        .eq('id', data.split_id)
        .single();

    if (fetchErr || !row) throw new Error('Split created but could not load it.');
    return toDirectSplit(row as Record<string, unknown>);
}

export async function deleteDirectSplit(id: string): Promise<void> {
    const { error } = await supabase.from('direct_splits').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// ─── Direct Expenses ──────────────────────────────────────────────────────────

export async function fetchDirectExpenses(splitId: string): Promise<DirectExpense[]> {
    const { data, error } = await supabase
        .from('direct_expenses')
        .select('id, split_id, paid_by, amount, description, category, date, timestamp, settled, created_at')
        .eq('split_id', splitId)
        .order('timestamp', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(toDirectExpense);
}

export async function addDirectExpense(
    input: Omit<DirectExpense, 'id' | 'createdAt' | 'settled'>
): Promise<DirectExpense> {
    const { data, error } = await supabase
        .from('direct_expenses')
        .insert({
            split_id:    input.splitId,
            paid_by:     input.paidBy,
            amount:      Math.round(input.amount * 100) / 100,
            description: input.description ?? null,
            category:    input.category ?? null,
            date:        input.date,
            timestamp:   input.timestamp,
            settled:     false,
        })
        .select('id, split_id, paid_by, amount, description, category, date, timestamp, settled, created_at')
        .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add direct expense');
    return toDirectExpense(data);
}

export async function settleDirectExpense(id: string): Promise<void> {
    const { error } = await supabase
        .from('direct_expenses')
        .update({ settled: true })
        .eq('id', id);
    if (error) throw new Error(error.message);
}

export async function deleteDirectExpense(id: string): Promise<void> {
    const { error } = await supabase.from('direct_expenses').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// ─── Converters ───────────────────────────────────────────────────────────────

function toDirectSplit(row: Record<string, unknown>): DirectSplit {
    return {
        id:        row.id as string,
        userOne:   row.user_one as string,
        userTwo:   row.user_two as string,
        label:     row.label as string | undefined,
        currency:  row.currency as string,
        createdAt: new Date(row.created_at as string).getTime(),
    };
}

function toDirectExpense(row: Record<string, unknown>): DirectExpense {
    return {
        id:          row.id as string,
        splitId:     row.split_id as string,
        paidBy:      row.paid_by as string,
        amount:      Number(row.amount),
        description: row.description as string | undefined,
        category:    row.category as string | undefined,
        date:        row.date as string,
        timestamp:   row.timestamp as number,
        settled:     row.settled as boolean,
        createdAt:   new Date(row.created_at as string).getTime(),
    };
}
