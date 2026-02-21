/**
 * JoinGroupPage.tsx
 *
 * Handles the /join/:token invite route.
 *
 * Flow:
 *  1. Page mounts with a token from the URL.
 *  2. Not authenticated → prompt sign-in, save token to sessionStorage so
 *     AuthCallbackPage re-routes here after auth completes.
 *  3. Authenticated → call redeemInvite() RPC, which atomically validates
 *     the token, checks expiry, and stamps used_at in one DB transaction.
 *  4. On success → add the user to the local GroupContext and navigate to /workspace.
 *  5. On any error → show a clear error UI.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../contexts/GroupContext';
import { redeemInvite, type InviteError } from '../lib/InviteService';
import AuthModal from '../components/AuthModal';

// ─── Error copy ───────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<InviteError, string> = {
    not_authenticated: 'You must be signed in to accept this invite.',
    invalid_token: 'This invite link is invalid or does not exist.',
    already_used: 'This invite link has already been used.',
    expired: 'This invite link has expired. Ask the group owner for a new one.',
    network_error: 'Could not reach the server. Check your connection and try again.',
};

// ─── Component ────────────────────────────────────────────────────────────────

type Status = 'loading' | 'prompt_auth' | 'joining' | 'error' | 'no_token';

const JoinGroupPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const { user, loading: authLoading } = useAuth();
    const { loadGroup } = useGroups();
    const navigate = useNavigate();

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [status, setStatus] = useState<Status>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    // ── Main effect: runs whenever auth resolves ──────────────────────────────
    useEffect(() => {
        if (authLoading) return;

        if (!token) {
            setStatus('no_token');
            return;
        }

        if (!user) {
            // Persist token so AuthCallbackPage can return here after sign-in
            sessionStorage.setItem('pending_invite_token', token);
            setStatus('prompt_auth');
            return;
        }

        // Authenticated — redeem the invite
        setStatus('joining');
        handleRedeem(token);
    }, [user, authLoading, token]);

    // ── Redeem logic ──────────────────────────────────────────────────────────
    const handleRedeem = async (token: string) => {
        const result = await redeemInvite(token);

        if (result.ok === false) {
            setStatus('error');
            setErrorMsg(ERROR_MESSAGES[result.error] ?? 'Something went wrong.');
            return;
        }

        const { groupId } = result;

        // Fetch the real group from Supabase and add it to local context.
        // (The RPC already inserted the user into group_members, so this
        //  fetch will now succeed and return the full group with members.)
        await loadGroup(groupId);

        // Navigate to the workspace, signalling which group to open
        navigate('/workspace', {
            replace: true,
            state: { openGroupId: groupId },
        });
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (authLoading || status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // ── Joining spinner ───────────────────────────────────────────────────────
    if (status === 'joining') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-900">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Joining group…</p>
            </div>
        );
    }

    // ── Error / invalid token ─────────────────────────────────────────────────
    if (status === 'error' || status === 'no_token') {
        const msg = status === 'no_token'
            ? 'Invalid invite link — no token found.'
            : errorMsg;

        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-900 px-6">
                <div className="text-5xl">⚠️</div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
                    Invite link problem
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">{msg}</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                >
                    Go to app
                </button>
            </div>
        );
    }

    // ── Prompt auth ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white dark:bg-gray-900 px-6">
            <div className="text-6xl">👥</div>

            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    You've been invited to a group
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                    Sign in or create an account to accept the invite and start splitting expenses together.
                </p>
            </div>

            <div className="w-full max-w-xs space-y-3">
                <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
                >
                    Sign in to continue
                </button>
                <button
                    onClick={() => navigate('/')}
                    className="w-full px-6 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    Continue as guest instead
                </button>
            </div>

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onSuccess={() => {
                    setIsAuthModalOpen(false);
                    // user state updates via AuthContext → useEffect re-runs → handleRedeem fires
                }}
            />
        </div>
    );
};

export default JoinGroupPage;
