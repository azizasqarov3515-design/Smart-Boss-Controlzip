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
  blocked: boolean;
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
    blocked: "To'liq bloklandi",
    unblocked: "Blok olib tashlandi",
  };
  return map[a] ?? a;
}
function actionIcon(a: string): string {
  const map: Record<string, string> = {
    subscription_changed: "📅",
    temp_credentials_set: "🔑",
    login_changed: "👤",
    password_changed: "🔒",
    blocked: "🚫",
    unblocked: "✅",
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

// ─── Block modal ──────────────────────────────────────────────────────────────
function BlockManagerModal({ manager, onClose }: { manager: Manager; onClose: () => void }) {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isBlocked = manager.blocked;

  const blockMut = useMutation({
    mutationFn: async () => {
      const r = await authFetch(token!, `/api/admin/managers/${manager.id}/block`, { method: "POST" });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xato");
    },
    onSuccess: () => {
      toast({ title: "🚫 Obunachi bloklandi" });
      qc.invalidateQueries({ queryKey: ["managers"] });
      onClose();
    },
    onError: (e) => toast({ title: "Xato", description: (e as Error).message, variant: "destructive" }),
  });

  const unblockMut = useMutation({
    mutationFn: async () => {
      const r = await authFetch(token!, `/api/admin/managers/${manager.id}/unblock`, { method: "POST" });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xato");
    },
    onSuccess: () => {
      toast({ title: "✅ Blok olib tashlandi" });
      qc.invalidateQueries({ queryKey: ["managers"] });
      onClose();
    },
    onError: (e) => toast({ title: "Xato", description: (e as Error).message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const r = await authFetch(token!, `/api/admin/managers/${manager.id}`, { method: "DELETE" });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xato");
    },
    onSuccess: () => {
      toast({ title: "🗑️ Obunachi butunlay o'chirildi" });
      qc.invalidateQueries({ queryKey: ["managers"] });
      onClose();
    },
    onError: (e) => toast({ title: "Xato", description: (e as Error).message, variant: "destructive" }),
  });

  const isPending = blockMut.isPending || unblockMut.isPending || deleteMut.isPending;

  return (
    <BottomSheet open title="Obunachini boshqarish" subtitle={manager.storeName} onClose={onClose}>
      {isBlocked ? (
        <div className="bg-red-950/40 border border-red-900/50 rounded-2xl px-4 py-3.5 mb-5">
          <p className="text-sm text-red-400 font-semibold">🚫 Bu obunachi hozir to'liq bloklangan</p>
          <p className="text-xs text-red-400/70 mt-1">Rahbar va barcha sotuvchilar tizimga kira olmaydi.</p>
        </div>
      ) : (
        <div className="bg-secondary/50 border border-border rounded-2xl px-4 py-3.5 mb-5">
          <p className="text-sm text-foreground font-semibold">Do'kon: {manager.storeName}</p>
          <p className="text-xs text-muted-foreground mt-1">{manager.fullName} · {manager.storeId}</p>
        </div>
      )}

      <div className="space-y-3">
        {isBlocked ? (
          <button
            onClick={() => unblockMut.mutate()}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-green-600/20 border border-green-600/40 text-green-400 hover:bg-green-600/30 font-semibold py-3.5 rounded-xl text-sm transition disabled:opacity-50"
          >
            {unblockMut.isPending ? "Ochilmoqda…" : "✅ Blokni olib tashlash"}
          </button>
        ) : (
          <button
            onClick={() => { if (confirm(`"${manager.storeName}" ni bloklashni tasdiqlaysizmi?\n\nRahbar va ishchilar tizimdan chiqariladi.`)) blockMut.mutate(); }}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-orange-600/20 border border-orange-600/40 text-orange-400 hover:bg-orange-600/30 font-semibold py-3.5 rounded-xl text-sm transition disabled:opacity-50"
          >
            {blockMut.isPending ? "Bloklanmoqda…" : "🚫 Obunachini bloklash"}
          </button>
        )}

        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-3 text-center">⚠️ Quyidagi amal qaytarib bo'lmaydi</p>
          <button
            onClick={() => {
              if (confirm(`"${manager.storeName}" ni BUTUNLAY o'chirishni tasdiqlaysizmi?\n\nBarcha ma'lumotlar, login, parol, do'kon ID, ishchilar — hammasi o'chiriladi. Bu amal qaytarib bo'lmaydi!`)) {
                deleteMut.mutate();
              }
            }}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-destructive/15 border border-destructive/40 text-destructive hover:bg-destructive/25 font-semibold py-3.5 rounded-xl text-sm transition disabled:opacity-50"
          >
            {deleteMut.isPending ? "O'chirilmoqda…" : "🗑️ Butunlay yo'q qilish"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── Manager card ─────────────────────────────────────────────────────────────
function ManagerCard({ m, onSub, onCred, onBlock }: { m: Manager; onSub: () => void; onCred: () => void; onBlock: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-2xl overflow-hidden active:scale-[0.99] transition-transform ${m.blocked ? "bg-red-950/20 border-red-900/50" : "bg-card border-card-border"}`}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-base leading-tight">{m.storeName}</span>
              {m.blocked && (
                <span className="text-xs font-bold bg-red-950/60 text-red-400 border border-red-900 px-2 py-0.5 rounded-full">🚫 Bloklangan</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{m.fullName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{m.storeId}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {!m.blocked && (
              <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${daysClass(m.subscriptionDaysLeft, m.subscriptionActive)}`}>
                {statusLabel(m)}
              </span>
            )}
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
              disabled={m.blocked}
              className="flex items-center justify-center gap-1.5 text-sm bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 active:bg-primary/30 rounded-xl py-3 transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              📅 Obuna
            </button>
            <button
              onClick={e => { e.stopPropagation(); onCred(); }}
              disabled={m.blocked}
              className="flex items-center justify-center gap-1.5 text-sm bg-secondary border border-border text-muted-foreground hover:text-foreground active:bg-secondary/80 rounded-xl py-3 transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🔑 Kirish
            </button>
          </div>

          <button
            onClick={e => { e.stopPropagation(); onBlock(); }}
            className={`w-full flex items-center justify-center gap-1.5 text-sm border rounded-xl py-3 transition font-semibold ${
              m.blocked
                ? "bg-green-600/10 border-green-600/30 text-green-400 hover:bg-green-600/20"
                : "bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-950/40"
            }`}
          >
            {m.blocked ? "✅ Blokni olib tashlash / O'chirish" : "🚫 Obunachini yo'q qilish"}
          </button>
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

// ─── Reset password page ──────────────────────────────────────────────────────
function ResetPasswordPage() {
  const [, nav] = useLocation();
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (newPwd !== confirmPwd) { setErr("Parollar mos emas"); return; }
    if (newPwd.length < 6) { setErr("Parol kamida 6 ta belgi bo'lishi kerak"); return; }
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryKey, newPassword: newPwd }),
      });
      const d = await r.json() as { ok?: boolean; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xato yuz berdi");
      setSuccess(true);
    } catch (er) {
      setErr((er as Error).message);
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-5">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-4xl mx-auto mb-6">
            ✅
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Parol muvaffaqiyatli o'zgartirildi!</h2>
          <p className="text-sm text-muted-foreground mb-8">Endi yangi parolingiz bilan kirishingiz mumkin.</p>
          <button
            onClick={() => nav("/login")}
            className="w-full bg-primary hover:opacity-90 text-primary-foreground font-bold py-4 rounded-2xl transition text-base"
          >
            Kirish sahifasiga →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center bg-background p-5"
      style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-4xl mx-auto mb-4">
            🔓
          </div>
          <h1 className="text-2xl font-bold text-foreground">Parolni tiklash</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Tiklash kodi bilan yangi parol o'rnating</p>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl px-4 py-3.5 mb-6 space-y-2">
          <p className="text-xs text-orange-400 font-medium leading-relaxed">
            💡 <strong>Tiklash kodini qayerdan topasiz?</strong>
          </p>
          <p className="text-xs text-orange-300/80 leading-relaxed">
            Replit loyihasida <strong>Tools → Secrets</strong> bo'limiga o'ting va <code className="bg-orange-500/20 px-1 rounded font-mono">SESSION_SECRET</code> ning qiymatini ko'chiring.
          </p>
          <p className="text-xs text-orange-300/60 leading-relaxed">
            Bu qiymat faqat server egasiga ma'lum bo'lgan maxfiy kalit.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Tiklash kodi (SESSION_SECRET)</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={recoveryKey}
                onChange={e => setRecoveryKey(e.target.value)}
                placeholder="Tiklash kodini kiriting"
                className="w-full bg-input border border-border rounded-2xl px-4 py-4 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
                style={{ fontSize: "16px" }}
                autoComplete="off"
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showKey ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Yangi parol</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Kamida 6 ta belgi"
                className="w-full bg-input border border-border rounded-2xl px-4 py-4 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
                style={{ fontSize: "16px" }}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Yangi parolni tasdiqlang</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Parolni qayta kiriting"
              className="w-full bg-input border border-border rounded-2xl px-4 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
              style={{ fontSize: "16px" }}
              autoComplete="new-password"
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
            disabled={loading || !recoveryKey || !newPwd || !confirmPwd}
            className="w-full bg-primary hover:opacity-90 active:opacity-75 text-primary-foreground font-bold py-4 rounded-2xl transition disabled:opacity-50 text-base"
          >
            {loading ? "Tiklanmoqda…" : "Parolni o'zgartirish →"}
          </button>
        </form>

        <button
          onClick={() => nav("/login")}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition py-2"
        >
          ← Orqaga qaytish
        </button>
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
  const [showPwd, setShowPwd] = useState(false);
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
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="Parolni kiriting"
                className="w-full bg-input border border-border rounded-2xl px-4 py-4 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
                style={{ fontSize: "16px" }}
                autoFocus
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
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

        <button
          onClick={() => nav("/reset-password")}
          className="w-full mt-5 text-sm text-muted-foreground hover:text-primary transition py-2 text-center"
        >
          🔓 Parolni unutdingizmi?
        </button>
      </div>
    </div>
  );
}

// ─── Admin Settings Tab ───────────────────────────────────────────────────────
function AdminSettingsTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(token!, "/api/admin/settings")
      .then(r => r.json() as Promise<{ adminPhone?: string }>)
      .then(d => { setPhone(d.adminPhone ?? ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await authFetch(token!, "/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({ adminPhone: phone }),
      });
      const d = await r.json() as { ok?: boolean; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xato");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "✅ Sozlamalar saqlandi" });
    } catch (e) {
      toast({ title: "Xato", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl">📞</div>
          <div>
            <h3 className="font-bold text-foreground text-base">Admin telefon raqami</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Obunasi yo'q foydalanuvchilar shu raqamni ko'radi</p>
          </div>
        </div>

        {loading ? (
          <div className="h-12 bg-secondary/60 rounded-xl animate-pulse" />
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Telefon raqam</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full bg-input border border-border rounded-2xl px-4 py-3.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
                style={{ fontSize: "16px" }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Foydalanuvchi "Obuna sotib olish" tugmasini bosganida ushbu raqam ko'rsatiladi
              </p>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary hover:opacity-90 active:opacity-75 text-primary-foreground font-bold py-3.5 rounded-xl transition text-sm"
            >
              {saved ? "✅ Saqlandi" : "💾 Saqlash"}
            </button>
          </form>
        )}
      </div>

      <div className="bg-secondary/40 border border-border rounded-2xl p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">ℹ️ Qanday ishlaydi?</h4>
        <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <li>• Yangi ro'yxatdan o'tgan rahbarlar obunasiz bo'ladi</li>
          <li>• Ular "Tovarlar", "Tarix", "Mijozlar", "Kassa" bo'limlariga kira olmaydi</li>
          <li>• "Obuna sotib olish" tugmasini bosganida yuqoridagi raqam ko'rsatiladi</li>
          <li>• To'lovdan keyin bu yerdan obunani ulab qo'ying — foydalanuvchi darhol kirish oladi</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Admin Delete Request types ────────────────────────────────────────────────
interface AdminDeleteRequest {
  id: number;
  type: string;
  workerName: string;
  status: string;
  saleIds: number[];
  productIds: number[] | null;
  productNames: string[] | null;
  customerIds: number[] | null;
  customerNames: string[] | null;
  managerId: number | null;
  createdAt: string;
}

// ─── Approval Inbox Tab ────────────────────────────────────────────────────────
function ApprovalInboxTab({ token }: { token: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const { data: allRequests = [], isLoading, refetch, isFetching } = useQuery<AdminDeleteRequest[]>({
    queryKey: ["admin-delete-requests"],
    queryFn: async () => {
      const r = await authFetch(token, "/api/admin/delete-requests");
      if (!r.ok) throw new Error("So'rovlarni yuklashda xato");
      return r.json() as Promise<AdminDeleteRequest[]>;
    },
    refetchInterval: 30_000,
  });

  const approveMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await authFetch(token, `/api/admin/delete-requests/${id}/approve`, { method: "POST" });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xato");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-delete-requests"] }); toast({ title: "Tasdiqlandi", description: "So'rov tasdiqlandi va o'chirildi." }); },
    onError: (e: Error) => toast({ title: "Xato", description: e.message, variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await authFetch(token, `/api/admin/delete-requests/${id}/reject`, { method: "POST" });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xato");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-delete-requests"] }); toast({ title: "Rad etildi", description: "So'rov rad etildi." }); },
    onError: (e: Error) => toast({ title: "Xato", description: e.message, variant: "destructive" }),
  });

  const filtered = allRequests.filter(r => filter === "all" ? true : r.status === filter);
  const pendingCount = allRequests.filter(r => r.status === "pending").length;

  function typeIcon(type: string) {
    if (type === "product") return "📦";
    if (type === "customer") return "👤";
    return "🧾";
  }
  function typeLabel(r: AdminDeleteRequest) {
    if (r.type === "product") return `Mahsulot: ${r.productNames?.join(", ") ?? "—"}`;
    if (r.type === "customer") return `Mijoz: ${r.customerNames?.join(", ") ?? "—"}`;
    return `${r.saleIds.length} ta savdo`;
  }
  function statusBadge(status: string) {
    if (status === "pending") return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">Kutmoqda</span>;
    if (status === "approved") return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">Tasdiqlandi</span>;
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">Rad etildi</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground text-base">O'chirish so'rovlari</h3>
          {pendingCount > 0 && <p className="text-xs text-yellow-700 mt-0.5">{pendingCount} ta so'rov javob kutmoqda</p>}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className={`w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center text-sm transition ${isFetching ? "animate-spin opacity-50" : "active:scale-95"}`}
        >🔄</button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(["pending", "all", "approved", "rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground"}`}
          >
            {f === "pending" ? `⏳ Kutmoqda${pendingCount > 0 ? ` (${pendingCount})` : ""}` : f === "all" ? "Barchasi" : f === "approved" ? "✅ Tasdiqlangan" : "❌ Rad etilgan"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-card-border rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-secondary rounded w-2/3 mb-2" />
              <div className="h-3 bg-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-muted-foreground font-medium">
            {filter === "pending" ? "Kutayotgan so'rovlar yo'q" : "Hech narsa topilmadi"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-card border border-card-border rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-xl leading-none mt-0.5">{typeIcon(r.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm leading-tight">{r.workerName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{typeLabel(r)}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{new Date(r.createdAt).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                {statusBadge(r.status)}
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMut.mutate(r.id)}
                    disabled={approveMut.isPending || rejectMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-100 hover:bg-green-200 active:bg-green-200 text-green-800 font-semibold text-sm py-2.5 rounded-xl border border-green-200 transition disabled:opacity-50"
                  >
                    {approveMut.isPending ? "⏳" : "✅"} Tasdiqlash
                  </button>
                  <button
                    onClick={() => rejectMut.mutate(r.id)}
                    disabled={approveMut.isPending || rejectMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-100 hover:bg-red-200 active:bg-red-200 text-red-800 font-semibold text-sm py-2.5 rounded-xl border border-red-200 transition disabled:opacity-50"
                  >
                    {rejectMut.isPending ? "⏳" : "❌"} Rad etish
                  </button>
                </div>
              )}
            </div>
          ))}
          <p className="text-center text-xs text-muted-foreground/60 py-1">{filtered.length} ta so'rov</p>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────
type TabType = "managers" | "logs" | "settings" | "inbox";

function DashboardPage() {
  const { token, logout } = useAdminAuth();
  const [, nav] = useLocation();
  const [search, setSearch] = useState("");
  const [subModal, setSubModal] = useState<Manager | null>(null);
  const [credModal, setCredModal] = useState<Manager | null>(null);
  const [blockModal, setBlockModal] = useState<Manager | null>(null);
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
          <div className="flex bg-secondary/50 border border-border rounded-2xl p-1 gap-1 flex-wrap">
            {(["managers", "inbox", "logs", "settings"] as TabType[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition min-w-[60px] ${
                  tab === t ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground active:text-foreground"
                }`}
              >
                {t === "managers" ? `🏪 Do'konlar` : t === "inbox" ? "📥 Arizalar" : t === "logs" ? "📋 Tarix" : "⚙️ Sozlama"}
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
                      onBlock={() => setBlockModal(m)}
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

          {tab === "inbox" && <ApprovalInboxTab token={token!} />}

          {tab === "settings" && <AdminSettingsTab />}
        </div>
      </div>

      {subModal && <SubscriptionModal manager={subModal} onClose={() => setSubModal(null)} />}
      {credModal && <CredentialsModal manager={credModal} onClose={() => setCredModal(null)} />}
      {blockModal && <BlockManagerModal manager={blockModal} onClose={() => setBlockModal(null)} />}
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
    const isReset = path.includes("/reset-password");
    if (isReset) return; // Allow reset-password page without auth
    if (token && isLogin) nav("/dashboard");
    if (!token && !isLogin) nav("/login");
  }, [token, nav]);

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
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
