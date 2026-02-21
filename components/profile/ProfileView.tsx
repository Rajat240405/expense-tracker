/**
 * ProfileView.tsx
 *
 * Shows the current user's profile with editable name, read-only email,
 * change-password flow, and sign-out.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const ProfileView: React.FC = () => {
    const { user, signOut } = useAuth();

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

    if (!user) {
        return (
            <div className="py-20 text-center text-gray-500 dark:text-gray-400">
                Not signed in.
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto space-y-8 pt-4">

            {/* Avatar + email */}
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

            {/* Sign out */}
            <section>
                <button
                    onClick={() => signOut()}
                    className="w-full py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                    Sign Out
                </button>
            </section>
        </div>
    );
};

export default ProfileView;
