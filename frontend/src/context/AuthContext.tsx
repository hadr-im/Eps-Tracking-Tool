import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import {
  setTokenGetter,
  setSessionExpiredHandler,
  setTokenRefreshedHandler,
  apiClient,
} from '../services/apiClient';
import type { AuthTokens, AuthUser } from '../types/auth';


// Constants
const TOKEN_KEY = 'eps_access_token';


// Context shape

export interface AuthContextValue {
  // The currently authenticated user, or null if not logged in
  user: AuthUser | null;
  // The raw JWT access token, or null if not logged in
  accessToken: string | null;
  // Derived: true when both user and accessToken are present
  isAuthenticated: boolean;
  // True only during the initial localStorage restoration on page load
  isLoading: boolean;
  /*
    Store the tokens returned by a successful login or signup+login call
    Does NOT make any API call (the caller is responsible for that)
   */
  login(tokens: AuthTokens): void;
  // Merge a partial user update into the stored user (after profile edit)
  updateUser(patch: Partial<AuthUser>): void;
  // Revoke the refresh token server-side, clear local state, and redirect to /login
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// Provider

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref in sync with state so the apiClient interceptor always reads
  // the latest token without needing a re-render cycle
  const tokenRef = useRef<string | null>(null);

  // clearAuth 

  const clearAuth = useCallback((): void => {
    tokenRef.current = null;
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  // Register apiClient callbacks on mount (runs once)
  // These give the axios interceptor access to the current token and a way to
  // signal session expiry (without importing AuthContext into apiClient)

  useEffect(() => {
    setTokenGetter(() => tokenRef.current);

    setSessionExpiredHandler(() => {
      clearAuth();
      navigate('/login', { replace: true });
    });

    setTokenRefreshedHandler((newToken: string) => {
      tokenRef.current = newToken;
      setAccessToken(newToken);
      localStorage.setItem(TOKEN_KEY, newToken);
    });
  }, [clearAuth, navigate]);

  
  // Restore session on first page load by calling POST /auth/refresh
  //
  // The browser automatically sends the httpOnly refreshToken cookie
  // If the cookie is valid = we get a fresh accessToken and restore the user from the stored localStorage snapshot
  // If the cookie is absent or expired = clearAuth() and continue as guest
  //
  // isLoading stays true until this resolves so ProtectedRoute can show a spinner instead of flashing a redirect to /login

  useEffect(() => {
    async function tryRestoreSession(): Promise<void> {
      try {
        // Raw axios call — bypasses the apiClient interceptor to avoid a loop
        const { data } = await axios.post<{ accessToken: string }>(
          `${import.meta.env.VITE_API_BASE_URL as string}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = data.accessToken;
        const storedUser = localStorage.getItem(`${TOKEN_KEY}_user`);

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as AuthUser;
          tokenRef.current = newToken;
          setAccessToken(newToken);
          setUser(parsedUser);
          localStorage.setItem(TOKEN_KEY, newToken);
        } else {
          // Valid cookie but no user snapshot (treat as unauthenticated)
          clearAuth();
        }
      } catch {
        // No cookie, expired token or network error = not authenticated
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    }

    void tryRestoreSession();
  }, [clearAuth]);

  // Auth actions

  const login = useCallback((tokens: AuthTokens): void => {
    tokenRef.current = tokens.accessToken;
    setAccessToken(tokens.accessToken);
    setUser(tokens.user);
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(`${TOKEN_KEY}_user`, JSON.stringify(tokens.user));
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>): void => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem(`${TOKEN_KEY}_user`, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Revoke the refresh token server side (backend reads it from the httpOnly cookie)
      await apiClient.post('/auth/logout');
    } catch {
      // Silently ignore (local state is always cleared regardless)
    } finally {
      clearAuth();
      localStorage.removeItem(`${TOKEN_KEY}_user`);
      navigate('/login', { replace: true });
    }
  }, [clearAuth, navigate]);


  // Context value (memoised to prevent unnecessary re-renders downstream)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: !!accessToken && !!user,
      isLoading,
      login,
      updateUser,
      logout,
    }),
    [user, accessToken, isLoading, login, updateUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
