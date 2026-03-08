/**
 * DirectSplitsView.tsx
 *
 * 1-to-1 split sessions — available to both authenticated and guest users.
 *
 * Authenticated users: data synced to Supabase via directSplitService.
 * Guest users: data stored in localStorage via guestDirectSplitService.
 *
 * The correct backend is selected transparently by useDirectSplitService().
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDirectSplitService } from '../../lib/useDirectSplitService';
import { createDirectSplitByEmail } from '../../lib/directSplitService';
import { supabase } from '../../lib/supabase';
import { createNotification } from '../../lib/notificationService';
import type { DirectSplit, DirectExpense } from '../../types';

// Module-level cache — persists across tab switches so re-visiting splits is instant
const _splitsCache = new Map<string, DirectSplit[]>();

const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP'];
const TODAY = new Date().toISOString().slice(0, 10);

// ─── Create Split Modal ───────────────────────────────────────────────────────

interface CreateSplitModalProps {
    isGuest: boolean;
    onClose: () => void;
    onCreated: (split: DirectSplit) => void;
    svcCreate: (input: Pick<DirectSplit, 'userTwo' | 'label' | 'currency'>) => Promise<DirectSplit>;
}

const CreateSplitModal: React.FC<CreateSplitModalProps> = ({ isGuest, onClose, onCreated, svcCreate }) => {
    const [partnerName, setPartnerName] = useState('');  // always required
    const [partnerEmail, setPartnerEmail] = useState('');  // optional, auth users only
    const [nameLockedByLookup, setNameLocked] = useState(false); // true when name came from email lookup
    const [emailLookupStatus, setEmailLookupStatus] = useState<'idle' | 'looking' | 'found' | 'notfound'>('idle');
    const [label, setLabel] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const emailLookupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    // Debounced email → name lookup
    const handleEmailChange = (email: string) => {
        setPartnerEmail(email);
        setEmailLookupStatus('idle');
        if (nameLockedByLookup) {
            setNameLocked(false);
        }
        if (emailLookupRef.current) clearTimeout(emailLookupRef.current);
        const trimmed = email.trim();
        if (!trimmed || !trimmed.includes('@')) return;
        emailLookupRef.current = setTimeout(async () => {
            setEmailLookupStatus('looking');
            // Use a SECURITY DEFINER RPC so we can look up any registered user
            // by email regardless of RLS — works for Google sign-in and
            // email/password accounts alike.
            const { data: name, error } = await supabase
                .rpc('get_display_name_by_email', { p_email: trimmed.toLowerCase() });
            if (!error && name) {
                setPartnerName(name as string);
                setNameLocked(true);
                setEmailLookupStatus('found');
                return;
            }
            setEmailLookupStatus('notfound');
        }, 600);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partnerName.trim()) return;
        setLoading(true);
        setError('');
        try {
            let split: DirectSplit;
            const hasEmail = !isGuest && partnerEmail.trim().length > 0;
            if (hasEmail) {
                // Auth user with email → look up partner by email, sync to their account
                split = await createDirectSplitByEmail(
                    partnerEmail.trim(),
                    label.trim() || partnerName.trim() || undefined,
                    currency,
                );
                // Attach the resolved name so the card shows immediately
                split = { ...split, partnerName: partnerName.trim() };
            } else {
                // Guest OR auth without email → local name-only split
                split = await svcCreate({
                    userTwo: partnerName.trim(),
                    label: label.trim() || partnerName.trim(),
                    currency,
                });
            }
            onCreated(split);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create split');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-sm bg-[#111827] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 pb-10 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">New 1-to-1 Split</h2>
                    <button onClick={onClose} title="Close" className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Partner's name</label>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="e.g. Rahul"
                            value={partnerName}
                            onChange={(e) => { setPartnerName(e.target.value); setNameLocked(false); }}
                            required
                            disabled={nameLockedByLookup}
                            className={`w-full px-3 py-2.5 border rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors ${nameLockedByLookup
                                    ? 'bg-emerald-900/20 border-emerald-600/50 text-emerald-300 cursor-default'
                                    : 'bg-white/[0.06] border-white/10'
                                }`}
                        />
                        {nameLockedByLookup && (
                            <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                Name from their account
                                <button type="button" onClick={() => { setNameLocked(false); setPartnerName(''); }} className="ml-1 text-gray-500 hover:text-gray-300 underline">edit</button>
                            </p>
                        )}
                    </div>

                    {!isGuest && (
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                Email <span className="font-normal text-gray-500">(optional — syncs to their account)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="partner@example.com"
                                    value={partnerEmail}
                                    onChange={(e) => handleEmailChange(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-8"
                                />
                                {emailLookupStatus === 'looking' && (
                                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                )}
                                {emailLookupStatus === 'found' && (
                                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                )}
                                {emailLookupStatus === 'notfound' && (
                                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                )}
                            </div>
                            <p className="mt-1 text-[11px] text-gray-500">
                                {emailLookupStatus === 'found'
                                    ? '✓ Account found — split will sync to both accounts'
                                    : emailLookupStatus === 'notfound'
                                        ? 'No account found — split saved locally for you'
                                        : 'Leave blank for a local split — no account needed'}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Label (optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Goa trip, Rent"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Currency</label>
                        <div className="flex gap-2 flex-wrap">
                            {CURRENCIES.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCurrency(c)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currency === c
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.12]'
                                        }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/50 rounded-xl px-3 py-2">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !partnerName.trim()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                    >
                        {loading ? 'Creating…' : 'Create Split'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ─── Add Expense Modal ────────────────────────────────────────────────────────

interface AddExpenseModalProps {
    split: DirectSplit;
    currentUserId: string;
    isGuest: boolean;
    onClose: () => void;
    onAdded: (expense: DirectExpense) => void;
    addExpense: (input: Omit<DirectExpense, 'id' | 'createdAt' | 'settled'>) => Promise<DirectExpense>;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
    split, currentUserId, isGuest, onClose, onAdded, addExpense,
}) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidByMe, setPaidByMe] = useState(true);
    const [date, setDate] = useState(TODAY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const partnerLabel = isGuest
        ? (split.label ?? split.userTwo)
        : split.label ?? 'Partner';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
        setLoading(true);
        setError('');
        try {
            const expense = await addExpense({
                splitId: split.id,
                paidBy: paidByMe ? currentUserId : split.userTwo,
                amount: amt,
                description: description.trim() || undefined,
                date,
                timestamp: Date.now(),
            });
            onAdded(expense);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add expense');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-sm bg-[#111827] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Add Expense</h2>
                    <button onClick={onClose} title="Close" className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Amount ({split.currency})</label>
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            autoFocus
                            className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Description (optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Dinner, Taxi"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Who paid?</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPaidByMe(true)}
                                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${paidByMe ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.12]'}`}
                            >
                                I paid
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaidByMe(false)}
                                className={`py-2.5 rounded-xl text-sm font-medium transition-colors truncate ${!paidByMe ? 'bg-purple-600 text-white' : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.12]'}`}
                            >
                                {partnerLabel} paid
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Date</label>
                        <input
                            type="date"
                            title="Expense date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/50 rounded-xl px-3 py-2">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !amount}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                    >
                        {loading ? 'Adding…' : 'Add Expense'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ─── Main View ────────────────────────────────────────────────────────────────

const DirectSplitsView: React.FC = () => {
    const svc = useDirectSplitService();
    const [splits, setSplits] = useState<DirectSplit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const load = useCallback(async () => {
        const cacheKey = svc.currentUserId;
        // Show cached data instantly — no loading spinner on tab re-visit
        const cached = _splitsCache.get(cacheKey);
        if (cached) {
            setSplits(cached);
            setLoading(false);
        } else {
            setLoading(true);
        }
        setError(null);
        try {
            const data = await svc.fetchDirectSplits();
            _splitsCache.set(cacheKey, data);
            setSplits(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load splits');
        } finally {
            setLoading(false);
        }
    }, [svc]);

    useEffect(() => { void load(); }, [load]);

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Guest banner */}
            {svc.isGuest && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-800 dark:text-amber-300">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                        Browsing as guest. Splits are saved locally on this device.{' '}
                        <strong>Sign in</strong> to sync across devices.
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">1-to-1 Splits</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Track shared expenses between you and one other person
                    </p>
                </div>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    onClick={() => setShowCreate(true)}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New Split
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Empty state */}
            {splits.length === 0 && !error && (
                <div className="py-20 text-center">
                    <div className="flex justify-center mb-4">
                        <svg className="w-14 h-14 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No splits yet</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Start a split with a friend to track who owes what.
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first split
                    </button>
                </div>
            )}

            {/* Split list */}
            <div className="space-y-3">
                {splits.map((split) => (
                    <SplitCard
                        key={split.id}
                        split={split}
                        currentUserId={svc.currentUserId}
                        isGuest={svc.isGuest}
                        fetchExpenses={svc.fetchDirectExpenses}
                        addExpense={svc.addDirectExpense}
                        settleExpense={svc.settleDirectExpense}
                        deleteExpense={svc.deleteDirectExpense}
                        onDelete={() => {
                            // Optimistically remove from list and clear the cache
                            // so that calling load() doesn't briefly restore a stale
                            // version of this split from the module-level cache.
                            setSplits((prev) => prev.filter((s) => s.id !== split.id));
                            _splitsCache.delete(svc.currentUserId);
                            svc.deleteDirectSplit(split.id).catch((e: Error) => {
                                // Roll back if the remote delete failed
                                setError(e.message);
                                void load();
                            });
                        }}
                    />
                ))}
            </div>

            {/* Create Split Modal */}
            {showCreate && (
                <CreateSplitModal
                    isGuest={svc.isGuest}
                    onClose={() => setShowCreate(false)}
                    svcCreate={svc.createDirectSplit}
                    onCreated={(split) => {
                        setSplits((prev) => [split, ...prev]);
                        setShowCreate(false);
                    }}
                />
            )}
        </div>
    );
};

// ─── Split Card ───────────────────────────────────────────────────────────────

interface SplitCardProps {
    split: DirectSplit;
    currentUserId: string;
    isGuest: boolean;
    fetchExpenses: (splitId: string) => Promise<DirectExpense[]>;
    addExpense: (input: Omit<DirectExpense, 'id' | 'createdAt' | 'settled'>) => Promise<DirectExpense>;
    settleExpense: (id: string) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    onDelete: () => void;
}

const SplitCard: React.FC<SplitCardProps> = ({
    split, currentUserId, isGuest,
    fetchExpenses, addExpense, settleExpense, deleteExpense,
    onDelete,
}) => {
    const [expenses, setExpenses] = useState<DirectExpense[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [loadingExpenses, setLoadingExp] = useState(false);
    const [showAddExpense, setShowAddExp] = useState(false);
    const [actionError, setActionError] = useState('');
    const [undoToast, setUndoToast] = useState<{ exp: DirectExpense; timer: ReturnType<typeof setTimeout> } | null>(null);

    // For local/guest splits, userTwo IS the display name.
    // For DB splits, partnerName is resolved from profiles in the service layer.
    const partnerLabel = (isGuest || split.isLocal)
        ? (split.label ?? split.userTwo)
        : (split.partnerName ?? split.label ?? split.userTwo ?? 'Partner');

    const loadExpenses = async () => {
        if (expanded) { setExpanded(false); return; }
        setExpanded(true);
        setLoadingExp(true);
        try {
            const data = await fetchExpenses(split.id);
            setExpenses(data);
        } finally {
            setLoadingExp(false);
        }
    };

    const handleSettle = async (id: string) => {
        try {
            await settleExpense(id);
            setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, settled: true } : e));
            // Notify partner (DB splits only)
            if (!isGuest && !split.isLocal) {
                const partnerId = split.userOne === currentUserId ? split.userTwo : split.userOne;
                if (partnerId) {
                    createNotification({
                        userId: partnerId,
                        actorId: currentUserId,
                        type: 'settlement_completed',
                        entityId: split.id,
                        message: 'An expense was marked as settled',
                    }).catch(() => { });
                }
            }
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed');
        }
    };

    const handleSettleAll = async () => {
        const unsettled = expenses.filter((e) => !e.settled);
        for (const e of unsettled) {
            await handleSettle(e.id);
        }
    };

    const handleDeleteExpense = (id: string) => {
        const exp = expenses.find((e) => e.id === id);
        if (!exp) return;
        // Clear any existing undo toast first (commit its pending deletion)
        if (undoToast) {
            clearTimeout(undoToast.timer);
            deleteExpense(undoToast.exp.id).catch(() => { });
            setUndoToast(null);
        }
        // Optimistically remove from list
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        // Schedule real deletion after 4s
        const timer = setTimeout(() => {
            deleteExpense(id).catch(() => setActionError('Delete failed'));
            setUndoToast(null);
        }, 4000);
        setUndoToast({ exp, timer });
    };

    const handleUndoDelete = () => {
        if (!undoToast) return;
        clearTimeout(undoToast.timer);
        // Re-insert in original timestamp order
        setExpenses((prev) => {
            const without = prev.filter((e) => e.id !== undoToast.exp.id);
            const idx = without.findIndex((e) => e.timestamp < undoToast.exp.timestamp);
            if (idx === -1) return [...without, undoToast.exp];
            const copy = [...without];
            copy.splice(idx, 0, undoToast.exp);
            return copy;
        });
        setUndoToast(null);
    };

    // Clean up timer on unmount
    useEffect(() => () => { if (undoToast) clearTimeout(undoToast.timer); }, [undoToast]);

    // Realtime: subscribe to direct_expenses changes when card is expanded (DB splits only)
    // This syncs settle/add/delete from the partner's device in real time.
    useEffect(() => {
        if (!expanded || split.isLocal || isGuest) return;
        const channel = supabase
            .channel(`direct_expenses:${split.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'direct_expenses', filter: `split_id=eq.${split.id}` },
                async () => {
                    try {
                        const fresh = await fetchExpenses(split.id);
                        setExpenses(fresh);
                    } catch { /* ignore — stale state is acceptable */ }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded, split.id, split.isLocal, isGuest]);

    // Net balance from current user's perspective
    const net = expenses
        .filter((e) => !e.settled)
        .reduce((sum, e) => sum + (e.paidBy === currentUserId ? e.amount : -e.amount), 0);

    const hasUnsettled = expenses.some((e) => !e.settled);

    return (
        <>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
                <button
                    onClick={loadExpenses}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{partnerLabel}</p>
                            {split.isLocal && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-medium">local</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{split.label && split.label !== partnerLabel ? `${split.label} · ` : ''}{split.currency}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {expenses.length > 0 && hasUnsettled && (
                            <div className="text-right">
                                <p className={`text-[11px] font-medium leading-tight ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                    {net >= 0 ? `${partnerLabel} owes you` : `You owe ${partnerLabel}`}
                                </p>
                                <p className={`text-sm font-bold font-mono ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                    {split.currency} {Math.abs(net).toFixed(2)}
                                </p>
                            </div>
                        )}
                        {expenses.length > 0 && !hasUnsettled && (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">All settled</span>
                        )}
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </button>

                {expanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-3">
                        {loadingExpenses ? (
                            <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
                        ) : expenses.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No expenses yet — add one below</p>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                {expenses.map((exp) => (
                                    <li key={exp.id} className="flex items-center justify-between py-2.5 gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${exp.settled ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {exp.description || '—'}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                {exp.date}
                                                {exp.settled && <span className="ml-2 text-emerald-600 dark:text-emerald-400 no-underline font-medium">settled</span>}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <p className={`text-sm font-mono font-semibold ${exp.paidBy === currentUserId ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                                {split.currency} {exp.amount.toFixed(2)}
                                            </p>
                                            <p className={`text-[10px] font-medium ${exp.paidBy === currentUserId ? 'text-emerald-500 dark:text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {exp.paidBy === currentUserId ? 'You paid' : 'They paid'}
                                            </p>
                                        </div>
                                        {!exp.settled && (
                                            <button
                                                onClick={() => handleSettle(exp.id)}
                                                title="Mark settled"
                                                className="flex-shrink-0 p-1.5 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteExpense(exp.id)}
                                            title="Delete expense"
                                            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {actionError && (
                            <p className="text-xs text-red-400">{actionError}</p>
                        )}

                        {/* Undo delete toast */}
                        {undoToast && (
                            <div className="flex items-center justify-between px-3 py-2.5 bg-gray-800 dark:bg-gray-900 border border-gray-600 rounded-xl text-sm">
                                <span className="text-gray-300">
                                    <span className="line-through text-gray-500 mr-1">{undoToast.exp.description || 'Expense'}</span> deleted
                                </span>
                                <button
                                    onClick={handleUndoDelete}
                                    className="ml-3 flex-shrink-0 px-3 py-1 text-xs font-bold text-blue-400 hover:text-blue-300 border border-blue-500/50 rounded-lg transition-colors"
                                >
                                    Undo
                                </button>
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => setShowAddExp(true)}
                                className="flex-1 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                                + Add Expense
                            </button>
                            {hasUnsettled && (
                                <button
                                    onClick={handleSettleAll}
                                    className="flex-1 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                >
                                    ✓ Settle All
                                </button>
                            )}
                            <button
                                onClick={onDelete}
                                className="px-3 py-2 text-xs font-medium text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showAddExpense && (
                <AddExpenseModal
                    split={split}
                    currentUserId={currentUserId}
                    isGuest={isGuest}
                    onClose={() => setShowAddExp(false)}
                    addExpense={addExpense}
                    onAdded={(exp) => {
                        setExpenses((prev) => [exp, ...prev]);
                        setShowAddExp(false);
                    }}
                />
            )}
        </>
    );
};

export default DirectSplitsView;
