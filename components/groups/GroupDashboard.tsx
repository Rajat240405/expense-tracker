/**
 * GroupDashboard.tsx
 *
 * The inside-group view: expense list + balance summary + settlement history.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

// ── Invite URL base ────────────────────────────────────────────────────────
// Priority: VITE_APP_URL env var → capacitor://localhost (native) → window.location.origin
function getAppBaseUrl(): string {
    const envUrl = import.meta.env.VITE_APP_URL as string | undefined;
    if (envUrl) return envUrl.replace(/\/$/, '');
    if (Capacitor.isNativePlatform()) return 'capacitor://localhost';
    return window.location.origin;
}
import { Group, GroupExpense } from '../../types';
import { useGroups } from '../../contexts/GroupContext';
import { useAuth } from '../../contexts/AuthContext';
import { createInvite } from '../../lib/InviteService';
import { getMemberName } from '../../lib/balanceEngine';
import AddGroupExpenseModal from './AddGroupExpenseModal';
import BalanceSummary from './BalanceSummary';
import SettlementHistory from './SettlementHistory';
import { format, parse } from 'date-fns';

const formatDate = (dateStr: string) => {
    try {
        return format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'dd MMM yyyy');
    } catch {
        return dateStr;
    }
};

type DashboardTab = 'expenses' | 'balances' | 'history';

interface GroupDashboardProps {
    groupId: string;
    onBack: () => void;
}

type InviteState = 'idle' | 'loading' | 'copied' | 'error';

const GroupDashboard: React.FC<GroupDashboardProps> = ({ groupId, onBack }) => {
    const { getGroup, getGroupExpenses, getGroupSettlements, undoableDeleteGroupExpense, deleteSettlement } = useGroups();
    const { user, loading: authLoading } = useAuth();
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<DashboardTab>('expenses');
    const [inviteState, setInviteState] = useState<InviteState>('idle');

    // ── Undo snackbar state ───────────────────────────────────────────────────
    const [snackbar, setSnackbar] = useState<{ label: string; undo: () => void } | null>(null);
    const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleDeleteExpense = useCallback((expenseId: string, description: string) => {
        // Cancel any existing snackbar
        if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);

        const { undo } = undoableDeleteGroupExpense(expenseId, 5000);

        setSnackbar({
            label: description ? `"${description}" deleted` : 'Expense deleted',
            undo: () => {
                undo();
                setSnackbar(null);
                if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
            },
        });

        snackbarTimerRef.current = setTimeout(() => {
            setSnackbar(null);
            snackbarTimerRef.current = null;
        }, 5000);
    }, [undoableDeleteGroupExpense]);

    const group = getGroup(groupId);
    const expenses = getGroupExpenses(groupId);
    const settlements = getGroupSettlements(groupId);

    // handleInvite must be declared before any conditional returns (hooks rule)
    const handleInvite = useCallback(async () => {
        if (inviteState === 'loading') return;
        setInviteState('loading');
        try {
            const result = await createInvite(group?.id ?? '');
            if ('error' in result) throw new Error(result.error);
            const url = `${getAppBaseUrl()}/join/${result.token}`;
            await navigator.clipboard.writeText(url);
            setInviteState('copied');
            setTimeout(() => setInviteState('idle'), 2000);
        } catch {
            setInviteState('error');
            setTimeout(() => setInviteState('idle'), 2500);
        }
    }, [group?.id, inviteState]);

    if (!group) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400">
                Group not found.
            </div>
        );
    }

    const totalSpent = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

    const tabs: { id: DashboardTab; label: string; count?: number }[] = [
        { id: 'expenses', label: 'Expenses', count: expenses.length },
        { id: 'balances', label: 'Balances' },
        { id: 'history', label: 'History', count: settlements.length },
    ];

    return (
        <div className="max-w-2xl mx-auto px-4 pb-32">

            {/* Header */}
            <div className="flex items-center gap-3 pt-6 pb-4">
                <button
                    onClick={onBack}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{group.name}</h1>
                    {group.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.description}</p>
                    )}
                </div>

                {/* Invite button — shown once auth state is known and user is signed in */}
                {!authLoading && user && (
                    <button
                        onClick={handleInvite}
                        disabled={inviteState === 'loading'}
                        title="Copy invite link"
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-colors shadow-sm border ${inviteState === 'copied'
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                            : inviteState === 'error'
                                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
                            }`}
                    >
                        {inviteState === 'loading' && (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                        )}
                        {inviteState === 'copied' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {inviteState === 'error' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                            </svg>
                        )}
                        {inviteState === 'idle' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        )}
                        <span className="hidden sm:inline">
                            {inviteState === 'copied' ? 'Copied!' : inviteState === 'error' ? 'Failed' : 'Invite'}
                        </span>
                    </button>
                )}

                <button
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add
                </button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Members</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{group.members.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">{group.currency} {totalSpent.toFixed(0)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{expenses.length}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.id
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'expenses' && (
                <ExpenseList
                    expenses={expenses}
                    group={group}
                    onDelete={handleDeleteExpense}
                />
            )}
            {activeTab === 'balances' && (
                <BalanceSummary
                    group={group}
                    expenses={expenses}
                    settlements={settlements}
                />
            )}
            {activeTab === 'history' && (
                <SettlementHistory
                    settlements={settlements}
                    members={group.members}
                    currency={group.currency}
                    onDelete={deleteSettlement}
                />
            )}

            {/* Add Expense Modal */}
            <AddGroupExpenseModal
                isOpen={isAddExpenseOpen}
                onClose={() => setIsAddExpenseOpen(false)}
                group={group}
            />

            {/* Undo Delete Snackbar */}
            {snackbar && (
                <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px)+12px)] left-1/2 -translate-x-1/2 z-50 animate-groupSnackbar">
                    <div className="bg-gray-900 border border-white/10 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 min-w-[280px] max-w-[90vw] overflow-hidden">
                        <span className="flex-1 text-sm font-medium truncate">{snackbar.label}</span>
                        <button
                            onClick={snackbar.undo}
                            className="text-blue-400 hover:text-blue-300 font-semibold text-sm uppercase tracking-wide transition-colors shrink-0"
                        >
                            Undo
                        </button>
                        <span className="absolute bottom-0 left-0 h-[3px] bg-blue-500 rounded-b-xl animate-snackbarCountdown" />
                    </div>
                </div>
            )}
            <style>{`
                @keyframes groupSnackbar {
                    from { opacity: 0; transform: translate(-50%, 16px); }
                    to   { opacity: 1; transform: translate(-50%, 0);    }
                }
                .animate-groupSnackbar {
                    animation: groupSnackbar 0.28s cubic-bezier(0.34,1.56,0.64,1);
                }
                @keyframes snackbarCountdown {
                    from { width: 100%; }
                    to   { width: 0%;   }
                }
                .animate-snackbarCountdown {
                    animation: snackbarCountdown 5s linear forwards;
                }
            `}</style>
        </div>
    );
};

// ─── Expense List Sub-component ───────────────────────────────────────────────

interface ExpenseListProps {
    expenses: GroupExpense[];
    group: Group;
    onDelete: (id: string, description: string) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, group, onDelete }) => {
    if (expenses.length === 0) {
        return (
            <div className="text-center py-16 text-gray-400">
                <div className="flex justify-center mb-3">
                    <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <p className="text-base font-medium text-gray-500 dark:text-gray-400">No expenses yet</p>
                <p className="text-sm mt-1">Tap "Add" to record the first expense.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {expenses.map((expense) => {
                const paidByName = getMemberName(group.members, expense.paidByMemberId);
                return (
                    <div
                        key={expense.id}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                    >
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{expense.description}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {paidByName} paid · {formatDate(expense.date)}
                                        </p>
                                        {expense.category && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
                                                {expense.category}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-base font-bold font-mono text-gray-900 dark:text-gray-100">
                                                {expense.currency} {expense.totalAmount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-400 capitalize">{expense.splitType}</p>
                                        </div>
                                        <button
                                            onClick={() => onDelete(expense.id, expense.description)}
                                            className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                                            aria-label="Delete expense"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Participant splits */}
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {expense.participants.map((p) => (
                                        <span key={p.memberId} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full font-mono">
                                            {getMemberName(group.members, p.memberId)}: {p.share.toFixed(2)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default GroupDashboard;
