import React, { useState } from 'react';
import AuthModal from './AuthModal';
import { supabase } from '../lib/supabase';

interface LandingProps {
  onEnter: () => void;
}

// ─── Feature card data ────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Personal Expenses',
    description: 'Log daily spending with categories, dates, and notes. See where every rupee goes.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Split with Friends',
    description: 'Create groups, add shared expenses, and auto-calculate who owes whom with simplified settlements.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Real-time Sync',
    description: 'Changes appear instantly across all devices and group members. No refresh needed.',
  },
];

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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Page will redirect; no need to reset loading state.
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#080c14] text-white overflow-x-hidden">

      {/* ── Ambient background glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] rounded-full bg-indigo-700/15 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full bg-blue-800/15 blur-[90px]" />
      </div>

      {/* ── Nav ── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto w-full">
        <span className="text-lg font-bold tracking-tight text-white">
          Expenses
        </span>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          Sign in
        </button>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-10 pb-24 animate-fadeIn">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide mb-8 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Real-time sync across all devices
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 max-w-3xl">
          <span className="text-white">Know where your</span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
            money goes
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-xl leading-relaxed">
          Track personal expenses, split bills with friends, and settle group debts — all in one place.
        </p>

        {/* CTA group */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm sm:max-w-none sm:justify-center">

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

      {/* ── Feature cards ── */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="
                group rounded-2xl p-6
                bg-white/[0.03] border border-white/[0.07]
                backdrop-blur-sm
                hover:bg-white/[0.06] hover:border-white/[0.12]
                transition-all duration-300
              "
            >
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-6 px-6 text-center">
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} Expenses. Built for clarity.
        </p>
      </footer>

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