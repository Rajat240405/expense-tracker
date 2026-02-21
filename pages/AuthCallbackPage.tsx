/**
 * AuthCallbackPage.tsx
 *
 * Handles Supabase auth redirects (magic links, OAuth, invite emails).
 *
 * Supabase redirects to this page with an access token in the URL fragment:
 *   /auth/callback#access_token=...&refresh_token=...
 *
 * The Supabase JS client automatically picks up the token from the hash
 * via `onAuthStateChange`. All we need to do here is:
 *  1. Wait for the session to be resolved (loading=false in AuthContext).
 *  2. Redirect authenticated users to /app.
 *  3. Redirect failures back to / with an error flag.
 *
 * This also handles invite magic links that redirect here first, at which
 * point the auth session is set and then the join flow can proceed.
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallbackPage: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (loading) return; // Wait for Supabase to resolve the token

        // If there's a pending invite token, go to join flow after auth
        const pendingInvite = sessionStorage.getItem('pending_invite_token');

        if (user) {
            if (pendingInvite) {
                sessionStorage.removeItem('pending_invite_token');
                navigate(`/join/${pendingInvite}`, { replace: true });
            } else {
                navigate('/workspace', { replace: true });
            }
        } else {
            // Auth failed or token expired
            navigate('/?auth_error=1', { replace: true });
        }
    }, [user, loading, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-900">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Signing you in…</p>
        </div>
    );
};

export default AuthCallbackPage;
