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
    const { data, error } = await supabase
        .from('direct_splits')
        .select('id, user_one, user_two, label, currency, created_at')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(toDirectSplit);
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
