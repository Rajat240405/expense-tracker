/**
 * BalanceSummary.tsx
 *
 * Displays who owes whom inside a group.
 * Calls balanceEngine pure functions for calculation.
 */

import React, { useMemo, useState } from 'react';
import { Group, GroupExpense, Settlement, DebtInstruction } from '../../types';
import { calculateNetBalances, simplifyDebts, getMemberName } from '../../lib/balanceEngine';
import { useGroups } from '../../contexts/GroupContext';

interface SettleUpFormProps {
    instruction: DebtInstruction;
    group: Group;
    onSettle: (amount: number, note: string) => void;
    onCancel: () => void;
}

const SettleUpForm: React.FC<SettleUpFormProps> = ({ instruction, group, onSettle, onCancel }) => {
    const [amount, setAmount] = useState(instruction.amount.toFixed(2));
    const [note, setNote] = useState('');

    return (
        <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl space-y-3">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Confirm Settlement</p>
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Amount ({group.currency})</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Note (optional)</label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Cash"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onSettle(parseFloat(amount), note)}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    Record Settlement
                </button>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface BalanceSummaryProps {
    group: Group;
    expenses: GroupExpense[];
    settlements: Settlement[];
}

const BalanceSummary: React.FC<BalanceSummaryProps> = ({ group, expenses, settlements }) => {
    const { addSettlement } = useGroups();
    const [activeSettleId, setActiveSettleId] = useState<string | null>(null);
    const [settling, setSettling] = useState(false);
    const [settleAllConfirm, setSettleAllConfirm] = useState(false);
    const [settleAllLoading, setSettleAllLoading] = useState(false);
    const [settleAllError, setSettleAllError] = useState<string | null>(null);
    const [settleAllDone, setSettleAllDone] = useState(false);

    const { netBalances, debtInstructions } = useMemo(() => {
        const netBalances = calculateNetBalances(expenses, settlements, group.members);
        const debtInstructions = simplifyDebts(netBalances);
        return { netBalances, debtInstructions };
    }, [expenses, settlements, group.members]);

    // Find "You" member id
    const youMember = group.members.find((m) => m.isYou);
    const yourBalance = youMember ? (netBalances[youMember.id] ?? 0) : 0;

    const handleSettle = async (instruction: DebtInstruction, amount: number, note: string) => {
        if (settling) return;
        setSettling(true);
        const today = new Date().toISOString().split('T')[0];
        try {
            await addSettlement({
                groupId: group.id,
                fromMemberId: instruction.fromMemberId,
                toMemberId: instruction.toMemberId,
                amount,
                currency: group.currency,
                note: note.trim() || undefined,
                date: today,
            });
        } catch {
            alert('Failed to record settlement. Please try again.');
        } finally {
            setSettling(false);
        }
        setActiveSettleId(null);
    };

    const handleSettleAll = async () => {
        if (settleAllLoading) return;
        setSettleAllLoading(true);
        setSettleAllError(null);
        setSettleAllDone(false);
        const today = new Date().toISOString().split('T')[0];
        try {
            // Sequential — stop immediately if any one settlement fails
            for (const instruction of debtInstructions) {
                await addSettlement({
                    groupId: group.id,
                    fromMemberId: instruction.fromMemberId,
                    toMemberId: instruction.toMemberId,
                    amount: instruction.amount,
                    currency: group.currency,
                    note: undefined,
                    date: today,
                });
            }
            setSettleAllDone(true);
            setSettleAllConfirm(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Settlement failed. Please try again.';
            setSettleAllError(message);
        } finally {
            setSettleAllLoading(false);
        }
    };

    const instructionKey = (i: DebtInstruction) => `${i.fromMemberId}->${i.toMemberId}`;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Balance Summary</h2>
            </div>

            {/* Your net balance pill */}
            {youMember && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${yourBalance > 0.005
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                    : yourBalance < -0.005
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                        : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
                    }`}>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your net balance</span>
                    <span className={`text-base font-bold font-mono ${yourBalance > 0.005
                        ? 'text-green-600 dark:text-green-400'
                        : yourBalance < -0.005
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                        {yourBalance > 0.005
                            ? `+${yourBalance.toFixed(2)}`
                            : yourBalance < -0.005
                                ? yourBalance.toFixed(2)
                                : 'Settled up ✓'}
                    </span>
                </div>
            )}

            {/* Settle All success banner */}
            {settleAllDone && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                    <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">All debts settled successfully!</span>
                    <button onClick={() => setSettleAllDone(false)} className="ml-auto text-green-500 hover:text-green-700 dark:hover:text-green-300 text-xs">
                        ✕
                    </button>
                </div>
            )}

            {/* Debt instructions */}
            {debtInstructions.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="text-3xl mb-2">✅</div>
                    All settled up!
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Settle All button + confirmation */}
                    {debtInstructions.length > 1 && !settleAllConfirm && (
                        <button
                            onClick={() => { setSettleAllError(null); setSettleAllConfirm(true); }}
                            className="w-full py-2.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-700 dark:hover:bg-gray-300 text-white dark:text-gray-900 text-sm font-semibold rounded-xl transition-colors"
                        >
                            Settle All ({debtInstructions.length} transactions)
                        </button>
                    )}

                    {settleAllConfirm && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl space-y-3">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                Settle all {debtInstructions.length} transactions?
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                This will record all simplified settlements at today's date with no notes.
                                Individual amounts cannot be edited in bulk mode.
                            </p>
                            {settleAllError && (
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                    ⚠ {settleAllError}
                                </p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSettleAll}
                                    disabled={settleAllLoading}
                                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {settleAllLoading && (
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {settleAllLoading ? 'Settling…' : 'Confirm Settle All'}
                                </button>
                                <button
                                    onClick={() => { setSettleAllConfirm(false); setSettleAllError(null); }}
                                    disabled={settleAllLoading}
                                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {debtInstructions.map((instruction) => {
                        const fromName = getMemberName(group.members, instruction.fromMemberId);
                        const toName = getMemberName(group.members, instruction.toMemberId);
                        const key = instructionKey(instruction);
                        const isYouFrom = instruction.fromMemberId === youMember?.id;
                        const isYouTo = instruction.toMemberId === youMember?.id;

                        return (
                            <div key={key}>
                                <div className={`flex items-center justify-between p-3 rounded-xl border ${isYouFrom
                                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                    : isYouTo
                                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                        : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600'
                                    }`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-sm font-semibold truncate ${isYouFrom ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {fromName}
                                        </span>
                                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                        <span className={`text-sm font-semibold truncate ${isYouTo ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {toName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        <span className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">
                                            {instruction.amount.toFixed(2)}
                                        </span>
                                        <button
                                            onClick={() => setActiveSettleId(activeSettleId === key ? null : key)}
                                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                                        >
                                            Settle
                                        </button>
                                    </div>
                                </div>

                                {/* Inline settle-up form */}
                                {activeSettleId === key && (
                                    <SettleUpForm
                                        instruction={instruction}
                                        group={group}
                                        onSettle={(amount, note) => handleSettle(instruction, amount, note)}
                                        onCancel={() => setActiveSettleId(null)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Per-member net balances (collapsed detail) */}
            <details className="group">
                <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none">
                    View individual balances ▸
                </summary>
                <div className="mt-2 space-y-1">
                    {group.members.map((member) => {
                        const bal = netBalances[member.id] ?? 0;
                        return (
                            <div key={member.id} className="flex justify-between text-xs px-2 py-1">
                                <span className="text-gray-700 dark:text-gray-300">
                                    {member.isYou ? 'You' : member.name}
                                </span>
                                <span className={`font-mono font-medium ${bal > 0.005 ? 'text-green-600 dark:text-green-400' :
                                    bal < -0.005 ? 'text-red-600 dark:text-red-400' :
                                        'text-gray-400'
                                    }`}>
                                    {bal > 0.005 ? '+' : ''}{bal.toFixed(2)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </details>
        </div>
    );
};

export default BalanceSummary;
