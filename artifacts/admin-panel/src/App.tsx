import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, createContext, useContext, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const BASE = "";

// ─── Auth context ────────────────────────────────────────────────────────────
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

// ─── API helpers ─────────────────────────────────────────────────────────────
function authFetch(token: string, url: string, opts: RequestInit = {}) {
  return fetch(`${BASE}${url}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("uz-UZ", { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("uz-UZ", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function daysClass(days: number | null, active: boolean): string {
  if (!active || days === null) return "bg-red-900/40 text-red-400 border-red-800";
  if (days <= 3) return "bg-orange-900/40 text-orange-400 border-orange-800";
  if (days <= 14) return "bg-yellow-900/40 text-yellow-400 border-yellow-800";
  return "bg-green-900/40 text-green-400 border-green-800";
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

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color = "text-blue-400" }: { label: string; value: React.ReactNode; icon: string; color?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex gap-4 items-start">
      <div className={`text-3xl ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛡️</div>
          <h1 className="text-2xl font-bold text-foreground">Admin nazoratchi</h1>
          <p className="text-sm text-muted-foreground mt-1">Faqat dastur egasi uchun</p>
        </div>
        <form onSubmit={submit} className="bg-card border border-card-border rounded-2xl p-8 space-y-5 shadow-xl">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Admin parol</label>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              autoFocus
              required
            />
          </div>
          {err && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Kirilmoqda…" : "Kirish"}
          </button>
        </form>
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
      return d;
    },
    onSuccess: () => {
      toast({ title: "Obuna yangilandi" });
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
    { value: "1m", label: "1 oylik", days: 30 },
    { value: "3m", label: "3 oylik", days: 90 },
    { value: "6m", label: "6 oylik", days: 180 },
    { value: "1y", label: "1 yillik", days: 365 },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Obunani boshqarish</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{manager.storeName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>

        {manager.subscriptionEnd && (
          <div className={`border rounded-lg px-3 py-2 text-sm mb-4 ${daysClass(manager.subscriptionDaysLeft, manager.subscriptionActive)}`}>
            Joriy obuna: {manager.subscriptionPlanLabel} — {fmtDate(manager.subscriptionEnd)} ({statusLabel(manager)})
          </div>
        )}

        <div className="space-y-3 mb-4">
          <label className="block text-sm font-medium text-muted-foreground">Yangi obuna tarifi</label>
          <div className="grid grid-cols-2 gap-2">
            {plans.map(p => (
              <button
                key={p.value}
                onClick={() => setPlan(p.value)}
                className={`border rounded-xl py-3 px-3 text-sm font-medium transition ${plan === p.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {p.label}
                <span className="block text-xs mt-0.5 opacity-70">{p.days} kun</span>
              </button>
            ))}
          </div>
        </div>

        {manager.subscriptionActive && manager.subscriptionDaysLeft !== null && manager.subscriptionDaysLeft > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-4 cursor-pointer">
            <input type="checkbox" checked={startFromNow} onChange={e => setStartFromNow(e.target.checked)} className="rounded" />
            Hozirdan hisoblash (aks holda joriy muddatga qo'shiladi)
          </label>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="flex-1 bg-primary hover:opacity-90 text-primary-foreground font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50"
          >
            {mut.isPending ? "Saqlanmoqda…" : "Saqlash"}
          </button>
          {manager.subscriptionActive && (
            <button
              onClick={() => { if (confirm("Obunani o'chirish?")) deactivate.mutate(); }}
              disabled={deactivate.isPending}
              className="px-4 border border-destructive/50 text-destructive hover:bg-destructive/10 rounded-lg text-sm transition"
            >
              O'chirish
            </button>
          )}
        </div>
      </div>
    </div>
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
      toast({ title: "Kirish ma'lumotlari yangilandi" });
      qc.invalidateQueries({ queryKey: ["managers"] });
      onClose();
    },
    onError: (e) => toast({ title: "Xato", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Kirish ma'lumotlari</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{manager.storeName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>

        {manager.password && (
          <div className="bg-muted border border-border rounded-lg p-3 mb-4 text-sm">
            <p className="text-muted-foreground text-xs mb-1">Joriy kirish</p>
            <p className="text-foreground font-mono">Login: <span className="text-primary">{manager.login}</span></p>
            <p className="text-foreground font-mono">Parol: <span className="text-primary">{manager.password}</span></p>
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Login (8 ta katta harf/raqam)</label>
            <div className="flex gap-2">
              <input
                value={login}
                onChange={e => setLogin(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="AB123456"
                className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={genLogin} className="px-3 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground">🎲</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Parol (6 ta raqam)</label>
            <div className="flex gap-2">
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                maxLength={6}
                placeholder="123456"
                className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={genPassword} className="px-3 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground">🎲</button>
            </div>
          </div>
        </div>

        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || login.length !== 8 || password.length !== 6}
          className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50"
        >
          {mut.isPending ? "Saqlanmoqda…" : "Saqlash"}
        </button>
      </div>
    </div>
  );
}

// ─── Manager row ──────────────────────────────────────────────────────────────
function ManagerRow({ m, onSub, onCred }: { m: Manager; onSub: () => void; onCred: () => void }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate">{m.storeName}</span>
            <span className="text-xs text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full font-mono">{m.storeId}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{m.fullName} · {m.phone}</p>
        </div>
        <span className={`text-xs font-medium border px-2 py-1 rounded-full whitespace-nowrap ${daysClass(m.subscriptionDaysLeft, m.subscriptionActive)}`}>
          {statusLabel(m)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>📦 {m.salesCount} sotuv</span>
        <span>👥 {m.workerCount} xodim</span>
        <span>📅 {fmtDate(m.subscriptionEnd)}</span>
        <span className="ml-auto font-mono text-primary">{m.subscriptionPlanLabel}</span>
      </div>

      {m.password && (
        <div className="bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-muted-foreground flex gap-4">
          <span>🔑 <span className="text-primary">{m.login}</span></span>
          <span>🔒 <span className="text-primary">{m.password}</span></span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSub}
          className="flex-1 text-xs bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded-lg py-2 transition font-medium"
        >
          📅 Obuna
        </button>
        <button
          onClick={onCred}
          className="flex-1 text-xs bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-lg py-2 transition font-medium"
        >
          🔑 Kirish
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardPage() {
  const { token, logout } = useAdminAuth();
  const [, nav] = useLocation();
  const [search, setSearch] = useState("");
  const [subModal, setSubModal] = useState<Manager | null>(null);
  const [credModal, setCredModal] = useState<Manager | null>(null);
  const [tab, setTab] = useState<"managers" | "logs">("managers");

  useEffect(() => {
    if (!token) nav("/login");
  }, [token, nav]);

  const { data: managers = [], isLoading } = useQuery<Manager[]>({
    queryKey: ["managers"],
    queryFn: async () => {
      const r = await authFetch(token!, "/api/admin/managers");
      if (r.status === 401) { logout(); throw new Error("Sesiya tugagan"); }
      if (!r.ok) throw new Error("Ma'lumotlar yuklanmadi");
      return r.json() as Promise<Manager[]>;
    },
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const { data: logs = [] } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const r = await authFetch(token!, "/api/admin/audit-logs");
      if (!r.ok) throw new Error("Loglar yuklanmadi");
      return r.json() as Promise<AuditLog[]>;
    },
    enabled: !!token && tab === "logs",
  });

  const filtered = managers.filter(m =>
    search === "" ||
    m.storeName.toLowerCase().includes(search.toLowerCase()) ||
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.storeId.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  );

  const active = managers.filter(m => m.subscriptionActive && (m.subscriptionDaysLeft ?? 1) > 0).length;
  const expiring = managers.filter(m => m.subscriptionActive && m.subscriptionDaysLeft !== null && m.subscriptionDaysLeft <= 3 && m.subscriptionDaysLeft > 0).length;
  const expired = managers.filter(m => !m.subscriptionActive || (m.subscriptionDaysLeft !== null && m.subscriptionDaysLeft <= 0)).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-card-border px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xl">🛡️</span>
          <div>
            <h1 className="font-bold text-foreground text-sm sm:text-base">Admin nazoratchi</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">SMARTBOSScontrol boshqaruv paneli</p>
          </div>
        </div>
        <button onClick={logout} className="text-xs text-muted-foreground hover:text-destructive transition px-3 py-1.5 border border-border rounded-lg">
          Chiqish
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Jami do'konlar" value={managers.length} icon="🏪" />
          <StatCard label="Faol obuna" value={active} icon="✅" color="text-green-400" />
          <StatCard label="Tugayapti (≤3 kun)" value={expiring} icon="⚠️" color="text-orange-400" />
          <StatCard label="Muddati o'tgan" value={expired} icon="🔴" color="text-red-400" />
        </div>

        <div className="flex border-b border-border gap-4">
          {(["managers", "logs"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 text-sm font-medium border-b-2 transition ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t === "managers" ? `Do'konlar (${managers.length})` : "Faoliyat tarixi"}
            </button>
          ))}
        </div>

        {tab === "managers" && (
          <>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Do'kon nomi, rahbar ismi, ID yoki telefon…"
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Yuklanmoqda…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Hech narsa topilmadi</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map(m => (
                  <ManagerRow key={m.id} m={m} onSub={() => setSubModal(m)} onCred={() => setCredModal(m)} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "logs" && (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Hech qanday faoliyat yo'q</div>
            ) : logs.map(log => (
              <div key={log.id} className="bg-card border border-card-border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">{actionLabel(log.action)}</span>
                    {log.storeName && <span className="text-sm font-medium text-foreground">{log.storeName}</span>}
                    {log.storeId && <span className="text-xs text-muted-foreground font-mono">{log.storeId}</span>}
                  </div>
                  {log.details && <p className="text-xs text-muted-foreground mt-1">{log.details}</p>}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
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
    if (token && window.location.pathname.endsWith("/login")) nav("/dashboard");
    if (!token && !window.location.pathname.endsWith("/login")) nav("/login");
  }, [token, nav]);

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/" component={() => { nav(token ? "/dashboard" : "/login"); return null; }} />
    </Switch>
  );
}

function App() {
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

export default App;
