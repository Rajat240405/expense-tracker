/**
 * ProfileView.tsx
 *
 * Shows the current user's profile with editable name, read-only email,
 * change-password flow, sign-out, and a data management section
 * for full JSON backup export and import.
 */

import React, { useState, useEffect } from 'react';
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
import { DataSyncService } from '../../services/DataSyncService';

interface ProfileViewProps {
    /** Personal expenses from Workspace state, used for backup export. */
    expenses?: Expense[];
}

const ProfileView: React.FC<ProfileViewProps> = ({ expenses = [] }) => {
    const { user, signOut, isGuest } = useAuth();
    const {
        groups,
        groupExpenses,
        settlements,
    } = useGroups();

    // ── Display name ──────────────────────────────────────────────────────────
    const [displayName, setDisplayName] = useState('');
    const [nameLoading, setNameLoading] = useState(false);
    const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        if (!user) return;
        // Fetch current display_name from profiles
        supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data?.display_name) setDisplayName(data.display_name);
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
        setNameMsg(error
            ? { ok: false, text: error.message }
            : { ok: true, text: 'Name updated' }
        );
    };

    // ── Change password ───────────────────────────────────────────────────────
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setPwMsg({ ok: false, text: 'Password must be at least 6 characters' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwMsg({ ok: false, text: 'Passwords do not match' });
            return;
        }
        setPwLoading(true);
        setPwMsg(null);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setPwLoading(false);
        if (error) {
            setPwMsg({ ok: false, text: error.message });
        } else {
            setPwMsg({ ok: true, text: 'Password updated successfully' });
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    // ── Data Management ───────────────────────────────────────────────────────
    const [exportLoading, setExportLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const handleExport = () => {
        setExportLoading(true);
        try {
            exportFullBackup(expenses, groups, groupExpenses, settlements);
        } finally {
            setExportLoading(false);
        }
    };

    const handleImport = async () => {
        setImportMsg(null);
        setImportLoading(true);
        try {
            const jsonText = await pickJsonFile();
            const result = parseBackupFile(jsonText);

            if (!result.ok) {
                setImportMsg({ ok: false, text: result.message });
                return;
            }

            const { payload, stats } = result;

            // ── Merge personal expenses ──────────────────────────────────────
            if (payload.personalExpenses.length > 0) {
                const currentRaw = localStorage.getItem('expenses_v1');
                const current: Expense[] = currentRaw ? JSON.parse(currentRaw) : [];
                const merged = mergePersonalExpenses(current, payload.personalExpenses);
                localStorage.setItem('expenses_v1', JSON.stringify(merged));

                // If authenticated, push new items to Supabase too
                if (!isGuest && user) {
                    const existingIds = new Set(current.map((e) => e.id));
                    const newItems = payload.personalExpenses.filter((e) => !existingIds.has(e.id));
                    for (const exp of newItems) {
                        await DataSyncService.addExpense(exp, user.id);
                    }
                }
            }

            // ── Merge group data (guest localStorage only for now) ───────────
            if (payload.groups.length > 0) {
                const rawGroups = localStorage.getItem('groups_v1');
                const currentGroups = rawGroups ? JSON.parse(rawGroups) : [];
                localStorage.setItem('groups_v1', JSON.stringify(mergeGroups(currentGroups, payload.groups)));
            }
            if (payload.groupExpenses.length > 0) {
                const rawGE = localStorage.getItem('group_expenses_v1');
                const currentGE = rawGE ? JSON.parse(rawGE) : [];
                localStorage.setItem('group_expenses_v1', JSON.stringify(mergeById(currentGE, payload.groupExpenses)));
            }
            if (payload.settlements.length > 0) {
                const rawS = localStorage.getItem('group_settlements_v1');
                const currentS = rawS ? JSON.parse(rawS) : [];
                localStorage.setItem('group_settlements_v1', JSON.stringify(mergeById(currentS, payload.settlements)));
            }

            setImportMsg({
                ok: true,
                text: `Imported: ${stats.personalExpenses} expense${stats.personalExpenses !== 1 ? 's' : ''}, ` +
                    `${stats.groups} group${stats.groups !== 1 ? 's' : ''}, ` +
                    `${stats.groupExpenses} group expense${stats.groupExpenses !== 1 ? 's' : ''}. ` +
                    `Reload the app to see changes.`,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Import failed.';
            if (msg !== 'No file selected') {
                setImportMsg({ ok: false, text: msg });
            }
        } finally {
            setImportLoading(false);
        }
    };

    if (!user && !isGuest) {
        return (
            <div className="py-20 text-center text-gray-500 dark:text-gray-400">
                Not signed in.
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto space-y-8 pt-4">

            {/* Guest banner */}
            {isGuest && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-400">
                    You're in guest mode. Sign in to enable full cloud sync.
                </div>
            )}

            {/* Avatar + email — only show when signed in */}
            {user && (
                <>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 select-none">
                            {displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                                {displayName || 'No display name set'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* Edit display name */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                            Display Name
                        </h3>
                        <form onSubmit={handleSaveName} className="space-y-3">
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your name"
                                maxLength={50}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            {nameMsg && (
                                <p className={`text-xs font-medium ${nameMsg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                    {nameMsg.text}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={nameLoading || !displayName.trim()}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-lg transition-colors disabled:cursor-not-allowed"
                            >
                                {nameLoading ? 'Saving…' : 'Save Name'}
                            </button>
                        </form>
                    </section>

                    {/* Email — read only */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                            Email
                        </h3>
                        <input
                            type="email"
                            value={user.email ?? ''}
                            readOnly
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                            Email cannot be changed here.
                        </p>
                    </section>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* Change password */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                            Change Password
                        </h3>
                        <form onSubmit={handleChangePassword} className="space-y-3">
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New password (min 6 chars)"
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                autoComplete="new-password"
                            />
                            {pwMsg && (
                                <p className={`text-xs font-medium ${pwMsg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                    {pwMsg.text}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={pwLoading || !newPassword || !confirmPassword}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-lg transition-colors disabled:cursor-not-allowed"
                            >
                                {pwLoading ? 'Updating…' : 'Update Password'}
                            </button>
                        </form>
                    </section>

                    <hr className="border-gray-200 dark:border-gray-700" />
                </>
            )}

            {/* ── Data Management (visible to all — guest + signed-in) ───── */}
            <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                    Data &amp; Backup
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                    Export all your data as a JSON backup file, or restore from a previously saved backup.
                </p>

                <div className="space-y-3">
                    {/* Export */}
                    <button
                        onClick={handleExport}
                        disabled={exportLoading}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </span>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-blue-400">Export your data</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Download a full backup: {expenses.length} expense{expenses.length !== 1 ? 's' : ''}, {groups.length} group{groups.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </button>

                    {/* Import */}
                    <button
                        onClick={handleImport}
                        disabled={importLoading}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.10] hover:border-white/[0.18] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="w-9 h-9 rounded-lg bg-white/[0.07] flex items-center justify-center text-gray-400 flex-shrink-0">
                            {importLoading ? (
                                <span className="w-4 h-4 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                                </svg>
                            )}
                        </span>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-gray-200">Import from backup</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Restore from a previously exported JSON file
                            </p>
                        </div>
                    </button>

                    {importMsg && (
                        <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                            importMsg.ok
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                            {importMsg.text}
                        </div>
                    )}
                </div>
            </section>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Sign out — only for signed-in users */}
            {user && (
                <section>
                    <button
                        onClick={() => signOut()}
                        className="w-full py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        Sign Out
                    </button>
                </section>
            )}
        </div>
    );
};

export default ProfileView;
