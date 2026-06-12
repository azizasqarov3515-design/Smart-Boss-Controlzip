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
  const status = getDebtStatus(customer);
  const statusColor = status === "over" ? "#DC2626" : status === "warning" ? "#D97706" : colors.success;

  return (
    <div
      className="card-standard"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer",
        padding: "14px"
      }}
    >
      <div style={{
        width: "46px",
        height: "46px",
        borderRadius: "50%",
        border: customer.imageUrl ? `2px solid ${colors.primary}` : "none",
        padding: customer.imageUrl ? "2px" : "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }}>
        {customer.imageUrl ? (
          <img
            src={customer.imageUrl}
            alt={customer.name}
            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", backgroundColor: colors.muted }}
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
              <span>{status === "over" ? "LIMIT!" : "QARZ"}</span>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: statusColor }}>
              {formatMoney(customer.totalDebt)}
            </span>
            {customer.debtLimit > 0 && (
              <span style={{ fontSize: "10px", color: colors.mutedForeground }}>
                Limit: {formatMoney(customer.debtLimit)}
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
            <span>Qarz yo'q</span>
          </div>
        )}
        <span className="material-icons" style={{ color: colors.mutedForeground, fontSize: "18px", marginTop: "4px" }}>chevron_right</span>
      </div>
    </div>
  );
}

function CustomersScreenInner() {
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
        setFormError(err.message || "Mijoz qo'shishda xatolik yuz berdi");
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
        throw new Error(`Rasm yuklash xatoligi: ${response.status}`);
      }

      const data = await response.json();
      setFormImage(data.url);
    } catch (err: any) {
      setFormError(err.message || "Rasmni yuklashda xatolik yuz berdi");
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = () => {
    setFormError(null);
    if (!formName.trim()) {
      setFormError("Mijoz ismi kiritilishi shart");
      return;
    }
    const cleanPhone = formPhone.replace(/[\s+]/g, "");
    if (cleanPhone.length !== 12 || !cleanPhone.startsWith("998")) {
      setFormError("Telefon raqami noto'g'ri (998xxxxxxxxx shaklida bo'lishi shart)");
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

  const filtered = (customers ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.note ?? "").toLowerCase().includes(q)
    );
  });

  const totalDebt = (customers ?? []).reduce((s, c) => s + c.totalDebt, 0);
  const debtorsCount = (customers ?? []).filter((c) => c.totalDebt > 0).length;

  return (
    <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", color: colors.foreground }}>Mijozlar</h2>
          <p className="text-muted" style={{ fontSize: "12px", marginTop: "2px" }}>
            Haridorlar hisobi va qarz limitsiyasi boshqaruvi
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { resetForm(); setAddOpen(true); }}
          style={{ padding: "10px 14px", borderRadius: "12px", gap: "6px" }}
        >
          <span className="material-icons">person_add</span>
          <span>Yangi mijoz</span>
        </button>
      </div>

      {/* Stats row */}
      {(customers?.length ?? 0) > 0 && (
        <div className="card-standard" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center", padding: "12px" }}>
          <div>
            <span style={{ fontSize: "10px", color: colors.mutedForeground, display: "block" }}>Jami mijozlar</span>
            <span style={{ fontSize: "15px", fontWeight: 700 }}>{customers?.length ?? 0} ta</span>
          </div>
          <div style={{ borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
            <span style={{ fontSize: "10px", color: colors.mutedForeground, display: "block" }}>Qarzdorlar</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: debtorsCount > 0 ? "#D97706" : colors.foreground }}>{debtorsCount} ta</span>
          </div>
          <div>
            <span style={{ fontSize: "10px", color: colors.mutedForeground, display: "block" }}>Jami qarz</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: totalDebt > 0 ? "#DC2626" : colors.foreground }}>{formatMoney(totalDebt)}</span>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div style={{ position: "relative" }}>
        <span className="material-icons" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: colors.mutedForeground }}>search</span>
        <input
          type="text"
          className="input-field"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mijoz ismi yoki telefon raqami bo'yicha..."
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

      {/* List / Loader */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px", gap: "12px" }}>
          <div className="spinner" style={{ width: "30px", height: "30px", border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
          <span style={{ fontSize: "13px", color: colors.mutedForeground }}>Mijozlar yuklanmoqda...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-standard" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "45px 20px", textAlign: "center", gap: "10px" }}>
          <span className="material-icons" style={{ fontSize: "48px", color: colors.border }}>people</span>
          <div>
            <h4 style={{ fontSize: "15px", color: colors.foreground }}>Hech kim topilmadi</h4>
            <p className="text-muted" style={{ fontSize: "12px", marginTop: "4px" }}>
              {search ? `"${search}" so'rovi bo'yicha mijoz yo'q` : "Tizimda hozircha mijozlar mavjud emas"}
            </p>
          </div>
          {!search && (
            <button className="btn-primary" onClick={() => setAddOpen(true)} style={{ marginTop: "6px" }}>
              Mijoz qo'shish
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
              <h3 style={{ fontSize: "18px", color: colors.foreground }}>Yangi mijoz qo'shish</h3>
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
                          <span style={{ fontSize: "10px", marginTop: "2px", fontWeight: 600 }}>Rasm yuklash</span>
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
                  Rasm tanlash
                </button>
              </div>

              {/* Form Input fields */}
              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  To'liq ism *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Mijoz F.I.Sh..."
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  Telefon raqami *
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
                  Telegram ID raqami
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formTelegramId}
                  onChange={(e) => setFormTelegramId(e.target.value.replace(/\D/g, ""))}
                  placeholder="Masalan: 123456789"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  Yashash joyi (Manzil)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Shahar, ko'cha, uy raqami..."
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  Qarz limiti (UZS)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formLimit}
                  onChange={(e) => setFormLimit(e.target.value.replace(/\D/g, ""))}
                  placeholder="0 = limitsiz qarz"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
                  Izoh / Eslatma
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Mijoz haqida qo'shimcha ma'lumot..."
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
                  Bekor qilish
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  style={{ flex: 1 }}
                  disabled={creating}
                >
                  {creating ? "Saqlanmoqda..." : "Saqlash"}
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
  if (!subscriptionActive) return <SubscriptionLockScreen screenName="Mijozlar" />;
  return <CustomersScreenInner />;
}
