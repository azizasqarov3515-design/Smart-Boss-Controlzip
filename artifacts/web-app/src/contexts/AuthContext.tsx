import { clearManagerSettings } from "../hooks/useSettings";
import { setAuthTokenGetter, setOnUnauthorized } from "@workspace/api-client-react";
import type { QueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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
  password?: string;
  subscriptionPlan?: string | null;
  subscriptionEnd?: string | null;
  subscriptionActive?: boolean;
  subscriptionDaysLeft?: number | null;
  subscriptionExpired?: boolean;
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
  password: string | null;
  subscriptionPlan: string | null;
  subscriptionEnd: Date | null;
  subscriptionActive: boolean;
  subscriptionDaysLeft: number | null;
  subscriptionExpired: boolean;
  blocked: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginCode: string, password: string) => Promise<void>;
  loginWithData: (data: ManagerLoginData) => Promise<void>;
  loginWorker: (phone: string, password: string) => Promise<{ status: string }>;
  logout: () => Promise<void>;
  downloadBackup: () => Promise<string>;
  refreshWorkerStatus: () => Promise<string | null>;
  refreshSubscription: () => Promise<void>;
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
  const [password, setPassword] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<Date | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(false);
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number | null>(null);
  const [subscriptionExpired, setSubscriptionExpired] = useState<boolean>(false);
  const [blocked, setBlocked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  const clearAll = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    localStorage.removeItem(WORKER_ID_KEY);
    localStorage.removeItem(MANAGER_ID_KEY);
    localStorage.removeItem(STORE_NAME_KEY);
    localStorage.removeItem(MANAGER_LOGIN_KEY);
    localStorage.removeItem(MANAGER_STORE_ID_KEY);
    localStorage.removeItem(MANAGER_PHONE_KEY);
    
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
    setPassword(null);
    setSubscriptionPlan(null);
    setSubscriptionEnd(null);
    setSubscriptionActive(false);
    setSubscriptionDaysLeft(null);
    setSubscriptionExpired(false);
    setBlocked(false);
  }, [queryClient]);

  function applySubscriptionData(data: {
    subscriptionPlan?: string | null;
    subscriptionEnd?: string | null;
    subscriptionActive?: boolean;
    subscriptionDaysLeft?: number | null;
    subscriptionExpired?: boolean;
  }) {
    setSubscriptionPlan(data.subscriptionPlan ?? null);
    setSubscriptionEnd(data.subscriptionEnd ? new Date(data.subscriptionEnd) : null);
    setSubscriptionActive(data.subscriptionActive ?? false);
    setSubscriptionDaysLeft(data.subscriptionDaysLeft ?? null);
    setSubscriptionExpired(data.subscriptionExpired ?? false);
  }

  // Set the auth token getter and unauthorized handler synchronously during render.
  // This prevents race conditions where child components make API requests immediately upon mounting
  // before the useEffect hook has registered the getters and handlers.
  setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
  setOnUnauthorized(clearAll);

  useEffect(() => {
    return () => {
      setAuthTokenGetter(null);
      setOnUnauthorized(null);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadToken() {
      try {
        const stored = localStorage.getItem(TOKEN_KEY);
        if (stored && !cancelled) {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${stored}` },
          });
          if (res.ok && !cancelled) {
            const data = await res.json();
            setToken(stored);
            const r = (data.role as UserRole) ?? "manager";
            setRole(r);
            setBlocked(data.blocked ?? false);
            if (r === "manager") {
              setUsername(data.username ?? data.name ?? "Rahbar");
              setManagerId(data.managerId ?? null);
              setStoreName(data.storeName ?? null);
              setManagerLogin(data.login ?? null);
              setManagerStoreId(data.storeId ?? null);
              setManagerPhone(data.phone ?? null);
              setPassword(data.password ?? null);
              applySubscriptionData(data);
            } else {
              setWorkerName(data.name ?? null);
              setWorkerId(data.workerId ?? null);
              setWorkerStatus(data.status ?? null);
              applySubscriptionData(data);
            }
          } else if (!cancelled) {
            clearAll();
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
  }, [clearAll]);

  const applyManagerData = useCallback((data: ManagerLoginData) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    if (data.managerId) localStorage.setItem(MANAGER_ID_KEY, String(data.managerId));
    if (data.storeName) localStorage.setItem(STORE_NAME_KEY, data.storeName);
    if (data.login) localStorage.setItem(MANAGER_LOGIN_KEY, data.login);
    if (data.storeId) localStorage.setItem(MANAGER_STORE_ID_KEY, data.storeId);
    if (data.phone) localStorage.setItem(MANAGER_PHONE_KEY, data.phone);
    setToken(data.token);
    setUsername(data.username ?? data.name ?? "Rahbar");
    setManagerId(data.managerId ?? null);
    setStoreName(data.storeName ?? null);
    setManagerLogin(data.login ?? null);
    setManagerStoreId(data.storeId ?? null);
    setManagerPhone(data.phone ?? null);
    setPassword(data.password ?? null);
    setRole("manager");
    setWorkerName(null);
    setWorkerId(null);
    setWorkerStatus(null);
    applySubscriptionData(data);
    queryClient?.clear();
  }, [queryClient]);

  const login = useCallback(async (loginCode: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginCode, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login amalga oshmadi");
    applyManagerData(data);
  }, [applyManagerData]);

  const loginWithData = useCallback(async (data: ManagerLoginData) => {
    applyManagerData(data);
  }, [applyManagerData]);

  const loginWorker = useCallback(async (phone: string, password: string): Promise<{ status: string }> => {
    const res = await fetch("/api/auth/worker-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Kirishda xato");

    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
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

  const refreshSubscription = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        applySubscriptionData(data);
        setBlocked(data.blocked ?? false);
      }
    } catch { /* ignore */ }
  }, [token]);

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    if (!token || role !== "worker") return;

    const sendHeartbeat = async (currentToken: string) => {
      try {
        await fetch("/api/auth/heartbeat", {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch { /* ignore */ }
    };

    sendHeartbeat(token);

    const interval = setInterval(async () => {
      const t = tokenRef.current;
      if (!t) return;
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      }).catch(() => null);
      if (!res) return;
      if (res.status === 401 || res.status === 404) {
        clearAll();
      } else if (res.ok) {
        const data = await res.json();
        setWorkerStatus(data.status ?? null);
        applySubscriptionData(data);
        await sendHeartbeat(t);
      }
    }, 30000);

    const handleVisibilityChange = () => {
      const t = tokenRef.current;
      if (!t) return;
      if (document.visibilityState === "visible") {
        sendHeartbeat(t);
      } else {
        fetch("/api/auth/heartbeat", {
          method: "POST",
          headers: { Authorization: `Bearer ${t}`, "X-Offline": "true" },
        }).catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token, role, clearAll]);

  const refreshWorkerStatus = useCallback(async (): Promise<string | null> => {
    if (!token) return null;
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const st = data.status ?? null;
        setWorkerStatus(st);
        return st;
      }
      if (res.status === 401 || res.status === 404) {
        clearAll();
      }
    } catch { /* ignore */ }
    return null;
  }, [token, clearAll]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch { /* ignore */ }
    clearAll();
  }, [token, clearAll]);

  const downloadBackup = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/backup/download", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Backup yuklab olishda xato");
    const data = await res.json();
    return JSON.stringify(data, null, 2);
  }, [token]);

  const deleteAccount = useCallback(async () => {
    if (!token) throw new Error("Tizimga kirmagan");
    const res = await fetch("/api/auth/manager-account", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Hisobni o'chirishda xato");
    if (managerId) clearManagerSettings(managerId);
    clearAll();
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
        password,
        subscriptionPlan,
        subscriptionEnd,
        subscriptionActive,
        subscriptionDaysLeft,
        subscriptionExpired,
        blocked,
        isAuthenticated: !!token,
        isLoading,
        login,
        loginWithData,
        loginWorker,
        logout,
        downloadBackup,
        refreshWorkerStatus,
        refreshSubscription,
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
export default useAuth;
