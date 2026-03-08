import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import AuthModal from './AuthModal';
import { supabase } from '../lib/supabase';

interface LandingProps {
  onEnter: () => void;
}

// ─── Google Icon ──────────────────────────────────────────────────────────────

const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    const redirectTo = Capacitor.isNativePlatform()
      ? 'capacitor://localhost/auth/callback'
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      console.error('[Landing] Google sign-in error:', error.message);
    }
    // Always reset so the spinner doesn't stick if the user cancels,
    // closes the popup, or the redirect fails. On a successful redirect
    // the page navigates away before this line is reached anyway.
    setGoogleLoading(false);
  };

  return (
    <div className="bg-[#080c14] text-white overflow-x-hidden">

      {/* ── Ambient background glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] rounded-full bg-indigo-700/15 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full bg-blue-800/15 blur-[90px]" />
      </div>

      {/* ── Full-screen centred hero ── */}
      <main
        className="relative z-10 flex flex-col items-center justify-center px-6 text-center animate-fadeIn"
        style={{
          minHeight: '100dvh',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        }}
      >

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide mb-7 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Real-time sync across all devices
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-5 max-w-3xl">
          <span className="text-white">Know where your</span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
            money goes
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-base md:text-xl text-gray-400 mb-10 max-w-xl leading-relaxed">
          Track personal expenses, split bills with friends, and settle group debts — all in one place.
        </p>

        {/* CTA group — vertically centred, stacked on mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xs sm:max-w-none sm:justify-center">

          {/* Primary */}
          <button
            onClick={onEnter}
            className="
              group relative w-full sm:w-auto inline-flex items-center justify-center gap-2
              px-8 py-3.5 rounded-xl text-sm font-semibold text-white
              bg-gradient-to-r from-blue-600 to-blue-500
              shadow-[0_0_24px_rgba(37,130,235,0.35)]
              hover:shadow-[0_0_32px_rgba(37,130,235,0.55)]
              hover:-translate-y-0.5 active:translate-y-0
              transition-all duration-200
            "
          >
            Get Started
            <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="
              w-full sm:w-auto inline-flex items-center justify-center gap-3
              px-8 py-3.5 rounded-xl text-sm font-semibold
              bg-white text-gray-900
              border border-white/10
              shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {googleLoading ? (
              <span className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>
        </div>

        {/* Hint */}
        <p className="mt-5 text-xs text-gray-600">
          Free forever · No credit card required
        </p>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={onEnter}
      />
    </div>
  );
};

export default Landing;