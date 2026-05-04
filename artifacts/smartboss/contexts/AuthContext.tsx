import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter, setOnUnauthorized } from "@workspace/api-client-react";
import type { QueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const TOKEN_KEY = "smartboss_auth_token";
const ROLE_KEY = "smartboss_auth_role";
const USER_NAME_KEY = "smartboss_auth_name";
const WORKER_ID_KEY = "smartboss_auth_worker_id";

export type UserRole = "manager" | "worker";

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: UserRole | null;
  workerName: string | null;
  workerId: number | null;
  workerStatus: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWorker: (phone: string, password: string) => Promise<{ status: string }>;
  logout: () => Promise<void>;
  downloadBackup: () => Promise<string>;
  refreshWorkerStatus: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export function AuthProvider({ children, queryClient }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState<number | null>(null);
  const [workerStatus, setWorkerStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => token);
    return () => { setAuthTokenGetter(null); };
  }, [token]);

  useEffect(() => {
    setOnUnauthorized(() => {
      AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY, USER_NAME_KEY, WORKER_ID_KEY]);
      queryClient?.clear();
      setToken(null);
      setUsername(null);
      setRole(null);
      setWorkerName(null);
      setWorkerId(null);
      setWorkerStatus(null);
    });
    return () => { setOnUnauthorized(null); };
  }, [queryClient]);

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
            const data = (await res.json()) as {
              username?: string;
              name?: string;
              role?: string;
              workerId?: number;
              status?: string;
            };
            setToken(stored);
            const r = (data.role as UserRole) ?? "manager";
            setRole(r);
            if (r === "manager") {
              setUsername(data.username ?? "admin");
            } else {
              setWorkerName(data.name ?? null);
              setWorkerId(data.workerId ?? null);
              setWorkerStatus(data.status ?? null);
            }
          } else if (!cancelled) {
            await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY, USER_NAME_KEY, WORKER_ID_KEY]);
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
    if (!res.ok) throw new Error(data.error ?? "Login amalga oshmadi");
    await AsyncStorage.setItem(TOKEN_KEY, data.token!);
    setToken(data.token!);
    setUsername(data.username!);
    setRole("manager");
    setWorkerName(null);
    setWorkerId(null);
    setWorkerStatus(null);
    queryClient?.clear();
  }, [queryClient]);

  const loginWorker = useCallback(async (phone: string, password: string): Promise<{ status: string }> => {
    const res = await fetch(`${BASE_URL}/api/auth/worker-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const data = (await res.json()) as {
      token?: string;
      workerId?: number;
      name?: string;
      status?: string;
      role?: string;
      error?: string;
      code?: string;
    };
    if (!res.ok) throw new Error(data.error ?? "Kirishda xato");

    await AsyncStorage.setItem(TOKEN_KEY, data.token!);
    setToken(data.token!);
    setRole("worker");
    setWorkerName(data.name ?? null);
    setWorkerId(data.workerId ?? null);
    setWorkerStatus(data.status ?? "pending");
    setUsername(null);
    queryClient?.clear();
    return { status: data.status ?? "pending" };
  }, [queryClient]);

  const refreshWorkerStatus = useCallback(async (): Promise<string | null> => {
    if (!token) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { status?: string };
        const st = data.status ?? null;
        setWorkerStatus(st);
        return st;
      }
    } catch { /* ignore */ }
    return null;
  }, [token]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch { /* ignore */ }
    await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY, USER_NAME_KEY, WORKER_ID_KEY]);
    queryClient?.clear();
    setToken(null);
    setUsername(null);
    setRole(null);
    setWorkerName(null);
    setWorkerId(null);
    setWorkerStatus(null);
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
        role,
        workerName,
        workerId,
        workerStatus,
        isAuthenticated: !!token,
        isLoading,
        login,
        loginWorker,
        logout,
        downloadBackup,
        refreshWorkerStatus,
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
