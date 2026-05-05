import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, createContext, useContext, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const BASE = "";

// ─── Auth context ─────────────────────────────────────────────────────────────
const AuthCtx = createContext<{
  token: string | null;
  login: (pwd: string) => Promise<void>;
  logout: () => void;
}>({ token: null, login: async () => {}, logout: () => {} });

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("admin_token"));
  const login = useCallback(async (password: string) => {
    const r = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const d = await r.json() as { token?: string; error?: string };
    if (!r.ok) throw new Error(d.error ?? "Parol noto'g'ri");
    localStorage.setItem("admin_token", d.token!);
    setToken(d.token!);
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem("admin_token");
    setToken(null);
  }, []);
  return <AuthCtx.Provider value={{ token, login, logout }}>{children}</AuthCtx.Provider>;
}
function useAdminAuth() { return useContext(AuthCtx); }

function authFetch(token: string, url: string, opts: RequestInit = {}) {
  return fetch(`${BASE}${url}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Manager {
  id: number;
  fullName: string;
  phone: string;
  storeName: string;
  storeAddress: string;
  storeId: string;
  login: string;
  password: string | null;
  subscriptionPlan: string | null;
  subscriptionPlanLabel: string;
  subscriptionEnd: string | null;
  subscriptionActive: boolean;
  subscriptionDaysLeft: number | null;
  createdAt: string;
  workerCount: number;
  salesCount: number;
}
interface AuditLog {
  id: number;
  managerId: number | null;
  action: string;
  details: string | null;
  createdAt: string;
  storeName: string | null;
  storeId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("uz-UZ", { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("uz-UZ", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function daysClass(days: number | null, active: boolean): string {
  if (!active || days === null) return "bg-red-950/60 text-red-400 border-red-900";
  if (days <= 0) return "bg-red-950/60 text-red-400 border-red-900";
  if (days <= 3) return "bg-orange-950/60 text-orange-400 border-orange-900";
  if (days <= 14) return "bg-yellow-950/60 text-yellow-400 border-yellow-900";
  return "bg-green-950/60 text-green-400 border-green-900";
}
function statusLabel(m: Manager): string {
  if (!m.subscriptionActive) return "Faol emas";
  if (m.subscriptionDaysLeft === null) return "Muddatsiz";
  if (m.subscriptionDaysLeft <= 0) return "Tugagan";
  return `${m.subscriptionDaysLeft} kun`;
}
function actionLabel(a: string): string {
  const map: Record<string, string> = {
    subscription_changed: "Obuna o'zgartirildi",
    temp_credentials_set: "Vaqt. kirish belgilandi",
    login_changed: "Login o'zgartirildi",
    password_changed: "Parol o'zgartirildi",
  };
  return map[a] ?? a;
}
function actionIcon(a: string): string {
  const map: Record<string, string> = {
    subscription_changed: "📅",
    temp_credentials_set: "🔑",
    login_changed: "👤",
    password_changed: "🔒",
  };
  return map[a] ?? "📝";
}

// ─── Bottom Sheet Modal ───────────────────────────────────────────────────────
function BottomSheet({ open, onClose, title, subtitle, children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        className="relative bg-card border border-card-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[92dvh] flex flex-col"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Drag handle on mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Subscription modal ────────────────────────────────────────────────────────
function SubscriptionModal({ manager, onClose }: { manager: Manager; onClose: () => void }) {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [plan, setPlan] = useState<string>(manager.subscriptionPlan ?? "1m");
  const [startFromNow, setStartFromNow] = useState(true);

  const mut = useMutation({
    mutationFn: async () => {
      const r = await authFetch(token!, `/api/admin/managers/${manager.id}/subscription`, {
        method: "PUT",
        body: JSON.stringify({ plan, active: true, startFromNow }),
      });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xato");
    },
    onSuccess: () => {
      toast({ title: "✅ Obuna yangilandi" });
      qc.invalidateQueries({ queryKey: ["managers"] });
      onClose();
    },
    onError: (e) => toast({ title: "Xato", description: (e as Error).message, variant: "destructive" }),
  });

  const deactivate = useMutation({
    mutationFn: async () => {
      const r = await authFetch(token!, `/api/admin/managers/${manager.id}/subscription`, { method: "DELETE" });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xato");
    },
    onSuccess: () => {
      toast({ title: "Obuna o'chirildi" });
      qc.invalidateQueries({ queryKey: ["managers"] });
      onClose();
    },
    onError: (e) => toast({ title: "Xato", description: (e as Error).message, variant: "destructive" }),
  });

  const plans = [
    { value: "1m", label: "1 oylik", days: 30, price: "1 oy" },
    { value: "3m", label: "3 oylik", days: 90, price: "3 oy" },
    { value: "6m", label: "6 oylik", days: 180, price: "6 oy" },
    { value: "1y", label: "1 yillik", days: 365, price: "1 yil" },
  ];

  return (
    <BottomSheet open title="Obunani boshqarish" subtitle={manager.storeName} onClose={onClose}>
      {manager.subscriptionEnd && (
        <div className={`border rounded-xl px-4 py-3 text-sm mb-5 ${daysClass(manager.subscriptionDaysLeft, manager.subscriptionActive)}`}>
          <p className="font-medium">Joriy obuna: {manager.subscriptionPlanLabel}</p>
          <p className="text-xs mt-1 opacity-80">Tugash: {fmtDate(manager.subscriptionEnd)} · {statusLabel(manager)}</p>
        </div>
      )}

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Yangi tarif tanlang</p>
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {plans.map(p => (
          <button
            key={p.value}
            onClick={() => setPlan(p.value)}
            className={`border rounded-2xl py-4 px-3 text-sm font-semibold transition active:scale-95 ${
              plan === p.value
                ? "bg-primary/15 border-primary text-primary"
                : "border-border text-muted-foreground active:bg-secondary"
            }`}
          >
            {p.label}
            <span className="block text-xs mt-1 font-normal opacity-70">{p.days} kun</span>
          </button>
        ))}
      </div>

      {manager.subscriptionActive && (manager.subscriptionDaysLeft ?? 0) > 0 && (
        <label className="flex items-start gap-3 text-sm text-muted-foreground mb-5 cursor-pointer select-none p-3 bg-secondary/50 rounded-xl border border-border">
          <input
            type="checkbox"
            checked={startFromNow}
            onChange={e => setStartFromNow(e.target.checked)}
            className="mt-0.5 rounded w-4 h-4 flex-shrink-0"
          />
          <span>Hozirgi sanadan hisoblash <span className="text-foreground">(o'chirilmasa, joriy muddatga qo'shiladi)</span></span>
        </label>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="flex-1 bg-primary hover:opacity-90 active:opacity-75 text-primary-foreground font-semibold py-3.5 rounded-xl text-sm transition disabled:opacity-50"
        >
          {mut.isPending ? "Saqlanmoqda…" : "✅ Faollashtirish"}
        </button>
        {manager.subscriptionActive && (
          <button
            onClick={() => { if (confirm("Obunani o'chirishni tasdiqlaysizmi?")) deactivate.mutate(); }}
            disabled={deactivate.isPending}
            className="px-4 border border-destructive/50 text-destructive hover:bg-destructive/10 active:bg-destructive/20 rounded-xl text-sm transition"
          >
            O'chirish
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

// ─── Credentials modal ─────────────────────────────────────────────────────────
function CredentialsModal({ manager, onClose }: { manager: Manager; onClose: () => void }) {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [login, setLogin] = useState(manager.login);
  const [password, setPassword] = useState("");

  function genLogin() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    setLogin(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
  }
  function genPassword() {
    setPassword(String(Math.floor(100000 + Math.random() * 900000)));
  }

  const mut = useMutation({
    mutationFn: async () => {
      const r = await authFetch(token!, `/api/admin/managers/${manager.id}/temp-credentials`, {
        method: "POST",
        body: JSON.stringify({ login, password }),
      });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xato");
    },
    onSuccess: () => {
      toast({ title: "🔑 Kirish ma'lumotlari yangilandi" });
      qc.invalidateQueries({ queryKey: ["managers"] });
      onClose();
    },
    onError: (e) => toast({ title: "Xato", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <BottomSheet open title="Kirish ma'lumotlari" subtitle={manager.storeName} onClose={onClose}>
      {manager.password && (
        <div className="bg-secondary/60 border border-border rounded-xl p-4 mb-5">
          <p className="text-xs text-muted-foreground font-medium mb-2.5">Joriy kirish</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background rounded-lg p-2.5">
              <p className="text-xs text-muted-foreground">Login</p>
              <p className="font-mono font-bold text-primary text-sm mt-0.5">{manager.login}</p>
            </div>
            <div className="bg-background rounded-lg p-2.5">
              <p className="text-xs text-muted-foreground">Parol</p>
              <p className="font-mono font-bold text-primary text-sm mt-0.5">{manager.password}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-5">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Login (8 ta katta harf/raqam)
          </label>
          <div className="flex gap-2">
            <input
              value={login}
              onChange={e => setLogin(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="AB123456"
              className="flex-1 bg-input border border-border rounded-xl px-4 py-3.5 text-foreground font-mono text-base focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ fontSize: "16px" }}
            />
            <button
              onClick={genLogin}
              className="w-12 bg-secondary border border-border rounded-xl flex items-center justify-center text-lg active:scale-95 transition"
            >
              🎲
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Parol (6 ta raqam)
          </label>
          <div className="flex gap-2">
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              maxLength={6}
              placeholder="123456"
              inputMode="numeric"
              className="flex-1 bg-input border border-border rounded-xl px-4 py-3.5 text-foreground font-mono text-base focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ fontSize: "16px" }}
            />
            <button
              onClick={genPassword}
              className="w-12 bg-secondary border border-border rounded-xl flex items-center justify-center text-lg active:scale-95 transition"
            >
              🎲
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending || login.length !== 8 || password.length !== 6}
        className="w-full bg-primary hover:opacity-90 active:opacity-75 text-primary-foreground font-semibold py-3.5 rounded-xl text-sm transition disabled:opacity-50"
      >
        {mut.isPending ? "Saqlanmoqda…" : "🔑 Saqlash"}
      </button>
    </BottomSheet>
  );
}

// ─── Manager card ─────────────────────────────────────────────────────────────
function ManagerCard({ m, onSub, onCred }: { m: Manager; onSub: () => void; onCred: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden active:scale-[0.99] transition-transform">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-base leading-tight">{m.storeName}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{m.fullName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{m.storeId}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${daysClass(m.subscriptionDaysLeft, m.subscriptionActive)}`}>
              {statusLabel(m)}
            </span>
            <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>📦 {m.salesCount}</span>
          <span>👥 {m.workerCount}</span>
          <span>📅 {fmtDate(m.subscriptionEnd)}</span>
          <span className="ml-auto text-xs font-medium text-foreground/70">{m.subscriptionPlanLabel}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">📞</span>
            <a href={`tel:${m.phone}`} className="text-primary font-medium">{m.phone}</a>
          </div>
          <div className="text-sm text-muted-foreground">
            <span>📍 </span>{m.storeAddress}
          </div>

          {m.password && (
            <div className="bg-secondary/50 border border-border rounded-xl p-3 grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Login</p>
                <p className="font-mono font-bold text-primary text-sm mt-0.5">{m.login}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Parol</p>
                <p className="font-mono font-bold text-primary text-sm mt-0.5">{m.password}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={e => { e.stopPropagation(); onSub(); }}
              className="flex items-center justify-center gap-1.5 text-sm bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 active:bg-primary/30 rounded-xl py-3 transition font-semibold"
            >
              📅 Obuna
            </button>
            <button
              onClick={e => { e.stopPropagation(); onCred(); }}
              className="flex items-center justify-center gap-1.5 text-sm bg-secondary border border-border text-muted-foreground hover:text-foreground active:bg-secondary/80 rounded-xl py-3 transition font-semibold"
            >
              🔑 Kirish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsRow({ managers }: { managers: Manager[] }) {
  const active = managers.filter(m => m.subscriptionActive && (m.subscriptionDaysLeft ?? 1) > 0).length;
  const expiring = managers.filter(m => m.subscriptionActive && m.subscriptionDaysLeft !== null && m.subscriptionDaysLeft <= 3 && m.subscriptionDaysLeft > 0).length;
  const expired = managers.filter(m => !m.subscriptionActive || (m.subscriptionDaysLeft !== null && m.subscriptionDaysLeft <= 0)).length;

  const stats = [
    { label: "Jami", value: managers.length, icon: "🏪", color: "text-blue-400" },
    { label: "Faol", value: active, icon: "✅", color: "text-green-400" },
    { label: "Tugayapti", value: expiring, icon: "⚠️", color: "text-orange-400" },
    { label: "O'tgan", value: expired, icon: "🔴", color: "text-red-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(s => (
        <div key={s.label} className="bg-card border border-card-border rounded-2xl p-3 flex flex-col items-center text-center">
          <span className="text-xl mb-1">{s.icon}</span>
          <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
          <span className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Audit log item ───────────────────────────────────────────────────────────
function LogItem({ log }: { log: AuditLog }) {
  return (
    <div className="bg-card border border-card-border rounded-2xl px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{actionIcon(log.action)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              {actionLabel(log.action)}
            </span>
          </div>
          {log.storeName && (
            <p className="text-sm font-medium text-foreground mt-1 truncate">{log.storeName}</p>
          )}
          {log.details && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{log.details}</p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1.5">{fmtDateTime(log.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────
function LoginPage() {
  const { login } = useAdminAuth();
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [, nav] = useLocation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(pwd);
      nav("/dashboard");
    } catch (er) {
      setErr((er as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center bg-background p-5"
      style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-4xl mx-auto mb-4">
            🛡️
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin nazoratchi</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Faqat dastur egasi uchun</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Admin parol</label>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="Parolni kiriting"
              className="w-full bg-input border border-border rounded-2xl px-4 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
              style={{ fontSize: "16px" }}
              autoFocus
              autoComplete="current-password"
              required
            />
          </div>
          {err && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
              ⚠️ {err}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:opacity-90 active:opacity-75 text-primary-foreground font-bold py-4 rounded-2xl transition disabled:opacity-50 text-base"
          >
            {loading ? "Kirilmoqda…" : "Kirish →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────
type TabType = "managers" | "logs";

function DashboardPage() {
  const { token, logout } = useAdminAuth();
  const [, nav] = useLocation();
  const [search, setSearch] = useState("");
  const [subModal, setSubModal] = useState<Manager | null>(null);
  const [credModal, setCredModal] = useState<Manager | null>(null);
  const [tab, setTab] = useState<TabType>("managers");
  const [filter, setFilter] = useState<"all" | "active" | "expiring" | "expired">("all");

  useEffect(() => {
    if (!token) nav("/login");
  }, [token, nav]);

  const { data: managers = [], isLoading, refetch, isFetching } = useQuery<Manager[]>({
    queryKey: ["managers"],
    queryFn: async () => {
      const r = await authFetch(token!, "/api/admin/managers");
      if (r.status === 401) { logout(); throw new Error("Sesiya tugagan"); }
      if (!r.ok) throw new Error("Ma'lumotlar yuklanmadi");
      return r.json() as Promise<Manager[]>;
    },
    enabled: !!token,
    refetchInterval: 60_000,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const r = await authFetch(token!, "/api/admin/audit-logs");
      if (!r.ok) throw new Error("Loglar yuklanmadi");
      return r.json() as Promise<AuditLog[]>;
    },
    enabled: !!token && tab === "logs",
  });

  const filtered = managers.filter(m => {
    const matchSearch = search === "" ||
      m.storeName.toLowerCase().includes(search.toLowerCase()) ||
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.storeId.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search);

    const matchFilter = filter === "all" ? true
      : filter === "active" ? (m.subscriptionActive && (m.subscriptionDaysLeft ?? 1) > 3)
      : filter === "expiring" ? (m.subscriptionActive && m.subscriptionDaysLeft !== null && m.subscriptionDaysLeft <= 3 && m.subscriptionDaysLeft > 0)
      : (!m.subscriptionActive || (m.subscriptionDaysLeft !== null && m.subscriptionDaysLeft <= 0));

    return matchSearch && matchFilter;
  });

  const filters: { value: typeof filter; label: string }[] = [
    { value: "all", label: "Barchasi" },
    { value: "active", label: "Faol" },
    { value: "expiring", label: "⚠️ Tugayapti" },
    { value: "expired", label: "🔴 O'tgan" },
  ];

  return (
    <div
      className="min-h-dvh bg-background flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Header */}
      <header className="bg-card border-b border-card-border px-4 py-3 flex items-center justify-between sticky top-0 z-20"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-base">🛡️</div>
          <div>
            <h1 className="font-bold text-foreground text-sm leading-tight">Admin nazoratchi</h1>
            <p className="text-xs text-muted-foreground leading-tight hidden sm:block">SMARTBOSScontrol</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className={`w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center text-sm transition ${isFetching ? "animate-spin opacity-50" : "active:scale-95"}`}
          >
            🔄
          </button>
          <button
            onClick={() => { if (confirm("Chiqishni tasdiqlaysizmi?")) logout(); }}
            className="text-xs text-muted-foreground hover:text-destructive active:text-destructive transition px-3 py-1.5 border border-border rounded-xl"
          >
            Chiqish
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-6 space-y-4">
          {/* Stats */}
          <StatsRow managers={managers} />

          {/* Tabs */}
          <div className="flex bg-secondary/50 border border-border rounded-2xl p-1 gap-1">
            {(["managers", "logs"] as TabType[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                  tab === t ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground active:text-foreground"
                }`}
              >
                {t === "managers" ? `🏪 Do'konlar` : "📋 Tarix"}
              </button>
            ))}
          </div>

          {tab === "managers" && (
            <>
              {/* Search */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base">🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Qidirish…"
                  className="w-full bg-input border border-border rounded-2xl pl-11 pr-4 py-3.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ fontSize: "16px" }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                  >✕</button>
                )}
              </div>

              {/* Filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                {filters.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`flex-shrink-0 text-xs font-semibold px-3.5 py-2 rounded-full border transition ${
                      filter === f.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary border-border text-muted-foreground active:bg-secondary/80"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* List */}
              {isLoading ? (
                <div className="flex flex-col gap-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-card border border-card-border rounded-2xl p-4 animate-pulse">
                      <div className="h-5 bg-secondary rounded-lg w-2/3 mb-2" />
                      <div className="h-3 bg-secondary rounded-lg w-1/2 mb-3" />
                      <div className="h-3 bg-secondary rounded-lg w-1/3" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-muted-foreground font-medium">Hech narsa topilmadi</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Boshqa kalit so'z bilan izlang</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filtered.map(m => (
                    <ManagerCard
                      key={m.id}
                      m={m}
                      onSub={() => setSubModal(m)}
                      onCred={() => setCredModal(m)}
                    />
                  ))}
                  <p className="text-center text-xs text-muted-foreground/60 py-2">{filtered.length} ta do'kon</p>
                </div>
              )}
            </>
          )}

          {tab === "logs" && (
            <>
              {logsLoading ? (
                <div className="flex flex-col gap-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-card border border-card-border rounded-2xl p-4 animate-pulse">
                      <div className="h-4 bg-secondary rounded-lg w-1/2 mb-2" />
                      <div className="h-3 bg-secondary rounded-lg w-2/3" />
                    </div>
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-muted-foreground font-medium">Hech qanday faoliyat yo'q</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {logs.map(log => <LogItem key={log.id} log={log} />)}
                  <p className="text-center text-xs text-muted-foreground/60 py-2">So'nggi {logs.length} ta yozuv</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {subModal && <SubscriptionModal manager={subModal} onClose={() => setSubModal(null)} />}
      {credModal && <CredentialsModal manager={credModal} onClose={() => setCredModal(null)} />}
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
function AppRouter() {
  const { token } = useAdminAuth();
  const [, nav] = useLocation();

  useEffect(() => {
    const path = window.location.pathname;
    const isLogin = path.includes("/login");
    if (token && isLogin) nav("/dashboard");
    if (!token && !isLogin) nav("/login");
  }, [token, nav]);

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/" component={() => { nav(token ? "/dashboard" : "/login"); return null; }} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
