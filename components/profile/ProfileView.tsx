/**
 * ProfileView.tsx — Premium profile page with stats, settings & data management.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGroups } from '../../contexts/GroupContext';
import { supabase } from '../../lib/supabase';
import type { Expense } from '../../types';
import {
    exportFullBackup,
    parseBackupFile,
    pickJsonFile,
    mergePersonalExpenses,
    mergeGroups,
    mergeById,
} from '../../lib/backupService';
import { exportPersonalExpensesAsCSV } from '../../lib/exportService';
import { DataSyncService } from '../../services/DataSyncService';

interface ProfileViewProps {
    expenses?: Expense[];
}

// ─── Reusable card wrapper ────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 ${className}`}>
        {children}
    </div>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
    <div className="flex items-center gap-3 mb-4">
        <span className="w-8 h-8 rounded-lg bg-white/[0.07] flex items-center justify-center text-blue-400 flex-shrink-0">
            {icon}
        </span>
        <div>
            <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
    </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</label>
        {children}
    </div>
);

const inputClass = "w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";
const inputDisabledClass = "w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-500 cursor-not-allowed";

const StatusMsg: React.FC<{ msg: { ok: boolean; text: string } | null }> = ({ msg }) =>
    msg ? (
        <p className={`text-xs font-medium ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
    ) : null;

const PrimaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...props }) => (
    <button
        {...props}
        className={`px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors ${className}`}
    >
        {children}
    </button>
);

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

// ─── Row-style action button ──────────────────────────────────────────────────
const ActionRow: React.FC<{
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    rowBg?: string;
    titleColor?: string;
}> = ({ icon, iconBg, iconColor, title, subtitle, onClick, disabled, loading, rowBg = 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-white/[0.15]', titleColor = 'text-gray-300' }) => (
    <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`w-full flex items-center gap-3 px-4 py-3.5 ${rowBg} border rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed group`}
    >
        <span className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center ${iconColor} flex-shrink-0 transition-colors`}>
            {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
            ) : icon}
        </span>
        <div className="text-left flex-1 min-w-0">
            <p className={`text-sm font-semibold ${titleColor}`}>{title}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
        </div>
        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
    </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ProfileView: React.FC<ProfileViewProps> = ({ expenses = [] }) => {
    const { user, signOut, isGuest } = useAuth();
    const { groups, groupExpenses, settlements } = useGroups();

    // ── Display name ─────────────────────────────────────────────────────────
    const [displayName, setDisplayName] = useState<string>(
        () =>
            (user?.user_metadata?.full_name as string | undefined) ??
            (user?.user_metadata?.name as string | undefined) ??
            ''
    );
    const [nameLoading, setNameLoading] = useState(false);
    const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data?.display_name) setDisplayName(data.display_name as string);
            });
    }, [user]);

    const handleSaveName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !displayName.trim()) return;
        setNameLoading(true);
        setNameMsg(null);
        const { error } = await supabase
            .from('profiles')
            .update({ display_name: displayName.trim(), name: displayName.trim() })
            .eq('id', user.id);
        setNameLoading(false);
        setNameMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Name updated ✓' });
    };

    // ── Change password ──────────────────────────────────────────────────────
    const isOAuthUser = !!(user?.app_metadata?.provider && user.app_metadata.provider !== 'email');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [showPwForm, setShowPwForm] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) { setPwMsg({ ok: false, text: 'Password must be at least 6 characters' }); return; }
        if (newPassword !== confirmPassword) { setPwMsg({ ok: false, text: 'Passwords do not match' }); return; }
        setPwLoading(true); setPwMsg(null);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setPwLoading(false);
        if (error) { setPwMsg({ ok: false, text: error.message }); }
        else { setPwMsg({ ok: true, text: 'Password updated ✓' }); setNewPassword(''); setConfirmPassword(''); setShowPwForm(false); }
    };

    // ── Delete account ───────────────────────────────────────────────────────
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteMsg, setDeleteMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            setDeleteMsg({ ok: false, text: 'Type DELETE to confirm' });
            return;
        }
        setDeleteLoading(true);
        setDeleteMsg(null);
        try {
            // Delete personal expenses from Supabase
            if (user) {
                await supabase.from('expenses').delete().eq('user_id', user.id);
            }
            // Call the Supabase admin delete user (needs service role) via RPC or just sign out
            // Since we can't call admin API from client, we delete data and sign out.
            // The account itself can be deleted via dashboard or with an edge function.
            // Clear all local storage
            localStorage.clear();
            // Sign out
            await signOut();
        } catch (err) {
            setDeleteLoading(false);
            setDeleteMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to delete account data.' });
        }
    };

    // ── Account stats ────────────────────────────────────────────────────────
    const memberSince = useMemo(() => {
        if (!user?.created_at) return '—';
        return new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, [user]);

    const thisMonthSpend = useMemo(() => {
        const now = new Date();
        const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + e.amount, 0);
    }, [expenses]);

    const dominantCurrency = useMemo(() => {
        const now = new Date();
        const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const counts: Record<string, number> = {};
        expenses.filter(e => e.date?.startsWith(key)).forEach(e => {
            const c = e.currency || 'INR'; counts[c] = (counts[c] || 0) + e.amount;
        });
        const entries = Object.entries(counts);
        return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : 'INR';
    }, [expenses]);

    const sym = ({ USD: '$', INR: '₹', EUR: '€', GBP: '£' } as Record<string, string>)[dominantCurrency] || dominantCurrency;

    // ── Data Management ──────────────────────────────────────────────────────
    const [exportJsonLoading, setExportJsonLoading] = useState(false);
    const [exportCsvLoading, setExportCsvLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const handleExportJson = async () => {
        setExportJsonLoading(true);
        try { await exportFullBackup(expenses, groups, groupExpenses, settlements); }
        catch (e) { console.error(e); }
        finally { setExportJsonLoading(false); }
    };

    const handleExportCsv = async () => {
        setExportCsvLoading(true);
        try { await exportPersonalExpensesAsCSV(expenses); }
        catch (e) { console.error(e); }
        finally { setExportCsvLoading(false); }
    };

    const handleImport = async () => {
        setImportMsg(null);
        setImportLoading(true);
        try {
            const jsonText = await pickJsonFile();
            const result = parseBackupFile(jsonText);
            if (!result.ok) { setImportMsg({ ok: false, text: result.message }); return; }
            const { payload, stats } = result;
            if (payload.personalExpenses.length > 0) {
                const currentRaw = localStorage.getItem('expenses_v1');
                const current: Expense[] = currentRaw ? JSON.parse(currentRaw) : [];
                const merged = mergePersonalExpenses(current, payload.personalExpenses);
                localStorage.setItem('expenses_v1', JSON.stringify(merged));
                if (!isGuest && user) {
                    const existingIds = new Set(current.map(e => e.id));
                    for (const exp of payload.personalExpenses.filter(e => !existingIds.has(e.id))) {
                        await DataSyncService.addExpense(exp, user.id);
                    }
                }
            }
            if (payload.groups.length > 0) {
                const raw = localStorage.getItem('groups_v1');
                localStorage.setItem('groups_v1', JSON.stringify(mergeGroups(raw ? JSON.parse(raw) : [], payload.groups)));
            }
            if (payload.groupExpenses.length > 0) {
                const raw = localStorage.getItem('group_expenses_v1');
                localStorage.setItem('group_expenses_v1', JSON.stringify(mergeById(raw ? JSON.parse(raw) : [], payload.groupExpenses)));
            }
            if (payload.settlements.length > 0) {
                const raw = localStorage.getItem('group_settlements_v1');
                localStorage.setItem('group_settlements_v1', JSON.stringify(mergeById(raw ? JSON.parse(raw) : [], payload.settlements)));
            }
            setImportMsg({
                ok: true,
                text: `Imported ${stats.personalExpenses} expense${stats.personalExpenses !== 1 ? 's' : ''}, ${stats.groups} group${stats.groups !== 1 ? 's' : ''}. Reload to see changes.`,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Import failed.';
            if (msg !== 'No file selected') setImportMsg({ ok: false, text: msg });
        } finally { setImportLoading(false); }
    };

    const initials = (displayName || user?.email || '?')[0]?.toUpperCase() ?? '?';

    return (
        <div className="max-w-lg mx-auto space-y-4 pt-2 pb-6">

            {/* Guest Banner */}
            {isGuest && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-amber-400">Guest Mode</p>
                        <p className="text-xs text-amber-400/70 mt-0.5">Sign in to unlock cloud sync, groups, and cross-device access.</p>
                    </div>
                </div>
            )}

            {/* Hero Header */}
            {user && (
                <Card>
                    <div className="flex flex-col items-center text-center py-3">
                        <div className="relative mb-4">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold select-none shadow-lg shadow-blue-500/30 overflow-hidden">
                                {isOAuthUser && user.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url as string} alt="Avatar" className="w-full h-full object-cover" />
                                ) : initials}
                            </div>
                            <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-[#080c14]" />
                        </div>
                        <h2 className="text-xl font-bold text-white">{displayName || 'No name set'}</h2>
                        <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
                        {isOAuthUser ? (
                            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.07] border border-white/[0.12] text-xs text-gray-300 font-medium">
                                <GoogleIcon size={13} /> Connected with Google
                            </span>
                        ) : (
                            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-medium">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Email Account
                            </span>
                        )}
                    </div>
                </Card>
            )}

            {/* Stats */}
            {user && (
                <Card>
                    <SectionHeader
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                        title="Your Stats"
                        subtitle="At a glance"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Total Expenses', value: expenses.length.toString(), color: 'text-blue-400' },
                            { label: 'Groups Joined', value: groups.length.toString(), color: 'text-indigo-400' },
                            { label: 'This Month', value: thisMonthSpend > 0 ? `${sym}${thisMonthSpend.toFixed(0)}` : '—', color: 'text-emerald-400' },
                            { label: 'Member Since', value: memberSince, color: 'text-purple-400' },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
                                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Edit Profile */}
            {user && (
                <Card>
                    <SectionHeader
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                        title="Edit Profile"
                    />
                    <form onSubmit={handleSaveName} className="space-y-4">
                        <Field label="Display Name">
                            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" maxLength={50} required className={inputClass} />
                        </Field>
                        <Field label="Email">
                            <div className="relative">
                                <input type="email" value={user.email ?? ''} readOnly className={inputDisabledClass} />
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </Field>
                        <div className="flex items-center gap-3">
                            <PrimaryBtn type="submit" disabled={nameLoading || !displayName.trim()}>
                                {nameLoading ? 'Saving…' : 'Save Changes'}
                            </PrimaryBtn>
                            <StatusMsg msg={nameMsg} />
                        </div>
                    </form>
                </Card>
            )}

            {/* Security */}
            {user && (
                <Card>
                    <SectionHeader
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                        title="Security"
                    />
                    {isOAuthUser ? (
                        <div className="flex items-center gap-3 p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                            <GoogleIcon size={18} />
                            <div>
                                <p className="text-sm font-medium text-gray-300">Signed in with Google</p>
                                <p className="text-xs text-gray-500 mt-0.5">Password management is handled by Google.</p>
                            </div>
                        </div>
                    ) : !showPwForm ? (
                        <button onClick={() => setShowPwForm(true)} className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition-colors group">
                            <div className="flex items-center gap-3">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                <span className="text-sm font-medium text-gray-300">Change Password</span>
                            </div>
                            <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ) : (
                        <form onSubmit={handleChangePassword} className="space-y-3">
                            <Field label="New Password">
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" required minLength={6} autoComplete="new-password" className={inputClass} />
                            </Field>
                            <Field label="Confirm Password">
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" required autoComplete="new-password" className={inputClass} />
                            </Field>
                            <StatusMsg msg={pwMsg} />
                            <div className="flex items-center gap-2 pt-1">
                                <PrimaryBtn type="submit" disabled={pwLoading || !newPassword || !confirmPassword}>{pwLoading ? 'Updating…' : 'Update Password'}</PrimaryBtn>
                                <button type="button" onClick={() => { setShowPwForm(false); setPwMsg(null); setNewPassword(''); setConfirmPassword(''); }} className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
                            </div>
                        </form>
                    )}
                </Card>
            )}

            {/* Data & Backup */}
            <Card>
                <SectionHeader
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>}
                    title="Data & Backup"
                    subtitle="Export or restore all your data"
                />
                <div className="space-y-2.5">
                    {/* Export JSON (full backup) */}
                    <ActionRow
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                        iconBg="bg-blue-500/15 group-hover:bg-blue-500/25"
                        iconColor="text-blue-400"
                        title="Export Full Backup (JSON)"
                        subtitle={`${expenses.length} expense${expenses.length !== 1 ? 's' : ''} · ${groups.length} group${groups.length !== 1 ? 's' : ''} · all data`}
                        onClick={handleExportJson}
                        loading={exportJsonLoading}
                        rowBg="bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 hover:border-blue-500/40"
                        titleColor="text-blue-400"
                    />

                    {/* Export CSV (personal expenses) */}
                    <ActionRow
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        iconBg="bg-emerald-500/15 group-hover:bg-emerald-500/25"
                        iconColor="text-emerald-400"
                        title="Export Expenses as CSV"
                        subtitle={`${expenses.length} personal expense${expenses.length !== 1 ? 's' : ''} · spreadsheet-friendly`}
                        onClick={handleExportCsv}
                        loading={exportCsvLoading}
                        rowBg="bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/40"
                        titleColor="text-emerald-400"
                    />

                    {/* Import */}
                    <ActionRow
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" /></svg>}
                        iconBg="bg-white/[0.06] group-hover:bg-white/[0.10]"
                        iconColor="text-gray-400"
                        title="Import from Backup"
                        subtitle="Restore from a JSON backup file"
                        onClick={handleImport}
                        loading={importLoading}
                    />

                    {importMsg && (
                        <div className={`p-3.5 rounded-xl text-xs leading-relaxed ${importMsg.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                            {importMsg.text}
                        </div>
                    )}
                </div>
            </Card>

            {/* Sign Out */}
            {user && (
                <Card>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </Card>
            )}

            {/* Delete Account */}
            {user && (
                <Card className="border-red-500/20">
                    <SectionHeader
                        icon={<svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                        title="Danger Zone"
                        subtitle="Permanent & irreversible actions"
                    />

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                <span className="text-sm font-medium text-red-400">Delete Account &amp; Data</span>
                            </div>
                            <svg className="w-4 h-4 text-red-500/60 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 leading-relaxed">
                                ⚠️ This will permanently delete all your expenses and sign you out. Your account data will be cleared. This <strong>cannot be undone</strong>.
                            </div>
                            <Field label='Type "DELETE" to confirm'>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={e => setDeleteConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className={inputClass}
                                    autoComplete="off"
                                />
                            </Field>
                            <StatusMsg msg={deleteMsg} />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
                                >
                                    {deleteLoading ? 'Deleting…' : 'Delete Everything'}
                                </button>
                                <button
                                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteMsg(null); }}
                                    className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            <p className="text-center text-xs text-gray-600 pt-2 pb-1 select-none">
                Expense Tracker · v1.0
            </p>
        </div>
    );
};

export default ProfileView;
