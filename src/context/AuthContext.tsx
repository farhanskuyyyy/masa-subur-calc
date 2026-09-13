import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, type User } from '../lib/api';

export interface AuthSession {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  session: AuthSession | null;
  loading: boolean;
  isConfigured: boolean;
  isDemoUser: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data?: { user: User } }>;
  signOut: () => Promise<void>;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'luna_auth_token';
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

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(DEMO_USER_KEY));
  });

  // Check auth session on startup
  useEffect(() => {
    const initAuth = async () => {
      // If demo user is active, don't query remote backend
      const savedDemo = localStorage.getItem(DEMO_USER_KEY);
      if (savedDemo) {
        setLoading(false);
        return;
      }

      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe(storedToken);
        if (response?.user) {
          setUser(response.user);
          setToken(storedToken);
          setIsDemoUser(false);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err);
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const response = await authApi.login(email, password);
      if (response.token && response.user) {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.removeItem(DEMO_USER_KEY);
        setToken(response.token);
        setUser(response.user);
        setIsDemoUser(false);
        return { error: null };
      }
      return { error: new Error('Respon login tidak memiliki token atau user.') };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signUp = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null; data?: { user: User } }> => {
    try {
      const response = await authApi.register(email, password);
      if (response.token && response.user) {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.removeItem(DEMO_USER_KEY);
        setToken(response.token);
        setUser(response.user);
        setIsDemoUser(false);
        return { error: null, data: { user: response.user } };
      }
      return { error: new Error('Respon registrasi tidak lengkap.') };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DEMO_USER_KEY);
    setUser(null);
    setToken(null);
    setIsDemoUser(false);
  };

  const loginAsDemo = () => {
    const demoUser: User = {
      id: 'demo-user-12345',
      email: 'demo@luna-cycle.app',
      created_at: new Date().toISOString(),
      user_metadata: { name: 'Pengguna Demo' },
    };

    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    setToken('demo-token-mock');
    setIsDemoUser(true);
    setLoading(false);
  };

  const session: AuthSession | null =
    user && token ? { token, user } : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        session,
        loading,
        isConfigured: true,
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
