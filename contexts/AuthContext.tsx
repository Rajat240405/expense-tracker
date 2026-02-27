import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── 1. Restore existing session on mount ───────────────────────────────
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // ── 2. Subscribe to all future auth-state changes ──────────────────────
    //    This fires after setSession() / exchangeCodeForSession() below,
    //    so the UI updates automatically once the OAuth token is applied.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── 3. Native-only: handle Google OAuth deep-link callback ───────────────
  //
  //  Supabase v2 implicit flow returns tokens in the URL *fragment*:
  //    capacitor://localhost/auth/callback#access_token=...&refresh_token=...
  //
  //  We parse those manually and call setSession(), which triggers
  //  onAuthStateChange above → user state updates automatically.
  //
  //  Guarded by isNativePlatform() so web flow is completely untouched.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: { remove: () => Promise<void> } | null = null;

    (async () => {
      listenerHandle = await App.addListener('appUrlOpen', async ({ url }) => {
        try {
          // Only handle our OAuth callback URLs
          if (!url.includes('access_token') && !url.includes('code=')) return;

          // ── Implicit flow: tokens in fragment (#access_token=...&refresh_token=...) ──
          const fragment = url.split('#')[1] ?? '';
          const params = new URLSearchParams(fragment);
          const access_token  = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) console.error('[AuthContext] setSession error:', error.message);
            return;
          }

          // ── PKCE flow fallback: authorization code in query string (?code=...) ──
          if (url.includes('code=')) {
            const { error } = await supabase.auth.exchangeCodeForSession(url);
            if (error) console.error('[AuthContext] exchangeCodeForSession error:', error.message);
          }
        } catch (err) {
          console.error('[AuthContext] appUrlOpen handler error:', err);
        }
      });
    })();

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isGuest: !user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
