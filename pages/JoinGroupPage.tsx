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

import React, { useEffect, useRef, useState } from 'react';
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
    // Guard: don't call handleRedeem more than once (token refreshes re-emit user)
    const hasRedeemedRef = useRef(false);

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

        // Authenticated — redeem the invite (only once)
        if (hasRedeemedRef.current) return;
        hasRedeemedRef.current = true;
        setStatus('joining');
        handleRedeem(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, authLoading, token]);

    // ── Redeem logic ──────────────────────────────────────────────────────────
    const handleRedeem = async (token: string) => {
        const result = await redeemInvite(token);

        if (result.ok === false) {
            // 'already_used' means the user clicked/retried the link after the first
            // successful redeem. The group_members INSERT uses ON CONFLICT DO NOTHING
            // so they are a member regardless — navigate to workspace instead of erroring.
            if (result.error === 'already_used') {
                navigate('/workspace', { replace: true, state: { tab: 'groups' } });
                return;
            }
            setStatus('error');
            setErrorMsg(ERROR_MESSAGES[result.error] ?? 'Something went wrong.');
            return;
        }

        const { groupId } = result;

        // Best-effort: try to inject the group into local context immediately.
        await loadGroup(groupId);

        // Navigate to workspace with groups tab and the joined group pre-opened
        navigate('/workspace', {
            replace: true,
            state: { tab: 'groups', openGroupId: groupId },
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
                <div className="flex justify-center">
                    <svg className="w-14 h-14 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
                    Invite link problem
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">{msg}</p>
                <button
                    onClick={() => navigate('/workspace', { replace: true, state: { tab: 'groups' } })}
                    className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                >
                    Go to Groups
                </button>
            </div>
        );
    }

    // ── Prompt auth ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white dark:bg-gray-900 px-6">
            <div className="flex justify-center">
                <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            </div>

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
