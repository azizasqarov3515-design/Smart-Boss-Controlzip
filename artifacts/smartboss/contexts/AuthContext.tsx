import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import type { QueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const TOKEN_KEY = "smartboss_auth_token";

interface AuthContextType {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  downloadBackup: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export function AuthProvider({ children, queryClient }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => token);
    return () => { setAuthTokenGetter(null); };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    async function loadToken() {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (stored && !cancelled) {
          const res = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${stored}` },
          });
          if (res.ok && !cancelled) {
            const data = (await res.json()) as { username: string };
            setToken(stored);
            setUsername(data.username);
          } else if (!cancelled) {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      } catch {
        // ignore network errors on startup
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadToken();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (usernameInput: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput, password }),
    });
    const data = (await res.json()) as { token?: string; username?: string; error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? "Login amalga oshmadi");
    }
    await AsyncStorage.setItem(TOKEN_KEY, data.token!);
    setToken(data.token!);
    setUsername(data.username!);
    queryClient?.clear();
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    queryClient?.clear();
    setToken(null);
    setUsername(null);
  }, [token, queryClient]);

  const downloadBackup = useCallback(async (): Promise<string> => {
    const res = await fetch(`${BASE_URL}/api/backup/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Backup yuklab olishda xato");
    const data: unknown = await res.json();
    return JSON.stringify(data, null, 2);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        downloadBackup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
