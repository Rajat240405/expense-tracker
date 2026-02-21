/**
 * SettlementHistory.tsx
 *
 * Shows the log of all settlements in a group.
 */

import React from 'react';
import { Settlement, GroupMember } from '../../types';
import { getMemberName } from '../../lib/balanceEngine';
import { format, parse } from 'date-fns';

interface SettlementHistoryProps {
    settlements: Settlement[];
    members: GroupMember[];
    currency: string;
    onDelete?: (settlementId: string) => void;
}

const formatDate = (dateStr: string) => {
    try {
        return format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'dd MMM yyyy');
    } catch {
        return dateStr;
    }
};

const SettlementHistory: React.FC<SettlementHistoryProps> = ({
    settlements,
    members,
    currency,
    onDelete,
}) => {
    if (settlements.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Settlement History</h2>
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No settlements recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Settlement History</h2>
                <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                    {settlements.length}
                </span>
            </div>

            <div className="space-y-2">
                {settlements.map((s) => {
                    const fromName = getMemberName(members, s.fromMemberId);
                    const toName = getMemberName(members, s.toMemberId);

                    return (
                        <div
                            key={s.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-600"
                        >
                            {/* Icon */}
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    <span className="font-semibold">{fromName}</span>
                                    <span className="text-gray-500 dark:text-gray-400 mx-1">paid</span>
                                    <span className="font-semibold">{toName}</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-2 mt-0.5">
                                    <span>{formatDate(s.date)}</span>
                                    {s.note && <span>· {s.note}</span>}
                                </div>
                            </div>

                            {/* Amount + delete */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-sm font-bold font-mono text-green-600 dark:text-green-400">
                                    {s.currency} {s.amount.toFixed(2)}
                                </span>
                                {onDelete && (
                                    <button
                                        onClick={() => onDelete(s.id)}
                                        className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                        aria-label="Delete settlement"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SettlementHistory;
