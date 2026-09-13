import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isDemoUser: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | Error | null; data: any }>;
  signOut: () => Promise<void>;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = 'luna_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedDemo = localStorage.getItem(DEMO_USER_KEY);
    if (savedDemo) {
      try {
        return JSON.parse(savedDemo);
      } catch {
        localStorage.removeItem(DEMO_USER_KEY);
      }
    }
    return null;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(() => {
    if (localStorage.getItem(DEMO_USER_KEY)) return false;
    return isSupabaseConfigured;
  });
  const [isDemoUser, setIsDemoUser] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(DEMO_USER_KEY));
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!localStorage.getItem(DEMO_USER_KEY)) {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsDemoUser(false);
        localStorage.removeItem(DEMO_USER_KEY);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error('Supabase belum dikonfigurasi. Silakan tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env atau gunakan akun Demo.')
      };
    }
    const result = await supabase.auth.signInWithPassword({ email, password });
    return { error: result.error };
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error('Supabase belum dikonfigurasi. Silakan atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env atau gunakan akun Demo.'),
        data: null
      };
    }
    const result = await supabase.auth.signUp({ email, password });
    return { error: result.error, data: result.data };
  };

  const signOut = async () => {
    if (isDemoUser) {
      localStorage.removeItem(DEMO_USER_KEY);
      setIsDemoUser(false);
      setUser(null);
      setSession(null);
      return;
    }
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const loginAsDemo = () => {
    const demoUser = {
      id: 'demo-user-12345',
      app_metadata: {},
      user_metadata: { name: 'Pengguna Demo' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'demo@luna-cycle.app',
    } as unknown as User;

    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    setIsDemoUser(true);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        isDemoUser,
        signIn,
        signUp,
        signOut,
        loginAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
