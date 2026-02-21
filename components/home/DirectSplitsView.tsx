/**
 * DirectSplitsView.tsx
 *
 * Scaffold for 1-to-1 split sessions (non-group).
 * Two users share a persistent split session and track who paid what.
 * Full implementation to follow; structure is production-ready.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as Svc from '../../lib/directSplitService';
import type { DirectSplit, DirectExpense } from '../../types';

const DirectSplitsView: React.FC = () => {
    const { user } = useAuth();
    const [splits, setSplits] = useState<DirectSplit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const data = await Svc.fetchDirectSplits();
            setSplits(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load splits');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { void load(); }, [load]);

    if (!user) {
        return (
            <div className="py-20 text-center text-gray-500 dark:text-gray-400">
                Sign in to use 1-to-1 splits.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="py-20 text-center text-gray-400 dark:text-gray-500 text-sm">
                Loading splits…
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">1-to-1 Splits</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Track shared expenses between you and one other person
                    </p>
                </div>
                {/* TODO: open CreateDirectSplitModal */}
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    onClick={() => alert('Create split — coming soon')}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New Split
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Empty state */}
            {splits.length === 0 && !error && (
                <div className="py-20 text-center">
                    <div className="text-5xl mb-4">🤝</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        No active splits
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Start a split session with a friend to track who owes what.
                    </p>
                </div>
            )}

            {/* Split list */}
            <div className="space-y-3">
                {splits.map((split) => (
                    <SplitCard
                        key={split.id}
                        split={split}
                        currentUserId={user.id}
                        onDelete={() => {
                            Svc.deleteDirectSplit(split.id)
                                .then(load)
                                .catch((e) => setError(e.message));
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

// ─── Split Card ───────────────────────────────────────────────────────────────

interface SplitCardProps {
    split: DirectSplit;
    currentUserId: string;
    onDelete: () => void;
}

const SplitCard: React.FC<SplitCardProps> = ({ split, currentUserId, onDelete }) => {
    const [expenses, setExpenses] = useState<DirectExpense[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [loadingExpenses, setLoadingExpenses] = useState(false);

    const partnerLabel = split.userOne === currentUserId ? split.userTwo : split.userOne;

    const loadExpenses = async () => {
        if (expanded) { setExpanded(false); return; }
        setExpanded(true);
        setLoadingExpenses(true);
        try {
            const data = await Svc.fetchDirectExpenses(split.id);
            setExpenses(data);
        } finally {
            setLoadingExpenses(false);
        }
    };

    // Net balance from current user's perspective (positive = owed to me, negative = I owe)
    const net = expenses
        .filter((e) => !e.settled)
        .reduce((sum, e) => sum + (e.paidBy === currentUserId ? e.amount : -e.amount), 0);

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
            <button
                onClick={loadExpenses}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
                <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {split.label || `Split with ${partnerLabel.slice(0, 8)}…`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{split.currency}</p>
                </div>
                <div className="flex items-center gap-3">
                    {expenses.length > 0 && (
                        <span className={`text-sm font-semibold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                            {net >= 0 ? '+' : ''}{net.toFixed(2)}
                        </span>
                    )}
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {expanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-3">
                    {loadingExpenses ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Loading…</p>
                    ) : expenses.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No expenses yet</p>
                    ) : (
                        expenses.map((exp) => (
                            <div key={exp.id} className="flex items-center justify-between text-sm">
                                <div>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{exp.description || '—'}</span>
                                    <span className="ml-2 text-gray-400 dark:text-gray-500 text-xs">{exp.date}</span>
                                    {exp.settled && <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">settled</span>}
                                </div>
                                <span className={`font-mono font-semibold ${exp.paidBy === currentUserId ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                    {exp.paidBy === currentUserId ? '+' : '-'}{exp.amount.toFixed(2)}
                                </span>
                            </div>
                        ))
                    )}
                    {/* TODO: Add expense button + settle up button */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => alert('Add expense — coming soon')}
                            className="flex-1 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            + Add Expense
                        </button>
                        <button
                            onClick={onDelete}
                            className="px-3 py-2 text-xs font-medium text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            Delete Split
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DirectSplitsView;
