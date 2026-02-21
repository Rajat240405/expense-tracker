/**
 * App.tsx
 *
 * Root entry point.
 * - BrowserRouter wraps everything for clean URL-based navigation.
 * - Providers are declared once here (AuthProvider → GroupProvider).
 * - Routes replace the old ViewState enum switch.
 *
 * Route map:
 *   /              → Landing page
 *   /workspace     → Workspace (protected; guests allowed by default)
 *   /join/:token   → Group invite accept flow
 *   /auth/callback → Supabase magic-link / OAuth redirect handler
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GroupProvider } from './contexts/GroupContext';
import Landing from './components/Landing';
import Workspace from './components/Workspace';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallbackPage from './pages/AuthCallbackPage';
import JoinGroupPage from './pages/JoinGroupPage';

// ─── Theme sync (unchanged from original) ────────────────────────────────────

function ThemeSync() {
  useEffect(() => {
    const checkTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    };
    checkTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', checkTheme);
    return () => mq.removeEventListener('change', checkTheme);
  }, []);
  return null;
}

// ─── Landing wrapper — bridges onEnter prop to router navigation ─────────────
// Landing.tsx stays completely unchanged; we just supply navigate() as onEnter.

function LandingRoute() {
  const navigate = useNavigate();
  return <Landing onEnter={() => navigate('/workspace')} />;
}

// ─── Workspace wrapper — bridges onBack prop ──────────────────────────────────
// Workspace.tsx stays completely unchanged.

function WorkspaceRoute() {
  const navigate = useNavigate();
  return <Workspace onBack={() => navigate('/')} />;
}

// ─── App ─────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GroupProvider>
          <ThemeSync />
          <div className="min-h-screen w-full bg-[#080c14] text-gray-100">
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingRoute />} />

              {/* Auth callback — Supabase redirects here after magic link / OAuth */}
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              {/* Invite link */}
              <Route path="/join/:token" element={<JoinGroupPage />} />

              {/* Protected workspace */}
              <Route
                path="/workspace"
                element={
                  <ProtectedRoute>
                    <WorkspaceRoute />
                  </ProtectedRoute>
                }
              />

              {/* Fallback — redirect unknown paths to landing */}
              <Route path="*" element={<LandingRoute />} />
            </Routes>
          </div>
        </GroupProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;