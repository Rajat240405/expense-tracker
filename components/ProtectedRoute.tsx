/**
 * ProtectedRoute.tsx
 *
 * Wraps a route that requires authentication.
 * - While auth is loading: show a spinner so we don't flash the wrong screen.
 * - If user is a guest: redirect to "/".
 * - If user is authenticated: render children.
 *
 * NOTE: The current app allows guests to use the Workspace. If you want to
 * enforce hard authentication, change `allowGuest` to false. For now this
 * is a soft guard that mirrors the existing isGuest pattern.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    /** If true (default), guests can still access (matches current app behaviour). */
    allowGuest?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowGuest = true,
}) => {
    const { loading, user } = useAuth();

    // Show nothing while Supabase resolves the initial session.
    // This prevents a flash-of-landing-page for returning authenticated users.
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Strict mode: no user AND no guest allowed → redirect to landing
    if (!allowGuest && !user) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
