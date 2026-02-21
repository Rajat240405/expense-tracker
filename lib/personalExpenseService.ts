/**
 * personalExpenseService.ts
 *
 * Supabase CRUD for the personal_expenses table.
 * RLS guarantees auth.uid() = user_id on all operations.
 */

import { supabase } from './supabase';
import type { PersonalExpense } from '../types';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function fetchPersonalExpenses(
    userId: string,
    year?: number,
    month?: number   // 0-based
): Promise<PersonalExpense[]> {
    let query = supabase
        .from('personal_expenses')
        .select('id, user_id, amount, currency, category, description, date, timestamp, created_at')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

    if (year !== undefined && month !== undefined) {
        const from = new Date(year, month, 1).toISOString().slice(0, 10);
        const to   = new Date(year, month + 1, 0).toISOString().slice(0, 10);
        query = query.gte('date', from).lte('date', to);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(toPersonalExpense);
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function addPersonalExpense(
    input: Omit<PersonalExpense, 'id' | 'createdAt'>
): Promise<PersonalExpense> {
    const { data, error } = await supabase
        .from('personal_expenses')
        .insert({
            user_id:     input.userId,
            amount:      Math.round(input.amount * 100) / 100,
            currency:    input.currency,
            category:    input.category ?? null,
            description: input.description ?? null,
            date:        input.date,
            timestamp:   input.timestamp,
        })
        .select('id, user_id, amount, currency, category, description, date, timestamp, created_at')
        .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to insert personal expense');
    return toPersonalExpense(data);
}

export async function updatePersonalExpense(
    id: string,
    patch: Partial<Pick<PersonalExpense, 'amount' | 'currency' | 'category' | 'description' | 'date'>>
): Promise<PersonalExpense> {
    const { data, error } = await supabase
        .from('personal_expenses')
        .update({
            ...(patch.amount      !== undefined && { amount:      Math.round(patch.amount * 100) / 100 }),
            ...(patch.currency    !== undefined && { currency:    patch.currency }),
            ...(patch.category    !== undefined && { category:    patch.category }),
            ...(patch.description !== undefined && { description: patch.description }),
            ...(patch.date        !== undefined && { date:        patch.date }),
        })
        .eq('id', id)
        .select('id, user_id, amount, currency, category, description, date, timestamp, created_at')
        .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to update personal expense');
    return toPersonalExpense(data);
}

export async function deletePersonalExpense(id: string): Promise<void> {
    const { error } = await supabase.from('personal_expenses').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// ─── Converter ────────────────────────────────────────────────────────────────

function toPersonalExpense(row: Record<string, unknown>): PersonalExpense {
    return {
        id:          row.id as string,
        userId:      row.user_id as string,
        amount:      Number(row.amount),
        currency:    row.currency as string,
        category:    row.category as string | undefined,
        description: row.description as string | undefined,
        date:        row.date as string,
        timestamp:   row.timestamp as number,
        createdAt:   new Date(row.created_at as string).getTime(),
    };
}
