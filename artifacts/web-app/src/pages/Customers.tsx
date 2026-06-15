import React, { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCustomers,
  useCreateCustomer,
  getGetCustomersQueryKey,
  getGetDashboardStatsQueryKey,
  type Customer,
  type CreateCustomer,
} from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { useColors } from "../hooks/useColors";
import { SubscriptionLockScreen } from "../components/SubscriptionLockScreen";
import { useTranslation } from "../contexts/LanguageContext";

function formatMoney(n: number) {
  return n.toLocaleString("uz-UZ") + " UZS";
}

function formatCustomerPhone(text: string): string {
  if (text.length < 5) {
    return "+998 ";
  }
  const mainDigits = text.slice(5).replace(/\D/g, "");
  const code = mainDigits.slice(0, 2);
  const part1 = mainDigits.slice(2, 5);
  const part2 = mainDigits.slice(5, 7);
  const part3 = mainDigits.slice(7, 9);
  
  let formatted = "+998 ";
  if (code.length > 0) formatted += code;
  if (part1.length > 0) formatted += " " + part1;
  if (part2.length > 0) formatted += " " + part2;
  if (part3.length > 0) formatted += " " + part3;
  
  return formatted;
}

function formatOldestDebtDate(isoDate: string, t: (k: string) => string): string {
  const d = new Date(isoDate);
  const formattedDate = d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
  const diffTime = Math.abs(new Date().getTime() - d.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t("Bugun");
  return `${formattedDate} (${diffDays} kun oldin)`;
}

function getDebtStatus(customer: Customer): "ok" | "warning" | "over" {
  if (customer.totalDebt === 0) return "ok";
  if (customer.debtLimit <= 0) return "warning";
  if (customer.totalDebt >= customer.debtLimit) return "over";
  if (customer.totalDebt >= customer.debtLimit * 0.8) return "warning";
  return "warning";
}

function CustomerCard({
  customer,
  colors,
  onClick,
}: {
  customer: Customer;
  colors: ReturnType<typeof useColors>;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const status = getDebtStatus(customer);
  const statusColor = status === "over" ? "#DC2626" : status === "warning" ? "#D97706" : colors.success;

  return (
    <div
      onClick={onClick}
      className="card-standard"
      style={{
        display: "flex",
        alignItems: "center",
        padding: "16px",
        gap: "14px",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
        borderLeft: customer.totalDebt > 0 ? `4px solid ${statusColor}` : `1px solid ${colors.border}`
      }}
    >
      {/* Avatar / Photo */}
      <div style={{ flexShrink: 0 }}>
        {customer.imageUrl ? (
          <img
            src={customer.imageUrl}
            alt={customer.name}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              objectFit: "cover",
              border: `1px solid ${colors.border}`
            }}
          />
        ) : (
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: `${colors.primary}18`,
            color: colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "16px"
          }}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
        <h4 style={{ fontSize: "15px", fontWeight: 600, color: colors.foreground, margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
          {customer.name}
        </h4>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: colors.mutedForeground }}>
          <span className="material-icons" style={{ fontSize: "13px" }}>phone</span>
          <span>{customer.phone}</span>
        </div>
        {customer.address && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: colors.mutedForeground }}>
            <span className="material-icons" style={{ fontSize: "13px" }}>location_on</span>
            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{customer.address}</span>
          </div>
        )}
        {customer.note && (
          <div style={{ fontSize: "11px", fontStyle: "italic", color: colors.mutedForeground }}>
            "{customer.note}"
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", minWidth: "100px", flexShrink: 0 }}>
        {customer.totalDebt > 0 ? (
          <>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 700,
              backgroundColor: `${statusColor}18`,
              color: statusColor,
              padding: "2px 6px",
              borderRadius: "6px"
            }}>
              <span className="material-icons" style={{ fontSize: "11px" }}>
                {status === "over" ? "warning" : "account_balance_wallet"}
              </span>
              <span>{status === "over" ? t("LIMIT!") : t("QARZ")}</span>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: statusColor }}>
              {formatMoney(customer.totalDebt)}
            </span>
            {customer.debtLimit > 0 && (
              <span style={{ fontSize: "10px", color: colors.mutedForeground }}>
                Limit: {formatMoney(customer.debtLimit)}
              </span>
            )}
            {customer.oldestDebtDate && (
              <span style={{ fontSize: "10px", color: colors.mutedForeground, textAlign: "right", marginTop: "2px" }}>
                ⏳ {formatOldestDebtDate(customer.oldestDebtDate, t)}
              </span>
            )}
          </>
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: `rgba(16, 185, 129, 0.15)`,
            color: colors.success,
            padding: "3px 8px",
            borderRadius: "6px"
          }}>
            <span className="material-icons" style={{ fontSize: "13px" }}>check_circle</span>
            <span>{t("Qarz yo'q")}</span>
          </div>
        )}
        <span className="material-icons" style={{ color: colors.mutedForeground, fontSize: "18px", marginTop: "4px" }}>chevron_right</span>
      </div>
    </div>
  );
}

function CustomersScreenInner() {
  const { t } = useTranslation();
  const colors = useColors();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("+998 ");
  const [formAddress, setFormAddress] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formTelegramId, setFormTelegramId] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "debtors">("all");
  const [sortBy, setSortBy] = useState<"debt-desc" | "debt-asc" | "date-new" | "date-old" | "age-desc" | "age-asc">("debt-desc");

  const { data: customers, isLoading, refetch } = useGetCustomers();

  const { mutate: createCustomer, isPending: creating } = useCreateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setAddOpen(false);
        resetForm();
      },
      onError: (err: any) => {
        setFormError(err.message || t("Mijoz qo'shishda xatolik yuz berdi"));
      },
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormPhone("+998 ");
    setFormAddress("");
    setFormLimit("");
    setFormNote("");
    setFormTelegramId("");
    setFormImage(null);
    setFormError(null);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    setFormError(null);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/upload/product-image", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(t("Rasm yuklash xatoligi:") + ` ${response.status}`);
      }

      const data = await response.json();
      setFormImage(data.url);
    } catch (err: any) {
      setFormError(err.message || t("Rasmni yuklashda xatolik yuz berdi"));
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = () => {
    setFormError(null);
    if (!formName.trim()) {
      setFormError(t("Mijoz ismi kiritilishi shart"));
      return;
    }
    const cleanPhone = formPhone.replace(/[\s+]/g, "");
    if (cleanPhone.length !== 12 || !cleanPhone.startsWith("998")) {
      setFormError(t("Telefon raqami noto'g'ri (998xxxxxxxxx shaklida bo'lishi shart)"));
      return;
    }
    const limit = formLimit ? parseFloat(formLimit.replace(/\s/g, "")) : 0;
    
    const data: CreateCustomer = {
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim() || undefined,
      debtLimit: isNaN(limit) ? 0 : limit,
      note: formNote.trim() || undefined,
      imageUrl: formImage || undefined,
      telegramId: formTelegramId.trim() || undefined,
    } as any;

    createCustomer({ data });
  };

  const filtered = (customers ?? [])
    .filter((c) => {
      // Tab filter
      if (tab === "debtors" && c.totalDebt <= 0) return false;

      // Search filter
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.note ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (tab === "debtors") {
        if (sortBy === "debt-desc") return b.totalDebt - a.totalDebt;
        if (sortBy === "debt-asc") return a.totalDebt - b.totalDebt;
        if (sortBy === "age-desc") {
          const dateA = a.oldestDebtDate ? new Date(a.oldestDebtDate).getTime() : Infinity;
          const dateB = b.oldestDebtDate ? new Date(b.oldestDebtDate).getTime() : Infinity;
          return dateA - dateB;
        }
        if (sortBy === "age-asc") {
          const dateA = a.oldestDebtDate ? new Date(a.oldestDebtDate).getTime() : 0;
          const dateB = b.oldestDebtDate ? new Date(b.oldestDebtDate).getTime() : 0;
          return dateB - dateA;
        }
        if (sortBy === "date-new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === "date-old") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });

  const totalDebt = (customers ?? []).reduce((s, c) => s + c.totalDebt, 0);
  const debtorsCount = (customers ?? []).filter((c) => c.totalDebt > 0).length;

  return (
    <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", color: colors.foreground }}>{t("Mijozlar")}</h2>
          <p className="text-muted" style={{ fontSize: "12px", marginTop: "2px" }}>
            {t("Haridorlar hisobi va qarz limitsiyasi boshqaruvi")}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { resetForm(); setAddOpen(true); }}
          style={{ padding: "10px 14px", borderRadius: "12px", gap: "6px" }}
        >
          <span className="material-icons">person_add</span>
          <span>{t("Yangi mijoz")}</span>
        </button>
      </div>

      {/* Stats row */}
      {(customers?.length ?? 0) > 0 && (
        <div className="card-standard" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center", padding: "12px" }}>
          <div onClick={() => setTab("all")} style={{ cursor: "pointer", padding: "4px", borderRadius: "8px", backgroundColor: tab === "all" ? `${colors.primary}12` : "transparent", transition: "background-color 0.2s" }}>
            <span style={{ fontSize: "10px", color: colors.mutedForeground, display: "block" }}>{t("Jami mijozlar")}</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: tab === "all" ? colors.primary : colors.foreground }}>{customers?.length ?? 0} {t("ta")}</span>
          </div>
          <div onClick={() => setTab("debtors")} style={{ cursor: "pointer", padding: "4px", borderRadius: "8px", backgroundColor: tab === "debtors" ? `${colors.primary}12` : "transparent", transition: "background-color 0.2s", borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
            <span style={{ fontSize: "10px", color: colors.mutedForeground, display: "block" }}>{t("Qarzdorlar")}</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: tab === "debtors" ? colors.primary : debtorsCount > 0 ? "#D97706" : colors.foreground }}>{debtorsCount} {t("ta")}</span>
          </div>
          <div style={{ padding: "4px" }}>
            <span style={{ fontSize: "10px", color: colors.mutedForeground, display: "block" }}>{t("Jami qarz")}</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: totalDebt > 0 ? "#DC2626" : colors.foreground }}>{formatMoney(totalDebt)}</span>
          </div>
        </div>
      )}

      {/* Sub-tabs for All / Debtors */}
      <div style={{ display: "flex", gap: "8px", backgroundColor: colors.muted + "20", padding: "4px", borderRadius: "12px", border: `1px solid ${colors.border}` }}>
        <button
          onClick={() => setTab("all")}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: tab === "all" ? colors.primary : "transparent",
            color: tab === "all" ? "white" : colors.mutedForeground,
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          {t("Barchasi")}
        </button>
        <button
          onClick={() => setTab("debtors")}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: tab === "debtors" ? colors.primary : "transparent",
            color: tab === "debtors" ? "white" : colors.mutedForeground,
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          <span>{t("Qarzdorlar")}</span>
          {debtorsCount > 0 && (
            <span style={{
              backgroundColor: tab === "debtors" ? "white" : "#DC2626",
              color: tab === "debtors" ? colors.primary : "white",
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "8px",
              fontWeight: 700
            }}>
              {debtorsCount}
            </span>
          )}
        </button>
      </div>

      {/* Search & Sort Row */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span className="material-icons" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: colors.mutedForeground }}>search</span>
          <input
            type="text"
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Mijoz ismi yoki telefon raqami bo'yicha...")}
            style={{ paddingLeft: "45px" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: colors.mutedForeground, cursor: "pointer" }}
            >
              <span className="material-icons" style={{ fontSize: "18px" }}>close</span>
            </button>
          )}
        </div>
        
        {tab === "debtors" && (
          <div style={{ position: "relative", minWidth: "150px" }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-field"
              style={{
                paddingRight: "10px",
                fontSize: "13px",
                height: "44px",
                backgroundColor: colors.card,
                cursor: "pointer"
              }}
            >
              <option value="debt-desc">💰 {t("Qarz: kamayish")}</option>
              <option value="debt-asc">💰 {t("Qarz: o'sish")}</option>
              <option value="age-desc">⏳ {t("Muddati: eski qarzlar")}</option>
              <option value="age-asc">⏳ {t("Muddati: yangi qarzlar")}</option>
              <option value="date-new">📅 {t("Sana: yangi")}</option>
              <option value="date-old">📅 {t("Sana: eski")}</option>
            </select>
          </div>
        )}
      </div>

      {/* List / Loader */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px", gap: "12px" }}>
          <div className="spinner" style={{ width: "30px", height: "30px", border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
          <span style={{ fontSize: "13px", color: colors.mutedForeground }}>{t("Mijozlar yuklanmoqda...")}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-standard" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "45px 20px", textAlign: "center", gap: "10px" }}>
          <span className="material-icons" style={{ fontSize: "48px", color: colors.border }}>
            {tab === "debtors" ? "check_circle" : "people"}
          </span>
          <div>
            <h4 style={{ fontSize: "15px", color: colors.foreground }}>
              {tab === "debtors" ? t("Qarzdorlar yo'q") : t("Hech kim topilmadi")}
            </h4>
            <p className="text-muted" style={{ fontSize: "12px", marginTop: "4px" }}>
              {search 
                ? `"${search}" ` + t("so'rovi bo'yicha mijoz yo'q") 
                : tab === "debtors" 
                  ? t("Hozirgi vaqtda qarzdor mijozlar mavjud emas") 
                  : t("Tizimda hozircha mijozlar mavjud emas")}
            </p>
          </div>
          {!search && tab !== "debtors" && (
            <button className="btn-primary" onClick={() => setAddOpen(true)} style={{ marginTop: "6px" }}>
              {t("Mijoz qo'shish")}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              colors={colors}
              onClick={() => setLocation(`/customer-detail?id=${customer.id}`)}
            />
          ))}
        </div>
      )}

      {/* Add Customer Dialog Modal */}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => !creating && setAddOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90%", overflowY: "auto" }}>
            <div className="sheet-handle"></div>
            
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
              <span className="material-icons" style={{ color: colors.primary, fontSize: "24px" }}>person_add</span>
              <h3 style={{ fontSize: "18px", color: colors.foreground }}>{t("Yangi mijoz qo'shish")}</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Profile Image upload */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div style={{ position: "relative", width: "90px", height: "90px" }}>
                  {formImage ? (
                    <img
                      src={formImage}
                      alt="Avatar Preview"
                      style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${colors.primary}` }}
                    />
                  ) : (
                    <div style={{
                      width: "90px",
                      height: "90px",
                      borderRadius: "50%",
                      border: `2px dashed ${colors.border}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.muted,
                      color: colors.primary
                    }}>
                      {imageUploading ? (
                        <div className="spinner" style={{ width: "18px", height: "18px", border: `2px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                      ) : (
                        <>
                          <span className="material-icons" style={{ fontSize: "26px" }}>photo_camera</span>
                          <span style={{ fontSize: "10px", marginTop: "2px", fontWeight: 600 }}>{t("Rasm yuklash")}</span>
                        </>
                      )}
                    </div>
                  )}

                  {formImage && (
                    <button
                      type="button"
                      onClick={() => setFormImage(null)}
                      style={{
                        position: "absolute",
                        bottom: "0",
                        right: "0",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: colors.destructive,
                        border: "2px solid white",
                        color: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: "14px" }}>close</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  id="customer-avatar-file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={imageUploading}
                  onClick={() => document.getElementById("customer-avatar-file")?.click()}
                  style={{ fontSize: "11px", padding: "6px 12px", borderRadius: "8px" }}
                >
                  {t("Rasm tanlash")}
                </button>
              </div>

              {/* Form Input fields */}
              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  {t("To'liq ism")} *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("Mijoz F.I.Sh...")}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  {t("Telefon raqami")} *
                </label>
                <input
                  type="tel"
                  className="input-field"
                  value={formPhone}
                  onChange={(e) => setFormPhone(formatCustomerPhone(e.target.value))}
                  placeholder="998 xx xxx xx xx"
                  maxLength={17}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  {t("Telegram ID raqami")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formTelegramId}
                  onChange={(e) => setFormTelegramId(e.target.value.replace(/\D/g, ""))}
                  placeholder={`${t("Masalan:")} 123456789`}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  {t("Yashash joyi (Manzil)")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder={t("Shahar, ko'cha, uy raqami...")}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  {t("Qarz limiti (UZS)")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formLimit}
                  onChange={(e) => setFormLimit(e.target.value.replace(/\D/g, ""))}
                  placeholder={t("0 = limitsiz qarz")}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  {t("Izoh / Eslatma")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder={t("Mijoz haqida qo'shimcha ma'lumot...")}
                />
              </div>

              {formError && (
                <div style={{ backgroundColor: "#FEE2E2", color: "#EF4444", padding: "10px", borderRadius: "10px", fontSize: "13px", display: "flex", gap: "6px", alignItems: "center" }}>
                  <span className="material-icons" style={{ fontSize: "16px" }}>error_outline</span>
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  className="btn-secondary"
                  onClick={() => { setAddOpen(false); resetForm(); }}
                  style={{ flex: 1 }}
                  disabled={creating}
                >
                  {t("Bekor qilish")}
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  style={{ flex: 1 }}
                  disabled={creating}
                >
                  {creating ? t("Saqlanmoqda...") : t("Saqlash")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Customers() {
  const { subscriptionActive } = useAuth();
  const { t } = useTranslation();
  if (!subscriptionActive) return <SubscriptionLockScreen screenName={t("Mijozlar")} />;
  return <CustomersScreenInner />;
}
