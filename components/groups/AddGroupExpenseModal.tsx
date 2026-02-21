/**
 * AddGroupExpenseModal.tsx
 *
 * Modal to add an expense inside a group.
 * Supports Equal, Unequal, and Percentage split types.
 */

import React, { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Group, SplitType } from '../../types';
import { useGroups } from '../../contexts/GroupContext';
import { splitEqually, splitByPercentage, splitUnequally } from '../../lib/balanceEngine';
import { format, parse } from 'date-fns';

const CATEGORIES = [
    'Food', 'Transport', 'Accommodation', 'Entertainment',
    'Groceries', 'Utilities', 'Shopping', 'Other',
];

interface AddGroupExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
}

const AddGroupExpenseModal: React.FC<AddGroupExpenseModalProps> = ({ isOpen, onClose, group }) => {
    const { addGroupExpense } = useGroups();
    const [submitting, setSubmitting] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    // ── Basic fields ──────────────────────────────────────────────────────────
    const [description, setDescription] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paidByMemberId, setPaidByMemberId] = useState(
        group.members.find((m) => m.isYou)?.id ?? group.members[0]?.id ?? ''
    );

    // ── Split type ────────────────────────────────────────────────────────────
    const [splitType, setSplitType] = useState<SplitType>('equal');

    // ── Participant selection (for equal and percentage) ──────────────────────
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
        new Set(group.members.map((m) => m.id))
    );

    // ── Unequal amounts ───────────────────────────────────────────────────────
    const [unequalAmounts, setUnequalAmounts] = useState<Record<string, string>>(() =>
        Object.fromEntries(group.members.map((m) => [m.id, '']))
    );

    // ── Percentage amounts ────────────────────────────────────────────────────
    const [percentages, setPercentages] = useState<Record<string, string>>(() =>
        Object.fromEntries(group.members.map((m) => [m.id, '']))
    );

    // Reset selected members when group changes
    useEffect(() => {
        setSelectedMemberIds(new Set(group.members.map((m) => m.id)));
        setPaidByMemberId(group.members.find((m) => m.isYou)?.id ?? group.members[0]?.id ?? '');
        setUnequalAmounts(Object.fromEntries(group.members.map((m) => [m.id, ''])));
        setPercentages(Object.fromEntries(group.members.map((m) => [m.id, ''])));
    }, [group]);

    // ── Validation ────────────────────────────────────────────────────────────

    const total = Math.round((parseFloat(totalAmount) || 0) * 100) / 100;

    const unequalSum = useMemo(
        () =>
            group.members
                .filter((m) => selectedMemberIds.has(m.id))
                .reduce((sum, m) => sum + (parseFloat(unequalAmounts[m.id] || '0') || 0), 0),
        [unequalAmounts, selectedMemberIds, group.members]
    );

    const percentageSum = useMemo(
        () =>
            group.members
                .filter((m) => selectedMemberIds.has(m.id))
                .reduce((sum, m) => sum + (parseFloat(percentages[m.id] || '0') || 0), 0),
        [percentages, selectedMemberIds, group.members]
    );

    const validationError = useMemo(() => {
        if (!description.trim()) return 'Enter a description';
        if (total <= 0) return 'Enter a valid amount';
        if (selectedMemberIds.size === 0) return 'Select at least one participant';
        if (splitType === 'unequal' && Math.abs(unequalSum - total) > 0.01)
            return `Amounts must sum to ${total.toFixed(2)} (currently ${unequalSum.toFixed(2)})`;
        if (splitType === 'percentage' && Math.abs(percentageSum - 100) > 0.01)
            return `Percentages must sum to 100% (currently ${percentageSum.toFixed(1)}%)`;
        return null;
    }, [description, total, selectedMemberIds, splitType, unequalSum, percentageSum]);

    // ── Equal-split auto-fill helper ──────────────────────────────────────────
    const equalShareAmount = selectedMemberIds.size > 0
        ? (total / selectedMemberIds.size).toFixed(2)
        : '0.00';

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (validationError || total <= 0 || submitting) return;
            setSubmitting(true);

            const selectedIds: string[] = Array.from(selectedMemberIds) as string[];

            let participants;
            try {
                if (splitType === 'equal') {
                    participants = splitEqually(total, selectedIds);
                } else if (splitType === 'percentage') {
                    participants = splitByPercentage(
                        total,
                        selectedIds.map((id) => ({ memberId: id, percentage: parseFloat(percentages[id] || '0') }))
                    );
                } else {
                    participants = splitUnequally(
                        total,
                        selectedIds.map((id) => ({ memberId: id, amount: parseFloat(unequalAmounts[id] || '0') }))
                    );
                }
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Split error');
                return;
            }

            try {
                setErrorMsg(null);
                await addGroupExpense({
                    groupId: group.id,
                    description: description.trim(),
                    totalAmount: total,
                    currency: group.currency,
                    paidByMemberId,
                    splitType,
                    participants,
                    date,
                    category: category.trim() || undefined,
                });
                resetForm();
                onClose();
            } catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setSubmitting(false);
            }
        },
        [
            validationError, total, splitType, selectedMemberIds, submitting,
            percentages, unequalAmounts, description, paidByMemberId,
            date, category, group, addGroupExpense, onClose,
        ]
    );

    const resetForm = () => {
        setDescription('');
        setTotalAmount('');
        setCategory('');
        setDate(new Date().toISOString().split('T')[0]);
        setPaidByMemberId(group.members.find((m) => m.isYou)?.id ?? group.members[0]?.id ?? '');
        setSplitType('equal');
        setSelectedMemberIds(new Set(group.members.map((m) => m.id)));
        setUnequalAmounts(Object.fromEntries(group.members.map((m) => [m.id, ''])));
        setPercentages(Object.fromEntries(group.members.map((m) => [m.id, ''])));
        setErrorMsg(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const toggleMember = (id: string) => {
        setSelectedMemberIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const memberName = (id: string) => {
        const m = group.members.find((m) => m.id === id);
        return m ? (m.isYou ? 'You' : m.name) : id;
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={handleClose} className="relative z-50">
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
                </Transition.Child>

                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300" enterFrom="translate-y-full" enterTo="translate-y-0"
                    leave="ease-in duration-200" leaveFrom="translate-y-0" leaveTo="translate-y-full"
                >
                    <div className="fixed inset-x-0 bottom-0">
                        <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Add Expense
                                </Dialog.Title>
                                <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="e.g. Hotel, Dinner, Cab"
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {/* Amount */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Total Amount ({group.currency}) *
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={totalAmount}
                                        onChange={(e) => setTotalAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Who Paid */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Who paid?</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {group.members.map((member) => (
                                            <button
                                                key={member.id}
                                                type="button"
                                                onClick={() => setPaidByMemberId(member.id)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${paidByMemberId === member.id
                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                    }`}
                                            >
                                                {member.isYou ? 'You' : member.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Split Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Split Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['equal', 'unequal', 'percentage'] as SplitType[]).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setSplitType(type)}
                                                className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all capitalize ${splitType === type
                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                    }`}
                                            >
                                                {type === 'equal' ? '⚖️ Equal' : type === 'unequal' ? '✏️ Custom' : '% Percent'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Participants + split per-member inputs */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {splitType === 'equal' ? `Participants (each: ${group.currency} ${equalShareAmount})` : 'Participants'}
                                    </label>
                                    <div className="space-y-2">
                                        {group.members.map((member) => {
                                            const isSelected = selectedMemberIds.has(member.id);
                                            const label = member.isYou ? 'You' : member.name;

                                            return (
                                                <div
                                                    key={member.id}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${isSelected
                                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                                                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40'
                                                        }`}
                                                >
                                                    {/* Checkbox */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMember(member.id)}
                                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                                                            ? 'bg-blue-500 border-blue-500'
                                                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'
                                                            }`}
                                                        aria-label={`Toggle ${label}`}
                                                    >
                                                        {isSelected && (
                                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </button>

                                                    {/* Name */}
                                                    <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                                                        }`}>
                                                        {label}
                                                    </span>

                                                    {/* Per-member input for unequal/percentage */}
                                                    {isSelected && splitType === 'unequal' && (
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={unequalAmounts[member.id]}
                                                            onChange={(e) =>
                                                                setUnequalAmounts((prev) => ({ ...prev, [member.id]: e.target.value }))
                                                            }
                                                            placeholder="0.00"
                                                            className="w-24 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded-lg text-sm text-right text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    )}

                                                    {isSelected && splitType === 'percentage' && (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                max="100"
                                                                value={percentages[member.id]}
                                                                onChange={(e) =>
                                                                    setPercentages((prev) => ({ ...prev, [member.id]: e.target.value }))
                                                                }
                                                                placeholder="0"
                                                                className="w-20 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded-lg text-sm text-right text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                                                        </div>
                                                    )}

                                                    {/* Equal split preview */}
                                                    {isSelected && splitType === 'equal' && total > 0 && (
                                                        <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                                                            {equalShareAmount}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Validation hint */}
                                    {splitType === 'unequal' && total > 0 && (
                                        <p className={`mt-2 text-xs font-medium ${Math.abs(unequalSum - total) < 0.01
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-500 dark:text-red-400'
                                            }`}>
                                            Sum: {unequalSum.toFixed(2)} / {total.toFixed(2)}
                                        </p>
                                    )}
                                    {splitType === 'percentage' && (
                                        <p className={`mt-2 text-xs font-medium ${Math.abs(percentageSum - 100) < 0.01
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-500 dark:text-red-400'
                                            }`}>
                                            Total: {percentageSum.toFixed(1)}% / 100%
                                        </p>
                                    )}
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Category <span className="text-gray-400 text-xs">(optional)</span>
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setCategory(category === cat ? '' : cat)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${category === cat
                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Validation error */}
                                {validationError && total > 0 && (
                                    <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                                        {validationError}
                                    </p>
                                )}

                                {/* Supabase / network error */}
                                {errorMsg && (
                                    <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300 break-words">
                                        <span className="font-semibold">Error: </span>{errorMsg}
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={!!validationError}
                                    className="w-full px-4 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                                >
                                    Add Expense
                                </button>
                            </form>
                        </Dialog.Panel>
                    </div>
                </Transition.Child>
            </Dialog>
        </Transition>
    );
};

export default AddGroupExpenseModal;
