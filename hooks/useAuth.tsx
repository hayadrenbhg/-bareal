import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import {
  deleteOwnAccount as deleteOwnAccountService,
  fetchProfile,
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
} from '@/services/auth.service';
import type { SignInInput, SignUpInput } from '@/types/app';
import type { Profile } from '@/types/database';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<{ hasSession: boolean }>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 認証状態をアプリ全体で共有する Provider
 *
 * - Supabase Auth の onAuthStateChange でセッション変化を監視
 * - ログイン時に profiles テーブルからプロフィールを取得
 * - loading が true の間は Auth ガードがリダイレクトしない（ちらつき防止）
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const data = await fetchProfile(userId);
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        loadProfile(currentSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signUp = useCallback(async (input: SignUpInput) => {
    const data = await signUpService(input);
    return { hasSession: !!data.session };
  }, []);

  const signIn = useCallback(async (input: SignInInput) => {
    await signInService(input);
  }, []);

  const signOut = useCallback(async () => {
    await signOutService();
    setProfile(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteOwnAccountService();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id);
    }
  }, [user, loadProfile]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      deleteAccount,
      refreshProfile,
    }),
    [session, user, profile, loading, signUp, signIn, signOut, deleteAccount, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
