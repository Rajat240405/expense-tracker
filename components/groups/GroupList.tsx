/**
 * GroupList.tsx
 *
 * The top-level groups screen.
 * Shows all groups and lets the user create new ones.
 */

import React, { useState, useMemo } from 'react';
import { useGroups } from '../../contexts/GroupContext';
import { calculateNetBalances, simplifyDebts } from '../../lib/balanceEngine';
import CreateGroupModal from './CreateGroupModal';

interface GroupListProps {
    onSelectGroup: (groupId: string) => void;
}

const GroupList: React.FC<GroupListProps> = ({ onSelectGroup }) => {
    const { groups, groupExpenses, settlements, deleteGroup } = useGroups();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    return (
        <div className="max-w-2xl mx-auto px-4 pb-32">

            {/* Header */}
            <div className="flex items-center justify-between pt-6 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Groups</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {groups.length === 0 ? 'Create your first group to get started' : `${groups.length} group${groups.length !== 1 ? 's' : ''}`}
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Group
                </button>
            </div>

            {/* Empty state */}
            {groups.length === 0 && (
                <div className="text-center py-20 px-6">
                    <div className="text-5xl mb-4">👥</div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Groups Yet</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Create a group to split expenses with friends, roommates, or travel buddies.
                    </p>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create First Group
                    </button>
                </div>
            )}

            {/* Group cards */}
            <div className="space-y-3">
                {groups.map((group) => {
                    const groupExp = groupExpenses.filter((e) => e.groupId === group.id);
                    const groupSettlements = settlements.filter((s) => s.groupId === group.id);
                    const netBalances = calculateNetBalances(groupExp, groupSettlements, group.members);
                    const debtInstructions = simplifyDebts(netBalances);

                    const youMember = group.members.find((m) => m.isYou);
                    const yourBalance = youMember ? (netBalances[youMember.id] ?? 0) : 0;
                    const isSettled = debtInstructions.length === 0;
                    const totalSpent = groupExp.reduce((sum, e) => sum + e.totalAmount, 0);

                    return (
                        <div
                            key={group.id}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer active:scale-[0.99]"
                            onClick={() => onSelectGroup(group.id)}
                        >
                            <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-lg font-bold">
                                        {group.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {group.name}
                                            </h2>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {group.members.length} members · {group.currency} · {groupExp.length} expense{groupExp.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>

                                        {/* Your balance badge */}
                                        <div className={`flex-shrink-0 text-right`}>
                                            {isSettled ? (
                                                <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-lg">
                                                    Settled ✓
                                                </span>
                                            ) : yourBalance > 0.005 ? (
                                                <div>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">you get back</p>
                                                    <p className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">
                                                        +{yourBalance.toFixed(2)}
                                                    </p>
                                                </div>
                                            ) : yourBalance < -0.005 ? (
                                                <div>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">you owe</p>
                                                    <p className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">
                                                        {yourBalance.toFixed(2)}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-lg">
                                                    You're settled ✓
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Member avatars */}
                                    <div className="flex items-center gap-1 mt-2">
                                        {group.members.slice(0, 5).map((member) => (
                                            <div
                                                key={member.id}
                                                className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200 ring-2 ring-white dark:ring-gray-800"
                                                title={member.isYou ? 'You' : member.name}
                                            >
                                                {(member.isYou ? 'Y' : member.name.charAt(0)).toUpperCase()}
                                            </div>
                                        ))}
                                        {group.members.length > 5 && (
                                            <span className="text-xs text-gray-400 ml-1">+{group.members.length - 5}</span>
                                        )}
                                        {totalSpent > 0 && (
                                            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                Total: {group.currency} {totalSpent.toFixed(0)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pending debts preview */}
                            {debtInstructions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                        {debtInstructions.length} pending payment{debtInstructions.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            )}

                            {/* Delete button */}
                            <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                                {confirmDeleteId === group.id ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Delete group?</span>
                                        <button
                                            onClick={() => { deleteGroup(group.id); setConfirmDeleteId(null); }}
                                            className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                                        >
                                            Yes, delete
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteId(null)}
                                            className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setConfirmDeleteId(group.id)}
                                        className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <CreateGroupModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={onSelectGroup}
            />
        </div>
    );
};

export default GroupList;
