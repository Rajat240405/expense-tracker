/**
 * CreateGroupModal.tsx
 *
 * Modal for creating a new group and adding its initial members.
 */

import React, { Fragment, useState, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useGroups } from '../../contexts/GroupContext';
import { GroupMember } from '../../types';

const CURRENCIES = [
    { code: 'INR', symbol: '₹', name: 'Rupees' },
    { code: 'USD', symbol: '$', name: 'Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'Pound' },
];

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (groupId: string) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onCreated }) => {
    const { createGroup } = useGroups();
    const [submitting, setSubmitting] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [memberInputs, setMemberInputs] = useState<string[]>(['']); // extra member names

    const resetForm = () => {
        setName('');
        setDescription('');
        setCurrency('INR');
        setMemberInputs(['']);
        setErrorMsg(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleAddMemberRow = () => {
        setMemberInputs((prev) => [...prev, '']);
    };

    const handleRemoveMemberRow = (index: number) => {
        setMemberInputs((prev) => prev.filter((_, i) => i !== index));
    };

    const handleMemberChange = (index: number, value: string) => {
        setMemberInputs((prev) => prev.map((v, i) => (i === index ? value : v)));
    };

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!name.trim() || submitting) return;
            setSubmitting(true);

            // Build member list: "You" is always first (isYou=true)
            const youMember: GroupMember = {
                id: crypto.randomUUID(),
                name: 'You',
                isYou: true,
            };

            const extraMembers: GroupMember[] = memberInputs
                .map((n) => n.trim())
                .filter(Boolean)
                .map((n) => ({
                    id: crypto.randomUUID(),
                    name: n,
                    isYou: false,
                }));

            try {
                setErrorMsg(null);
                const group = await createGroup({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    currency,
                    members: [youMember, ...extraMembers],
                });
                resetForm();
                onClose();
                onCreated?.(group.id);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                setErrorMsg(msg);
            } finally {
                setSubmitting(false);
            }
        },
        [name, description, currency, memberInputs, submitting, createGroup, onClose, onCreated]
    );

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={handleClose} className="relative z-50">
                {/* Backdrop */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
                </Transition.Child>

                {/* Bottom Sheet */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="translate-y-full"
                    enterTo="translate-y-0"
                    leave="ease-in duration-200"
                    leaveFrom="translate-y-0"
                    leaveTo="translate-y-full"
                >
                    <div className="fixed inset-x-0 bottom-0">
                        <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Create Group
                                </Dialog.Title>
                                <button
                                    onClick={handleClose}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                                {/* Group Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Group Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Goa Trip, Flat Expenses, Office Lunch"
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Description <span className="text-gray-400 text-xs">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="e.g. Weekend getaway with friends"
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Currency */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Default Currency
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {CURRENCIES.map((c) => (
                                            <button
                                                key={c.code}
                                                type="button"
                                                onClick={() => setCurrency(c.code)}
                                                className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${currency === c.code
                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                    }`}
                                            >
                                                {c.symbol} {c.code}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Members */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Members
                                    </label>

                                    {/* "You" row — always present and non-removable */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                                            <span className="text-blue-600 dark:text-blue-400 text-sm">👤</span>
                                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                                You (always included)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Extra member rows */}
                                    {memberInputs.map((val, idx) => (
                                        <div key={idx} className="flex items-center gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={val}
                                                onChange={(e) => handleMemberChange(idx, e.target.value)}
                                                placeholder={`Member ${idx + 2} name`}
                                                className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMemberRow(idx)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                aria-label="Remove member"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={handleAddMemberRow}
                                        className="mt-1 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Add another member
                                    </button>
                                </div>

                                {/* Error banner */}
                                {errorMsg && (
                                    <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300 break-words">
                                        <span className="font-semibold">Error: </span>{errorMsg}
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={!name.trim() || submitting}
                                    className="w-full px-4 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Creating…' : 'Create Group'}
                                </button>
                            </form>
                        </Dialog.Panel>
                    </div>
                </Transition.Child>
            </Dialog>
        </Transition>
    );
};

export default CreateGroupModal;
