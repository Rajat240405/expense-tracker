/**
 * guestDirectSplitService.ts
 *
 * localStorage-backed 1-1 split service for unauthenticated (guest) users.
 * Mirrors the API surface of directSplitService.ts so callers can swap
 * transparently via useDirectSplitService().
 *
 * Guest user identity: the fixed string 'guest'.
 * The partner identity: whatever string is passed as `userTwo` (a display name).
 */

import type { DirectSplit, DirectExpense } from '../types';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const SPLITS_KEY   = 'guest_direct_splits_v1';
const EXPENSES_KEY = 'guest_direct_expenses_v1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadSplits(): DirectSplit[] {
    try {
        const raw = localStorage.getItem(SPLITS_KEY);
        return raw ? (JSON.parse(raw) as DirectSplit[]) : [];
    } catch {
        return [];
    }
}

function saveSplits(splits: DirectSplit[]): void {
    localStorage.setItem(SPLITS_KEY, JSON.stringify(splits));
}

function loadExpenses(): DirectExpense[] {
    try {
        const raw = localStorage.getItem(EXPENSES_KEY);
        return raw ? (JSON.parse(raw) as DirectExpense[]) : [];
    } catch {
        return [];
    }
}

function saveExpenses(expenses: DirectExpense[]): void {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

// ─── Direct Splits ────────────────────────────────────────────────────────────

export async function fetchDirectSplits(): Promise<DirectSplit[]> {
    return loadSplits().sort((a, b) => b.createdAt - a.createdAt);
}

export async function createDirectSplit(
    input: Pick<DirectSplit, 'userTwo' | 'label' | 'currency'>
): Promise<DirectSplit> {
    const split: DirectSplit = {
        id:        crypto.randomUUID(),
        userOne:   'guest',
        userTwo:   input.userTwo,
        label:     input.label,
        currency:  input.currency,
        createdAt: Date.now(),
    };
    const splits = loadSplits();
    saveSplits([split, ...splits]);
    return split;
}

export async function deleteDirectSplit(id: string): Promise<void> {
    saveSplits(loadSplits().filter((s) => s.id !== id));
    // Also remove expenses that belong to this split
    saveExpenses(loadExpenses().filter((e) => e.splitId !== id));
}

// ─── Direct Expenses ──────────────────────────────────────────────────────────

export async function fetchDirectExpenses(splitId: string): Promise<DirectExpense[]> {
    return loadExpenses()
        .filter((e) => e.splitId === splitId)
        .sort((a, b) => b.timestamp - a.timestamp);
}

export async function addDirectExpense(
    input: Omit<DirectExpense, 'id' | 'createdAt' | 'settled'>
): Promise<DirectExpense> {
    const expense: DirectExpense = {
        ...input,
        id:        crypto.randomUUID(),
        settled:   false,
        createdAt: Date.now(),
    };
    const expenses = loadExpenses();
    saveExpenses([expense, ...expenses]);
    return expense;
}

export async function settleDirectExpense(id: string): Promise<void> {
    saveExpenses(
        loadExpenses().map((e) => (e.id === id ? { ...e, settled: true } : e))
    );
}

export async function deleteDirectExpense(id: string): Promise<void> {
    saveExpenses(loadExpenses().filter((e) => e.id !== id));
}
