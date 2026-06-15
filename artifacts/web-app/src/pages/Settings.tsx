import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetWorkers,
  useApproveWorker,
  useRejectWorker,
  useRemoveWorker,
  useGetDeleteRequests,
  useApproveDeleteRequest,
  useRejectDeleteRequest,
  getGetWorkersQueryKey,
  getGetDeleteRequestsQueryKey,
  getGetSalesQueryKey,
  getGetDashboardStatsQueryKey,
  getGetProductsQueryKey,
  type Worker,
  type DeleteRequest,
} from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useColors } from "../hooks/useColors";
import { useSettings, type Seller, type StoreSettings } from "../hooks/useSettings";
import { useTranslation } from "../contexts/LanguageContext";

function formatMoney(n: number) {
  return n.toLocaleString("uz-UZ") + " UZS";
}

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function SectionCard({
  title,
  icon,
  badge,
  colors,
  children,
}: {
  title: string;
  icon: string;
  badge?: number;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <div className="card-standard" style={{ padding: "0", overflow: "hidden", border: `1px solid ${colors.border}` }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 14px",
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.card
      }}>
        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          backgroundColor: `${colors.primary}18`,
          color: colors.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <span className="material-icons" style={{ fontSize: "18px" }}>{icon}</span>
        </div>
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: colors.foreground, flex: 1, margin: 0 }}>
          {title}
        </h3>
        {badge != null && badge > 0 && (
          <span style={{
            backgroundColor: "#DC2626",
            color: "white",
            fontSize: "11px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "10px"
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {children}
      </div>
    </div>
  );
}

export function Settings() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { t, setLanguage } = useTranslation();
  const {
    role,
    token,
    managerId,
    managerLogin,
    managerStoreId,
    password,
    deleteAccount,
    subscriptionPlan,
    subscriptionEnd,
    subscriptionDaysLeft,
    subscriptionActive,
    logout
  } = useAuth();
  const { settings, saveSettings, isLoading: settingsLoading } = useSettings(managerId);

  const isManager = role === "manager";

  // Form states
  const [storeName, setStoreName] = useState("");
  const [storeSubtitle, setStoreSubtitle] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [profilePic, setProfilePic] = useState<string | undefined>(undefined);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [appLanguage, setAppLanguage] = useState<"uz" | "ru">("uz");
  const [disabledUnits, setDisabledUnits] = useState<string[]>([]);
  const [printFontSizePercent, setPrintFontSizePercent] = useState(100);
  const [uiFontSizePercent, setUiFontSizePercent] = useState(50);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Seller modal state
  const [sellerModal, setSellerModal] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [deleteSellerConfirm, setDeleteSellerConfirm] = useState<Seller | null>(null);

  // Workers and requests query
  const { data: workers, isLoading: loadingWorkers, refetch: refetchWorkers } = useGetWorkers({
    query: { enabled: isManager, refetchInterval: 30000 } as any
  });
  const { data: deleteRequests, isLoading: loadingRequests, refetch: refetchRequests } = useGetDeleteRequests({
    query: { enabled: isManager, refetchInterval: 30000 } as any
  });

  // Worker mutations
  const { mutate: approveWorker } = useApproveWorker({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWorkersQueryKey() }),
    },
  });
  const { mutate: rejectWorker } = useRejectWorker({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWorkersQueryKey() }),
    },
  });
  const [removeWorkerConfirm, setRemoveWorkerConfirm] = useState<Worker | null>(null);
  const { mutate: removeWorker, isPending: removingWorker } = useRemoveWorker({
    mutation: {
      onSuccess: () => {
        setRemoveWorkerConfirm(null);
        queryClient.invalidateQueries({ queryKey: getGetWorkersQueryKey() });
      },
    },
  });

  // Request mutations
  const { mutate: approveRequest } = useApproveDeleteRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDeleteRequestsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
      },
    },
  });
  const { mutate: rejectRequest } = useRejectDeleteRequest({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDeleteRequestsQueryKey() }),
    },
  });

  // Delete account modal state
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  useEffect(() => {
    if (!settingsLoading) {
      setStoreName(settings.storeName || "");
      setStoreSubtitle(settings.storeSubtitle || "");
      setStoreAddress(settings.storeAddress || "");
      setSellers(settings.sellers || []);
      setProfilePic(settings.managerProfilePic);
      setTelegramBotToken(settings.telegramBotToken || "");
      const lang = settings.appLanguage || "uz";
      setAppLanguage(lang);
      setLanguage(lang);
      setDisabledUnits(settings.disabledUnits || []);
      setPrintFontSizePercent(settings.printFontSizePercent ?? 100);
      setUiFontSizePercent(settings.uiFontSizePercent ?? 50);
    }
  }, [settingsLoading, settings, setLanguage]);

  const handleSaveStoreSettings = async () => {
    if (!storeName.trim()) return;
    setSaving(true);
    const next: StoreSettings = {
      storeName: storeName.trim(),
      storeSubtitle: storeSubtitle.trim(),
      storeAddress: storeAddress.trim(),
      sellers,
      managerProfilePic: profilePic,
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: "",
      appLanguage,
      disabledUnits,
      printFontSizePercent,
      uiFontSizePercent,
    };
    saveSettings(next);
    
    try {
      await fetch("/api/auth/store-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: next }),
      });
    } catch (err) {
      console.error("Failed to save store settings to DB:", err);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePic(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const openAddSeller = () => {
    setEditingSeller(null);
    setSellerName("");
    setSellerPhone("");
    setSellerError(null);
    setSellerModal(true);
  };

  const openEditSeller = (s: Seller) => {
    setEditingSeller(s);
    setSellerName(s.name);
    setSellerPhone(s.phone);
    setSellerError(null);
    setSellerModal(true);
  };

  const handleSaveSeller = () => {
    if (!sellerName.trim()) { setSellerError("Ism kiritilishi shart"); return; }
    if (!sellerPhone.trim()) { setSellerError("Telefon kiritilishi shart"); return; }

    if (editingSeller) {
      setSellers((prev) => prev.map((s) => s.id === editingSeller.id ? { ...s, name: sellerName.trim(), phone: sellerPhone.trim() } : s));
    } else {
      setSellers((prev) => [...prev, { id: uuid(), name: sellerName.trim(), phone: sellerPhone.trim() }]);
    }
    setSellerModal(false);
  };

  const handleDeleteSeller = (s: Seller) => {
    setDeleteSellerConfirm(s);
  };

  const handleConfirmDeleteSeller = () => {
    if (!deleteSellerConfirm) return;
    setSellers((prev) => prev.filter((s) => s.id !== deleteSellerConfirm.id));
    setDeleteSellerConfirm(null);
  };

  const handleDeleteAccountConfirm = async () => {
    setDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      await deleteAccount();
      logout();
    } catch (e: any) {
      setDeleteAccountError(e.message || "Xato yuz berdi");
      setDeletingAccount(false);
    }
  };

  if (settingsLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "12px", height: "80vh" }}>
        <div className="spinner" style={{ width: "30px", height: "30px", border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        <span style={{ fontSize: "14px", color: colors.mutedForeground }}>Sozlamalar yuklanmoqda...</span>
      </div>
    );
  }

  const pendingWorkers = isManager ? (workers ?? []).filter((w) => w.status === "pending") : [];
  const activeWorkers = isManager ? (workers ?? []).filter((w) => w.status !== "pending") : [];
  const pendingRequestsCount = isManager ? (deleteRequests ?? []).length : 0;

  return (
    <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "20px", color: colors.foreground }}>Sozlamalar</h2>
        <p className="text-muted" style={{ fontSize: "12px", marginTop: "2px" }}>
          Tizim parametrlari, mavzu va hisob ma'lumotlarini sozlash
        </p>
      </div>

      {/* Subscription Card */}
      {(() => {
        const daysLeft = subscriptionDaysLeft || 0;
        let totalDays = 30;
        const planLower = (subscriptionPlan || "").toLowerCase();
        if (planLower.includes("1 oylik") || planLower.includes("1-oylik") || planLower.includes("bir oylik") || planLower === "1 oylik obuna") {
          totalDays = 30;
        } else if (planLower.includes("3 oylik") || planLower.includes("3-oylik") || planLower.includes("uch oylik")) {
          totalDays = 90;
        } else if (planLower.includes("6 oylik") || planLower.includes("6-oylik") || planLower.includes("olti oylik")) {
          totalDays = 180;
        } else if (planLower.includes("1 yillik") || planLower.includes("yillik") || planLower.includes("1-yillik")) {
          totalDays = 365;
        } else if (subscriptionPlan === "unlimited") {
          totalDays = 365;
        } else if (daysLeft > totalDays) {
          totalDays = Math.max(30, Math.ceil(daysLeft / 30) * 30);
        }

        const usedDays = Math.max(0, totalDays - daysLeft);
        const progressPercent = totalDays > 0 ? Math.min(100, (usedDays / totalDays) * 100) : 0;

        const formatSubEndDate = (d: Date | null) => {
          if (!d) return "Mavjud emas";
          const dateObj = new Date(d);
          if (isNaN(dateObj.getTime())) return "Mavjud emas";
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
          const dd = String(dateObj.getDate()).padStart(2, "0");
          return `${yyyy}.${mm}.${dd}`;
        };

        const formattedEndDate = formatSubEndDate(subscriptionEnd);
        const displayPlanName = subscriptionPlan === "unlimited"
          ? "Cheksiz Premium"
          : subscriptionPlan
          ? (subscriptionPlan.toLowerCase().includes("obuna") ? subscriptionPlan : `${subscriptionPlan} obuna`)
          : "Bepul (Demo)";

        return (
          <div style={{
            backgroundColor: "#0B1320", // Deep dark navy
            border: "1px solid #1E293B",
            borderRadius: "20px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            color: "#FFFFFF",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: subscriptionActive ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  color: subscriptionActive ? "#10B981" : "#EF4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <span className="material-icons" style={{ fontSize: "22px" }}>
                    {subscriptionActive ? "verified" : "gpp_bad"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, display: "block", lineHeight: "1.2" }}>Obuna holati</span>
                  <h4 style={{ fontSize: "16px", fontWeight: 700, margin: "2px 0 0 0", color: "#FFFFFF" }}>
                    {displayPlanName}
                  </h4>
                </div>
              </div>
              <span style={{
                backgroundColor: subscriptionActive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: subscriptionActive ? "#10B981" : "#EF4444",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <span style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: subscriptionActive ? "#10B981" : "#EF4444",
                  display: "inline-block"
                }}></span>
                {subscriptionActive ? "Faol" : "Faol emas"}
              </span>
            </div>

            {/* Inner green card */}
            <div style={{
              backgroundColor: "#F0FDF4", // Light green tint
              borderRadius: "16px",
              padding: "24px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              margin: "4px 0",
              border: "1px solid rgba(16, 185, 129, 0.1)"
            }}>
              <span style={{
                fontSize: "64px",
                fontWeight: 800,
                color: "#16A34A", // Green color
                lineHeight: 1,
                fontFamily: '"Outfit", sans-serif'
              }}>
                {subscriptionPlan === "unlimited" ? "∞" : daysLeft}
              </span>
              <span style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#15803D", // Medium green
                marginTop: "6px"
              }}>
                {subscriptionPlan === "unlimited" ? "cheksiz foydalanish" : "kun qoldi"}
              </span>
            </div>

            {/* Progress bar and label */}
            {subscriptionPlan !== "unlimited" && (
              <div>
                <div style={{
                  height: "8px",
                  backgroundColor: "#1E293B",
                  borderRadius: "4px",
                  overflow: "hidden",
                  width: "100%"
                }}>
                  <div style={{
                    height: "100%",
                    backgroundColor: "#10B981",
                    borderRadius: "4px",
                    width: `${progressPercent}%`,
                    transition: "width 0.5s ease"
                  }}></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "6px", color: "#94A3B8", fontWeight: 500 }}>
                  <span>{usedDays} kun ishlatildi</span>
                  <span>{totalDays} kundan</span>
                </div>
              </div>
            )}

            {/* Divider line */}
            <div style={{ borderTop: "1px solid #1E293B", margin: "4px 0" }}></div>

            {/* Detail rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94A3B8" }}>
                  <span className="material-icons" style={{ fontSize: "16px" }}>calendar_today</span>
                  <span style={{ fontSize: "13px" }}>Tugash sanasi</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#FFFFFF" }}>
                  {subscriptionPlan === "unlimited" ? "Muddatsiz" : formattedEndDate}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94A3B8" }}>
                  <span className="material-icons" style={{ fontSize: "16px" }}>workspace_premium</span>
                  <span style={{ fontSize: "13px" }}>Tarif rejasi</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#10B981" }}>
                  {subscriptionPlan === "unlimited" ? "Cheksiz Premium" : subscriptionPlan ? `${subscriptionPlan}` : "Demo"}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1. Theme Configuration */}
      <SectionCard title="Ko'rinish (Mavzu)" icon="palette" colors={colors}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {([
            { value: "light", label: "Kunduzgi", icon: "light_mode" },
            { value: "dark", label: "Tungi", icon: "dark_mode" },
            { value: "system", label: "Tizim", icon: "brightness_auto" }
          ] as const).map((t) => {
            const active = themeMode === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setThemeMode(t.value)}
                className="btn-secondary"
                style={{
                  padding: "10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: active ? `${colors.primary}12` : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? "2px" : "1px",
                  color: active ? colors.primary : colors.foreground,
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                <span className="material-icons">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* 2. Store details settings (Manager only) */}
      {isManager && (
        <SectionCard title="Do'kon ma'lumotlari" icon="storefront" colors={colors}>
          {/* Profile Picture */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "6px" }}>
            <div style={{ position: "relative", width: "210px", height: "210px", borderRadius: "50%", overflow: "hidden", backgroundColor: colors.muted, border: `1.5px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {profilePic ? (
                <img src={profilePic} alt="Store logo" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.35)" }} />
              ) : (
                <span className="material-icons" style={{ color: colors.mutedForeground, fontSize: "84px" }}>store</span>
              )}
            </div>
            <div>
              <input type="file" id="store-logo-upload" accept="image/*" onChange={handleProfilePicChange} style={{ display: "none" }} />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => document.getElementById("store-logo-upload")?.click()}
                style={{ fontSize: "11px", padding: "6px 12px" }}
              >
                Logotip tanlash
              </button>
              <span className="text-muted" style={{ fontSize: "10px", display: "block", marginTop: "4px" }}>
                Faktura va cheklarda chiqariladi
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: colors.mutedForeground, marginBottom: "4px" }}>Do'kon nomi</label>
            <input type="text" className="input-field" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Masalan: SMARTBOSS" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: colors.mutedForeground, marginBottom: "4px" }}>Izoh / Subtitr</label>
            <input type="text" className="input-field" value={storeSubtitle} onChange={(e) => setStoreSubtitle(e.target.value)} placeholder="Masalan: Mobil aksessuarlar do'koni" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: colors.mutedForeground, marginBottom: "4px" }}>Do'kon manzili</label>
            <input type="text" className="input-field" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="Masalan: Toshkent sh., Chilonzor tumani..." />
          </div>

          <button
            className="btn-primary"
            onClick={handleSaveStoreSettings}
            disabled={saving}
            style={{ marginTop: "6px", width: "100%" }}
          >
            {saving ? "Saqlanmoqda..." : saved ? "Saqlandi ✓" : "Sozlamalarni saqlash"}
          </button>
        </SectionCard>
      )}

      {/* 2.5. Shriftlar o'lchami */}
      <SectionCard title="Shriftlar o'lchami" icon="format_size" colors={colors}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: colors.mutedForeground, marginBottom: "4px" }}>
              Dastur interfeysini shriftini o'lchamini o'zgartirish
            </label>
            <select
              className="input-field"
              value={uiFontSizePercent}
              onChange={(e) => setUiFontSizePercent(Number(e.target.value))}
              style={{ width: "100%", cursor: "pointer", backgroundColor: colors.card, color: colors.foreground, border: `1px solid ${colors.border}` }}
            >
              <option value="50">50% (Joriy / Standart)</option>
              <option value="60">60%</option>
              <option value="70">70%</option>
              <option value="80">80%</option>
              <option value="90">90%</option>
              <option value="100">100%</option>
            </select>
          </div>

          <div style={{ marginTop: "12px" }}>
            <label style={{ display: "block", fontSize: "11px", color: colors.mutedForeground, marginBottom: "4px" }}>
              Hujjatlar shriftini o'lchamini o'zgartirish
            </label>
            <select
              className="input-field"
              value={printFontSizePercent}
              onChange={(e) => setPrintFontSizePercent(Number(e.target.value))}
              style={{ width: "100%", cursor: "pointer", backgroundColor: colors.card, color: colors.foreground, border: `1px solid ${colors.border}` }}
            >
              <option value="80">80%</option>
              <option value="90">90%</option>
              <option value="100">100% (Joriy / Standart)</option>
              <option value="110">110%</option>
              <option value="120">120%</option>
              <option value="130">130%</option>
              <option value="140">140%</option>
              <option value="150">150%</option>
            </select>
          </div>

          <button
            className="btn-primary"
            onClick={handleSaveStoreSettings}
            disabled={saving}
            style={{ marginTop: "16px", width: "100%" }}
          >
            {saving ? "Saqlanmoqda..." : saved ? "Saqlandi ✓" : "Shrift sozlamalarini saqlash"}
          </button>
        </SectionCard>



      {/* 4. Pending Worker Approvals (Manager only) */}
      {isManager && (
        <SectionCard title="Ishchi arizalari" icon="person_add" badge={pendingWorkers.length} colors={colors}>
          {pendingWorkers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "12px", color: colors.mutedForeground, fontSize: "13px" }}>
              Kutayotgan ishchi arizalari mavjud emas
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {pendingWorkers.map((w) => (
                <div key={w.id} className="card-standard" style={{ display: "flex", flexDirection: "column", gap: "10px", borderColor: "#F59E0B", backgroundColor: "rgba(245, 158, 11, 0.03)" }}>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 600 }}>{w.name}</h4>
                    <p className="text-muted" style={{ fontSize: "11px", marginTop: "2px", margin: 0 }}>Tel: {w.phone} · Manzil: {w.address}</p>
                    {(w as any).password && (
                      <div className="text-muted" style={{ fontSize: "11px", marginTop: "2px", color: colors.mutedForeground, display: "flex", alignItems: "center", gap: "4px" }}>
                        <span className="material-icons" style={{ fontSize: "12px", color: colors.primary }}>vpn_key</span>
                        <span>Sotuvchi paroli: <strong style={{ color: colors.foreground }}>{(w as any).password}</strong></span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn-success"
                      onClick={() => approveWorker({ id: w.id })}
                      style={{ flex: 1, padding: "8px", fontSize: "12px", gap: "4px" }}
                    >
                      <span className="material-icons" style={{ fontSize: "16px" }}>check_circle</span>
                      <span>Tasdiqlash</span>
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => rejectWorker({ id: w.id })}
                      style={{ flex: 1, padding: "8px", fontSize: "12px", gap: "4px", borderColor: "rgba(239, 68, 68, 0.3)", color: colors.destructive }}
                    >
                      <span className="material-icons" style={{ fontSize: "16px" }}>cancel</span>
                      <span>Rad etish</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* 5. Workers List (Manager only) */}
      {isManager && activeWorkers.length > 0 && (
        <SectionCard title="Ishchilar boshqaruvi" icon="badge" colors={colors}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {activeWorkers.map((w) => {
              const isOnline = (w as any).isOnline === true;
              return (
                <div key={w.id} className="card-standard" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{ position: "relative" }}>
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: `${colors.primary}12`,
                        color: colors.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "14px"
                      }}>
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{
                        position: "absolute",
                        top: "-2px",
                        right: "-2px",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: isOnline ? "#22C55E" : "#EF4444",
                        border: `2px solid ${colors.card}`
                      }}></div>
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{w.name}</span>
                        <span style={{
                          backgroundColor: w.status === "approved" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                          color: w.status === "approved" ? colors.success : colors.destructive,
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: "4px"
                        }}>
                          {w.status === "approved" ? "Tasdiqlangan" : "Rad etilgan"}
                        </span>
                      </div>
                      <div className="text-muted" style={{ fontSize: "11px" }}>{w.phone}</div>
                      {(w as any).password && (
                        <div className="text-muted" style={{ fontSize: "11px", marginTop: "2px", color: colors.mutedForeground, display: "flex", alignItems: "center", gap: "4px" }}>
                          <span className="material-icons" style={{ fontSize: "12px", color: colors.primary }}>vpn_key</span>
                          <span>Sotuvchi paroli: <strong style={{ color: colors.foreground }}>{(w as any).password}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => setRemoveWorkerConfirm(w)}
                    style={{ padding: "6px", borderRadius: "8px", borderColor: "rgba(239, 68, 68, 0.2)" }}
                  >
                    <span className="material-icons" style={{ fontSize: "16px", color: colors.destructive }}>person_remove</span>
                  </button>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* 6. Delete Requests Section (Manager only) */}
      {isManager && (
        <SectionCard title="O'chirish so'rovlari" icon="delete_sweep" badge={pendingRequestsCount} colors={colors}>
          {pendingRequestsCount === 0 ? (
            <div style={{ textAlign: "center", padding: "12px", color: colors.mutedForeground, fontSize: "13px" }}>
              Kutayotgan o'chirish so'rovlari mavjud emas
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(deleteRequests ?? []).map((r: DeleteRequest) => {
                const isProduct = r.type === "product";
                const isCustomer = r.type === "customer";
                const productNames = (r as any).productNames as string[] | null;
                const customerNames = (r as any).customerNames as string[] | null;
                const saleIds = r.saleIds as number[];

                let accentCol = "#7C3AED";
                let titleText = `Savdo o'chirish (${saleIds.length} ta)`;
                if (isProduct) { accentCol = "#16A34A"; titleText = `Tovarni o'chirish`; }
                if (isCustomer) { accentCol = "#1D4ED8"; titleText = `Mijozni o'chirish`; }

                return (
                  <div key={r.id} className="card-standard" style={{ display: "flex", flexDirection: "column", gap: "10px", borderLeft: `4px solid ${accentCol}` }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: colors.foreground }}>{titleText}</span>
                        <span style={{ fontSize: "10px", color: colors.mutedForeground }}>
                          {new Date(r.createdAt).toLocaleString("uz-UZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-muted" style={{ fontSize: "11px", marginTop: "2px" }}>Ishchi: {r.workerName}</p>
                      <div style={{ fontSize: "12px", fontWeight: 600, marginTop: "4px" }}>
                        {isProduct && `Nomi: ${productNames?.join(", ")}`}
                        {isCustomer && `Ismi: ${customerNames?.join(", ")}`}
                        {!isProduct && !isCustomer && `Tranzaksiya ID: #${saleIds.join(", #")}`}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn-success"
                        onClick={() => approveRequest({ id: r.id })}
                        style={{ flex: 1, padding: "8px", fontSize: "12px", gap: "4px" }}
                      >
                        <span className="material-icons" style={{ fontSize: "16px" }}>check</span>
                        <span>Ruxsat berish</span>
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => rejectRequest({ id: r.id })}
                        style={{ flex: 1, padding: "8px", fontSize: "12px", gap: "4px", borderColor: "rgba(239, 68, 68, 0.3)", color: colors.destructive }}
                      >
                        <span className="material-icons" style={{ fontSize: "16px" }}>close</span>
                        <span>Rad qilish</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      {/* Telegram Bot Token Section */}
      {isManager && (
        <SectionCard title="Telegram Bot Token oynasi" icon="smart_toy" colors={colors}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: colors.mutedForeground, marginBottom: "4px" }}>Telegram Bot Token</label>
            <input type="text" className="input-field" value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} placeholder="Bot tokenini kiriting..." />
          </div>
          <button
            className="btn-primary"
            onClick={handleSaveStoreSettings}
            disabled={saving}
            style={{ marginTop: "6px", width: "100%" }}
          >
            {saving ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}
          </button>
        </SectionCard>
      )}

      {/* Language Section */}
      <SectionCard title={t("Ilova tili")} icon="translate" colors={colors}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              setAppLanguage("uz");
              const next = { ...settings, appLanguage: "uz" as const };
              saveSettings(next);
              setLanguage("uz");
            }}
            className="btn-secondary"
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: appLanguage === "uz" ? `${colors.primary}12` : colors.card,
              borderColor: appLanguage === "uz" ? colors.primary : colors.border,
              color: appLanguage === "uz" ? colors.primary : colors.foreground,
              fontWeight: 600,
            }}
          >
            {t("O'zbekcha")}
          </button>
          <button
            onClick={() => {
              setAppLanguage("ru");
              const next = { ...settings, appLanguage: "ru" as const };
              saveSettings(next);
              setLanguage("ru");
            }}
            className="btn-secondary"
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: appLanguage === "ru" ? `${colors.primary}12` : colors.card,
              borderColor: appLanguage === "ru" ? colors.primary : colors.border,
              color: appLanguage === "ru" ? colors.primary : colors.foreground,
              fontWeight: 600,
            }}
          >
            {t("Русский")}
          </button>
        </div>
      </SectionCard>

      {/* Measurement Units Toggle Section */}
      {isManager && (
        <SectionCard title="O'lchov birliklari" icon="straighten" colors={colors}>
        <p className="text-muted" style={{ fontSize: "12px", marginBottom: "8px" }}>
          Savat va savdoda ishlatiladigan o'lchov birliklarini boshqarish:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { key: "dona", label: "Dona (Count)", icon: "🔢" },
            { key: "kg", label: "Kilogram (Weight)", icon: "⚖️" },
            { key: "m", label: "Metr (Length)", icon: "📏" }
          ].map((unit) => {
            const isDisabled = disabledUnits.includes(unit.key);
            return (
              <div key={unit.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: colors.muted, borderRadius: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{unit.icon}</span>
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>{unit.label}</span>
                </div>
                <button
                  onClick={() => {
                    let nextUnits: string[];
                    if (isDisabled) {
                      nextUnits = disabledUnits.filter((u) => u !== unit.key);
                    } else {
                      if (disabledUnits.length >= 2) {
                        alert("Kamida bitta o'lchov birligi faol qolishi shart!");
                        return;
                      }
                      nextUnits = [...disabledUnits, unit.key];
                    }
                    setDisabledUnits(nextUnits);
                    const next = { ...settings, disabledUnits: nextUnits };
                    saveSettings(next);
                  }}
                  className="btn-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    borderColor: isDisabled ? colors.border : colors.success,
                    backgroundColor: isDisabled ? "transparent" : "rgba(46, 125, 50, 0.1)",
                    color: isDisabled ? colors.mutedForeground : colors.success,
                    fontWeight: 600,
                  }}
                >
                  {isDisabled ? "O'chirilgan" : "Faol"}
                </button>
              </div>
            );
          })}
        </div>
      </SectionCard>
      )}

      {/* Biz haqimizda Section */}
      <SectionCard title="Biz haqimizda" icon="info" colors={colors}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: "1.6" }}>
          <div>
            <span style={{ fontWeight: 600, color: colors.mutedForeground }}>Administrator tel:</span>
            <div style={{ marginTop: "4px" }}>
              <a href="tel:+998934831289" style={{ fontSize: "15px", fontWeight: 700, color: colors.primary, display: "block", marginBottom: "4px" }}>+998 93 483 12 89</a>
              <a href="tel:+998946893515" style={{ fontSize: "15px", fontWeight: 700, color: colors.primary, display: "block" }}>+998 94 689 35 15</a>
            </div>
          </div>
          <div style={{
            borderTop: `1px solid ${colors.border}`,
            paddingTop: "12px",
            marginTop: "6px",
            fontSize: "16px",
            fontWeight: 700,
            color: colors.foreground,
            lineHeight: "1.4"
          }}>
            Dastur yaratuvchisi: Azizbek Asqarov
          </div>
        </div>
      </SectionCard>

      {/* App Version Section */}
      <SectionCard title="Ilova versiyasi" icon="info_outline" colors={colors}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
          <span className="text-muted">Joriy versiya:</span>
          <span style={{ fontWeight: 700, fontFamily: "monospace", color: colors.primary }}>v1.0.0 (Veb-versiya)</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", marginTop: "4px" }}>
          <span className="text-muted">Oxirgi yangilanish:</span>
          <span>13.06.2026</span>
        </div>
      </SectionCard>

      {/* 7. Manager Store info & Credentials */}
      {isManager && (
        <SectionCard title="Hisob ma'lumotlari" icon="manage_accounts" colors={colors}>
        <div>
          <span className="text-muted" style={{ fontSize: "11px" }}>Roli:</span>
          <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "capitalize" }}>{role}</div>
        </div>
        {isManager ? (
          <>
            <div>
              <span className="text-muted" style={{ fontSize: "11px" }}>Do'kon ID raqami (Worker login uchun):</span>
              <div style={{ fontSize: "14px", fontWeight: 700, color: colors.primary, fontFamily: "monospace" }}>{managerStoreId}</div>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: "11px" }}>Menejer Logini:</span>
              <div style={{ fontSize: "13px", fontWeight: 700 }}>{managerLogin}</div>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: "11px" }}>Menejer Paroli:</span>
              <div style={{ fontSize: "14px", fontWeight: 700, color: colors.primary, fontFamily: "monospace" }}>{password || "—"}</div>
            </div>
          </>
        ) : (
          <div>
            <span className="text-muted" style={{ fontSize: "11px" }}>Boshliq Store ID:</span>
            <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "monospace" }}>{managerStoreId}</div>
          </div>
        )}
      </SectionCard>
      )}

      {/* Logout button */}
      <button className="btn-primary" onClick={logout} style={{ width: "100%", padding: "12px", gap: "8px", backgroundColor: "#374151", borderColor: "#374151" }}>
        <span className="material-icons">logout</span>
        <span>Hisobdan chiqish</span>
      </button>

      {/* Delete account section (Manager only) */}
      {isManager && (
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "20px", marginTop: "10px" }}>
          <h4 style={{ fontSize: "14px", color: colors.destructive, fontWeight: 600 }}>Tizimdan butunlay o'chib ketish</h4>
          <p className="text-muted" style={{ fontSize: "11px", marginTop: "4px", lineHeight: "1.4" }}>
            Menejer hisobi va unga tegishli barcha do'kon tovarlari, ishchilar, savdo tarixi va mijozlar ma'lumotlari serverdan butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.
          </p>
          <button
            className="btn-primary"
            onClick={() => { setDeleteAccountError(null); setDeleteAccountModal(true); }}
            style={{ width: "100%", padding: "10px", marginTop: "12px", backgroundColor: colors.destructive, borderColor: colors.destructive }}
          >
            Hisobni o'chirish
          </button>
        </div>
      )}

      {/* Seller Add/Edit Modal */}
      {sellerModal && (
        <div className="modal-backdrop" onClick={() => setSellerModal(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <h3 style={{ fontSize: "17px", marginBottom: "14px" }}>
              {editingSeller ? "Sotuvchini tahrirlash" : "Yangi sotuvchi qo'shish"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>Sotuvchi ismi *</label>
                <input type="text" className="input-field" value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="F.I.Sh..." autoFocus />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>Telefon raqami *</label>
                <input type="tel" className="input-field" value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} placeholder="Masalan: +998 90 123 45 67" />
              </div>

              {sellerError && <div style={{ color: colors.destructive, fontSize: "12px" }}>{sellerError}</div>}

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button className="btn-secondary" onClick={() => setSellerModal(false)} style={{ flex: 1 }}>Bekor qilish</button>
                <button className="btn-primary" onClick={handleSaveSeller} style={{ flex: 1 }}>Saqlash</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seller Delete Confirm Modal */}
      {deleteSellerConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteSellerConfirm(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Sotuvchini o'chirish</h3>
            <p style={{ fontSize: "13px", lineHeight: "1.4" }}>
              Haqiqatdan ham sotuvchi <strong>"{deleteSellerConfirm.name}"</strong>ni ro'yxatdan o'chirasizmi?
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button className="btn-secondary" onClick={() => setDeleteSellerConfirm(null)} style={{ flex: 1 }}>Yo'q</button>
              <button className="btn-primary" onClick={handleConfirmDeleteSeller} style={{ flex: 1, backgroundColor: colors.destructive, borderColor: colors.destructive }}>Ha, o'chirilsin</button>
            </div>
          </div>
        </div>
      )}

      {/* Worker Remove Confirm Modal */}
      {removeWorkerConfirm && (
        <div className="modal-backdrop" onClick={() => !removingWorker && setRemoveWorkerConfirm(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Ishchini tizimdan o'chirish</h3>
            <p style={{ fontSize: "13px", lineHeight: "1.4" }}>
              Haqiqatdan ham ishchi <strong>"{removeWorkerConfirm.name}"</strong>ni o'chirib tashlaysizmi? U do'kon hisobiga boshqa kira olmaydi.
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button className="btn-secondary" onClick={() => setRemoveWorkerConfirm(null)} disabled={removingWorker} style={{ flex: 1 }}>Bekor</button>
              <button className="btn-primary" onClick={() => removeWorker({ id: removeWorkerConfirm.id })} disabled={removingWorker} style={{ flex: 1, backgroundColor: colors.destructive, borderColor: colors.destructive }}>
                {removingWorker ? "O'chirilmoqda..." : "Ha, o'chirilsin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteAccountModal && (
        <div className="modal-backdrop" onClick={() => !deletingAccount && setDeleteAccountModal(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
              <span className="material-icons" style={{ color: colors.destructive }}>warning</span>
              <h3 style={{ fontSize: "17px", color: colors.destructive }}>Hisobni butunlay o'chirish</h3>
            </div>
            <p style={{ fontSize: "13.5px", lineHeight: "1.5" }}>
              Ushbu do'kon va unga biriktirilgan barcha ma'lumotlar, shu jumladan savdolar, ishchilar arizalari va tovarlar zaxiralari serverdan butunlay o'chib ketadi.
              <br />
              <strong style={{ color: colors.destructive }}>Bu amalni mutlaqo ortga qaytarib bo'lmaydi!</strong>
            </p>

            {deleteAccountError && (
              <div style={{ backgroundColor: "#FEE2E2", color: "#EF4444", padding: "8px", borderRadius: "8px", fontSize: "12px", marginTop: "8px" }}>
                {deleteAccountError}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button className="btn-secondary" onClick={() => setDeleteAccountModal(false)} disabled={deletingAccount} style={{ flex: 1 }}>
                Bekor qilish
              </button>
              <button className="btn-primary" onClick={handleDeleteAccountConfirm} disabled={deletingAccount} style={{ flex: 1, backgroundColor: colors.destructive, borderColor: colors.destructive }}>
                {deletingAccount ? "O'chirilmoqda..." : "Ha, o'chirilsin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
