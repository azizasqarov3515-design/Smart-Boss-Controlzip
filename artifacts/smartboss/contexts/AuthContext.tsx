import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearManagerSettings } from "@/hooks/useSettings";
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
const MANAGER_ID_KEY = "smartboss_auth_manager_id";
const STORE_NAME_KEY = "smartboss_auth_store_name";
const MANAGER_LOGIN_KEY = "smartboss_auth_manager_login";
const MANAGER_STORE_ID_KEY = "smartboss_auth_manager_store_id";
const MANAGER_PHONE_KEY = "smartboss_auth_manager_phone";

export type UserRole = "manager" | "worker";

export interface ManagerLoginData {
  token: string;
  name?: string;
  username?: string;
  managerId?: number;
  storeName?: string;
  storeAddress?: string;
  login?: string;
  storeId?: string;
  phone?: string;
}

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: UserRole | null;
  workerName: string | null;
  workerId: number | null;
  workerStatus: string | null;
  managerId: number | null;
  storeName: string | null;
  managerLogin: string | null;
  managerStoreId: string | null;
  managerPhone: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginCode: string, password: string) => Promise<void>;
  loginWithData: (data: ManagerLoginData) => Promise<void>;
  loginWorker: (phone: string, password: string) => Promise<{ status: string }>;
  logout: () => Promise<void>;
  downloadBackup: () => Promise<string>;
  refreshWorkerStatus: () => Promise<string | null>;
  deleteAccount: () => Promise<void>;
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
  const [managerId, setManagerId] = useState<number | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [managerLogin, setManagerLogin] = useState<string | null>(null);
  const [managerStoreId, setManagerStoreId] = useState<string | null>(null);
  const [managerPhone, setManagerPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAll = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY, USER_NAME_KEY, WORKER_ID_KEY, MANAGER_ID_KEY, STORE_NAME_KEY, MANAGER_LOGIN_KEY, MANAGER_STORE_ID_KEY, MANAGER_PHONE_KEY]);
    queryClient?.clear();
    setToken(null);
    setUsername(null);
    setRole(null);
    setWorkerName(null);
    setWorkerId(null);
    setWorkerStatus(null);
    setManagerId(null);
    setStoreName(null);
    setManagerLogin(null);
    setManagerStoreId(null);
    setManagerPhone(null);
  }, [queryClient]);

  useEffect(() => {
    setAuthTokenGetter(() => token);
    return () => { setAuthTokenGetter(null); };
  }, [token]);

  useEffect(() => {
    setOnUnauthorized(() => { void clearAll(); });
    return () => { setOnUnauthorized(null); };
  }, [clearAll]);

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
              managerId?: number;
              storeName?: string;
              login?: string;
              storeId?: string;
              phone?: string;
            };
            setToken(stored);
            const r = (data.role as UserRole) ?? "manager";
            setRole(r);
            if (r === "manager") {
              setUsername(data.username ?? data.name ?? "Rahbar");
              setManagerId(data.managerId ?? null);
              setStoreName(data.storeName ?? null);
              setManagerLogin(data.login ?? null);
              setManagerStoreId(data.storeId ?? null);
              setManagerPhone(data.phone ?? null);
            } else {
              setWorkerName(data.name ?? null);
              setWorkerId(data.workerId ?? null);
              setWorkerStatus(data.status ?? null);
            }
          } else if (!cancelled) {
            await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY, USER_NAME_KEY, WORKER_ID_KEY, MANAGER_ID_KEY, STORE_NAME_KEY]);
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

  const applyManagerData = useCallback(async (data: ManagerLoginData) => {
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    if (data.managerId) await AsyncStorage.setItem(MANAGER_ID_KEY, String(data.managerId));
    if (data.storeName) await AsyncStorage.setItem(STORE_NAME_KEY, data.storeName);
    if (data.login) await AsyncStorage.setItem(MANAGER_LOGIN_KEY, data.login);
    if (data.storeId) await AsyncStorage.setItem(MANAGER_STORE_ID_KEY, data.storeId);
    if (data.phone) await AsyncStorage.setItem(MANAGER_PHONE_KEY, data.phone);
    setToken(data.token);
    setUsername(data.username ?? data.name ?? "Rahbar");
    setManagerId(data.managerId ?? null);
    setStoreName(data.storeName ?? null);
    setManagerLogin(data.login ?? null);
    setManagerStoreId(data.storeId ?? null);
    setManagerPhone(data.phone ?? null);
    setRole("manager");
    setWorkerName(null);
    setWorkerId(null);
    setWorkerStatus(null);
    queryClient?.clear();
  }, [queryClient]);

  const login = useCallback(async (loginCode: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginCode, password }),
    });
    const data = (await res.json()) as ManagerLoginData & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Login amalga oshmadi");
    await applyManagerData(data);
  }, [applyManagerData]);

  const loginWithData = useCallback(async (data: ManagerLoginData) => {
    await applyManagerData(data);
  }, [applyManagerData]);

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
    setManagerId(null);
    setStoreName(null);
    queryClient?.clear();
    return { status: data.status ?? "pending" };
  }, [queryClient]);

  useEffect(() => {
    if (!token || role !== "worker") return;
    const interval = setInterval(async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (!res) return;
      if (res.status === 401 || res.status === 404) {
        await clearAll();
      } else if (res.ok) {
        const data = (await res.json()) as { status?: string };
        setWorkerStatus(data.status ?? null);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [token, role, clearAll]);

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
      if (res.status === 401 || res.status === 404) {
        await clearAll();
      }
    } catch { /* ignore network errors */ }
    return null;
  }, [token, clearAll]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch { /* ignore */ }
    await clearAll();
  }, [token, clearAll]);

  const downloadBackup = useCallback(async (): Promise<string> => {
    const res = await fetch(`${BASE_URL}/api/backup/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Backup yuklab olishda xato");
    const data: unknown = await res.json();
    return JSON.stringify(data, null, 2);
  }, [token]);

  const deleteAccount = useCallback(async () => {
    if (!token) throw new Error("Tizimga kirmagan");
    const res = await fetch(`${BASE_URL}/api/auth/manager-account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Hisobni o'chirishda xato");
    if (managerId) await clearManagerSettings(managerId);
    await clearAll();
  }, [token, managerId, clearAll]);

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        role,
        workerName,
        workerId,
        workerStatus,
        managerId,
        storeName,
        managerLogin,
        managerStoreId,
        managerPhone,
        isAuthenticated: !!token,
        isLoading,
        login,
        loginWithData,
        loginWorker,
        logout,
        downloadBackup,
        refreshWorkerStatus,
        deleteAccount,
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
