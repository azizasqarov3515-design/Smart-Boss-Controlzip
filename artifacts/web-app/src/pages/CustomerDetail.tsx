import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCustomer,
  useGetCustomerPayments,
  useGetCustomerStatement,
  useCreateCustomerPayment,
  useUpdateCustomer,
  useDeleteCustomer,
  useCreateCustomerDeleteRequest,
  useGetWorkerDeleteRequests,
  getGetCustomersQueryKey,
  getGetCustomerQueryKey,
  getGetCustomerPaymentsQueryKey,
  getGetCustomerStatementQueryKey,
  getGetDashboardStatsQueryKey,
  type Customer,
  type CustomerStatement,
} from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { useColors } from "../hooks/useColors";
import { useSettings } from "../hooks/useSettings";
import { SubscriptionLockScreen } from "../components/SubscriptionLockScreen";
import { printDoc } from "../utils/PrintService";
import { useTranslation } from "../contexts/LanguageContext";

function formatMoney(n: number) {
  return n.toLocaleString("uz-UZ") + " UZS";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildStatementHtml(
  stmt: CustomerStatement,
  t: (text: string) => string,
  storeName = "SMARTBOSScontrol",
  sellerName = "",
  sellerPhone = "",
  storeAddress = ""
): string {
  const { customer, sales, payments } = stmt;
  const debtSales = sales.filter((s) => s.paymentType === "debt");

  const salesRows = debtSales
    .map(
      (s) => `
      <tr>
        <td>${formatDate(s.createdAt)}</td>
        <td>${s.itemCount} ${t("ta tovar")}</td>
        <td style="color:#DC2626;font-weight:600">+${formatMoney(s.debtAmount ?? s.totalAmount)}</td>
        <td style="color:#10B981">${formatMoney(s.paidAmount ?? 0)}</td>
      </tr>`
    )
    .join("");

  const paymentRows = payments
    .map(
      (p) => `
      <tr>
        <td>${formatDate(p.createdAt)}</td>
        <td>${p.note || "—"}</td>
        <td style="color:#10B981;font-weight:600">-${formatMoney(p.amount)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${t("Qarz ko'chirmasi")} — ${customer.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; padding: 30px; color: #111; max-width: 650px; margin: 0 auto; }
    h1 { font-size: 20px; margin-bottom: 4px; color: #1E3A8A; }
    .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; border-bottom: 2px solid #1E3A8A; padding-bottom: 6px; }
    .info-box { background: #F3F4F6; border-radius: 8px; padding: 14px; margin-bottom: 20px; border: 1px solid #E5E7EB; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .info-label { color: #555; }
    .info-val { font-weight: bold; }
    .debt-total { font-size: 22px; font-weight: bold; color: #DC2626; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #E5E7EB; padding: 8px 10px; text-align: left; font-size: 11px; color: #374151; font-weight: 600; border: 1px solid #D1D5DB; }
    td { padding: 8px 10px; border: 1px solid #E5E7EB; }
    h2 { font-size: 14px; margin-top: 20px; margin-bottom: 8px; color: #1E3A8A; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
    .footer { margin-top: 30px; color: #9CA3AF; font-size: 11px; text-align: center; border-top: 1px dashed #CBD5E1; padding-top: 10px; }
    @media print {
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  <h1>${t("QARZ KO'CHIRMASI")}</h1>
  <p class="subtitle">${t("Sana:")} ${new Date().toLocaleDateString("uz-UZ")}</p>

  <div class="info-box">
    <div class="info-row"><span class="info-label">${t("Mijoz F.I.Sh")}:</span><span class="info-val">${customer.name}</span></div>
    <div class="info-row"><span class="info-label">${t("Telefon raqami")}:</span><span class="info-val">${customer.phone}</span></div>
    ${customer.debtLimit > 0 ? `<div class="info-row"><span class="info-label">${t("Qarz limiti")}:</span><span class="info-val">${formatMoney(customer.debtLimit)}</span></div>` : ""}
    <div class="info-row" style="margin-top: 8px; border-top: 1px solid #E5E7EB; padding-top: 6px;"><span class="info-label" style="font-weight: 600;">${t("Mijoz joriy qarzi")}:</span><span class="debt-total">${formatMoney(customer.totalDebt)}</span></div>
  </div>

  ${debtSales.length > 0 ? `
  <h2>${t("Nasiyaga olingan savdolar")}</h2>
  <table>
    <thead>
      <tr>
        <th>${t("Sotilgan sana")}</th>
        <th>${t("Tovarlar miqdori")}</th>
        <th>${t("Qarz summasi")}</th>
        <th>${t("To'langan qism")}</th>
      </tr>
    </thead>
    <tbody>${salesRows}</tbody>
  </table>
  ` : ""}

  ${payments && payments.length > 0 ? `
  <h2>${t("Qarz to'lovlari tarixi")}</h2>
  <table>
    <thead>
      <tr>
        <th>${t("To'lov sanasi")}</th>
        <th>${t("To'lov turi / Izoh")}</th>
        <th>${t("To'langan summa")}</th>
      </tr>
    </thead>
    <tbody>${paymentRows}</tbody>
  </table>
  ` : ""}

  <div style="margin-top: 24px; font-size: 11px; color: #6B7280;">
    ${storeAddress ? `<div>📍 Manzil: ${storeAddress}</div>` : ""}
    ${sellerName ? `<div>${t("Sotuvchi")}: ${sellerName}${sellerPhone ? ` · ${sellerPhone}` : ""}</div>` : ""}
  </div>

  <div class="footer">
    ${storeName} &mdash; ${t("Tizim orqali shakllantirildi")}
  </div>
</body>
</html>`;
}

function CustomerDetailScreenInner() {
  const colors = useColors();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { managerId, role } = useAuth();
  const isWorker = role === "worker";
  const { settings } = useSettings(managerId);
  const { t } = useTranslation();

  // Parse customer ID from query: /customer-detail?id=123
  const searchParams = new URLSearchParams(window.location.search);
  const idParam = searchParams.get("id");
  const customerId = idParam ? parseInt(idParam, 10) : 0;

  const [activeTab, setActiveTab] = useState<"sales" | "payments">("sales");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteRequestSent, setDeleteRequestSent] = useState(false);
  
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editTelegramId, setEditTelegramId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const { data: customer, isLoading: loadingCustomer, refetch } = useGetCustomer(customerId);
  const { data: statement, refetch: refetchStatement } = useGetCustomerStatement(customerId);
  const { data: payments, refetch: refetchPayments } = useGetCustomerPayments(customerId);
  
  const { data: myRequests } = useGetWorkerDeleteRequests({
    query: { enabled: isWorker, refetchInterval: 15000 } as any
  });

  const { mutate: createPayment, isPending: payingDebt } = useCreateCustomerPayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) });
        queryClient.invalidateQueries({ queryKey: getGetCustomerPaymentsQueryKey(customerId) });
        queryClient.invalidateQueries({ queryKey: getGetCustomerStatementQueryKey(customerId) });
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setPaymentOpen(false);
        setPayAmount("");
        setPayNote("");
        setPayError(null);
      },
      onError: (err: any) => {
        setPayError(err.message || t("To'lovni saqlashda xato yuz berdi"));
      },
    },
  });

  const { mutate: updateCustomer, isPending: updating } = useUpdateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) });
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        setEditOpen(false);
        setEditError(null);
      },
      onError: (err: any) => {
        setEditError(err.message || t("Mijoz ma'lumotlarini saqlashda xato"));
      },
    },
  });

  const { mutate: deleteCustomer, isPending: deleting } = useDeleteCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setLocation("/customers");
      },
      onError: (err: any) => {
        alert(err.message || t("O'chirishda xato yuz berdi"));
      },
    },
  });

  const { mutate: sendDeleteRequest, isPending: sendingRequest } = useCreateCustomerDeleteRequest({
    mutation: {
      onSuccess: () => {
        setDeleteRequestSent(true);
      },
      onError: (err: any) => {
        alert(err.message || t("O'chirish so'rovini yuborishda xato yuz berdi"));
      },
    },
  });

  const handlePayment = () => {
    setPayError(null);
    const amount = parseFloat(payAmount.replace(/\s/g, ""));
    if (isNaN(amount) || amount <= 0) {
      setPayError(t("To'g'ri to'lov summasini kiriting"));
      return;
    }
    createPayment({
      id: customerId,
      data: { amount, note: payNote.trim() || undefined },
    });
  };

  const handleDelete = () => {
    setDeleteRequestSent(false);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!customer) return;
    if (isWorker) {
      sendDeleteRequest({ data: { customerIds: [customerId], customerNames: [customer.name] } });
    } else {
      setDeleteConfirmOpen(false);
      deleteCustomer({ id: customerId });
    }
  };

  const handleEditOpen = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditAddress(customer.address ?? "");
    setEditLimit(customer.debtLimit > 0 ? String(customer.debtLimit) : "");
    setEditNote(customer.note ?? "");
    setEditTelegramId(customer.telegramId ?? "");
    setEditError(null);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    setEditError(null);
    if (!editName.trim()) { setEditError(t("Ism kiritilishi shart")); return; }
    if (!editPhone.trim()) { setEditError(t("Telefon kiritilishi shart")); return; }
    const limit = editLimit ? parseFloat(editLimit.replace(/\s/g, "")) : 0;
    updateCustomer({
      id: customerId,
      data: {
        name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim() || undefined,
        debtLimit: isNaN(limit) ? 0 : limit,
        note: editNote.trim() || undefined,
        telegramId: editTelegramId.trim() || null,
      },
    });
  };

  const handlePrintStatement = () => {
    if (!statement) return;
    const primarySeller = settings.sellers?.[0];
    const html = buildStatementHtml(
      statement,
      t,
      settings.storeName,
      primarySeller?.name ?? "",
      primarySeller?.phone ?? "",
      settings.storeAddress
    );
    printDoc(html);
  };

  if (loadingCustomer || !customer) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "12px", height: "80vh" }}>
        <div className="spinner" style={{ width: "30px", height: "30px", border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        <span style={{ fontSize: "14px", color: colors.mutedForeground }}>{t("Mijoz yuklanmoqda...")}</span>
      </div>
    );
  }

  const debtSales = (statement?.sales ?? []).filter((s) => s.paymentType === "debt");
  const isOverLimit = customer.debtLimit > 0 && customer.totalDebt >= customer.debtLimit;
  const isNearLimit = customer.debtLimit > 0 && customer.totalDebt >= customer.debtLimit * 0.8;
  const statusColor = isOverLimit ? "#DC2626" : isNearLimit ? "#D97706" : colors.success;

  const rejectedRequest = isWorker
    ? (myRequests ?? []).find(
        (r: any) =>
          r.type === "customer" &&
          r.status === "rejected" &&
          Array.isArray((r as any).customerIds) &&
          ((r as any).customerIds as number[]).includes(customerId)
      )
    : undefined;

  const pendingRequest = isWorker
    ? (myRequests ?? []).find(
        (r: any) =>
          r.type === "customer" &&
          r.status === "pending" &&
          Array.isArray((r as any).customerIds) &&
          ((r as any).customerIds as number[]).includes(customerId)
      )
    : undefined;

  return (
    <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          className="btn-secondary"
          onClick={() => setLocation("/customers")}
          style={{ padding: "8px 12px", gap: "6px" }}
        >
          <span className="material-icons" style={{ fontSize: "18px" }}>arrow_back</span>
          <span>{t("Orqaga")}</span>
        </button>
        
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className="btn-secondary"
            onClick={handleEditOpen}
            style={{ padding: "8px 10px" }}
          >
            <span className="material-icons" style={{ fontSize: "18px", color: colors.primary }}>edit</span>
          </button>
          <button
            className="btn-secondary"
            onClick={handleDelete}
            style={{ padding: "8px 10px", borderColor: "rgba(239, 68, 68, 0.2)" }}
          >
            <span className="material-icons" style={{ fontSize: "18px", color: colors.destructive }}>delete</span>
          </button>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="card-standard" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px" }}>
        <div style={{
          width: "60px",
          height: "60px",
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
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: `${colors.primary}18`,
              color: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "20px"
            }}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: colors.foreground, margin: 0 }}>
            {customer.name}
          </h3>
          <p className="text-muted" style={{ fontSize: "13px", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
            <span className="material-icons" style={{ fontSize: "14px" }}>phone</span>
            <span>{customer.phone}</span>
          </p>
          {customer.address && (
            <p className="text-muted" style={{ fontSize: "12px", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span className="material-icons" style={{ fontSize: "14px" }}>location_on</span>
              <span>{customer.address}</span>
            </p>
          )}
          {customer.telegramId && (
            <p className="text-muted" style={{ fontSize: "12px", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span className="material-icons" style={{ fontSize: "14px" }}>send</span>
              <span>Telegram ID: {customer.telegramId}</span>
            </p>
          )}
          {customer.note && (
            <p className="text-muted" style={{ fontSize: "12px", fontStyle: "italic", marginTop: "4px" }}>
              {t("Izoh:")} "{customer.note}"
            </p>
          )}
        </div>
      </div>

      {/* Delete notifications (Worker Only) */}
      {rejectedRequest && (
        <div style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", borderColor: colors.destructive, borderWidth: "1px", borderStyle: "solid", borderRadius: "12px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="material-icons" style={{ color: colors.destructive, fontSize: "18px" }}>cancel</span>
          <span style={{ fontSize: "12px", color: colors.destructive, fontWeight: 500 }}>
            {t("Tizim rahbari o'chirish so'rovingizni rad etdi.")}
          </span>
        </div>
      )}
      {pendingRequest && !rejectedRequest && (
        <div style={{ backgroundColor: "rgba(245, 158, 11, 0.08)", borderColor: "#D97706", borderWidth: "1px", borderStyle: "solid", borderRadius: "12px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="material-icons" style={{ color: "#D97706", fontSize: "18px" }}>hourglass_empty</span>
          <span style={{ fontSize: "12px", color: "#92400E", fontWeight: 500 }}>
            {t("O'chirish so'rovi rahbar tasdig'ini kutmoqda.")}
          </span>
        </div>
      )}

      {/* Debt Card */}
      <div className="card-standard" style={{
        backgroundColor: isOverLimit ? "rgba(239, 68, 68, 0.05)" : isNearLimit ? "rgba(245, 158, 11, 0.05)" : colors.card,
        borderColor: statusColor,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: "16px"
      }}>
        <div>
          <span style={{ fontSize: "11px", color: colors.mutedForeground, display: "block", textTransform: "uppercase", fontWeight: 600 }}>
            {isOverLimit ? t("LIMIT!") : isNearLimit ? t("Qarz limitiga yaqin") : t("Mijoz qarzdorligi")}
          </span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: statusColor, display: "block", marginTop: "4px" }}>
            {formatMoney(customer.totalDebt)}
          </span>
          {customer.debtLimit > 0 && (
            <span style={{ fontSize: "11px", color: colors.mutedForeground, display: "block", marginTop: "2px" }}>
              {t("Qarz limiti:")} {formatMoney(customer.debtLimit)}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {customer.totalDebt > 0 && (
            <button
              className="btn-success"
              onClick={() => { setPayAmount(""); setPayNote(""); setPayError(null); setPaymentOpen(true); }}
              style={{ flex: 1, gap: "6px" }}
            >
              <span className="material-icons">payments</span>
              <span>{t("To'lov qabul qilish")}</span>
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={handlePrintStatement}
            style={{ flex: customer.totalDebt > 0 ? 0.6 : 1, gap: "6px", color: colors.primary, borderColor: colors.primary }}
          >
            <span className="material-icons">picture_as_pdf</span>
            <span>{t("Ko'chirma")}</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher & POS trigger */}
      <div style={{ display: "flex", borderBottom: `1px solid ${colors.border}`, marginTop: "10px" }}>
        <button
          onClick={() => setActiveTab("sales")}
          style={{
            flex: 1,
            padding: "12px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "sales" ? `3px solid ${colors.primary}` : "none",
            color: activeTab === "sales" ? colors.primary : colors.mutedForeground,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          <span className="material-icons" style={{ fontSize: "16px" }}>shopping_bag</span>
          <span>{t("Nasiyalar")} ({debtSales.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          style={{
            flex: 1,
            padding: "12px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "payments" ? `3px solid ${colors.primary}` : "none",
            color: activeTab === "payments" ? colors.primary : colors.mutedForeground,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          <span className="material-icons" style={{ fontSize: "16px" }}>payments</span>
          <span>{t("To'lovlar")} ({payments?.length ?? 0})</span>
        </button>
        <button
          onClick={() => setLocation(`/pos?preCustomerId=${customer.id}&preCustomerName=${encodeURIComponent(customer.name)}`)}
          style={{
            flex: 1,
            padding: "12px",
            background: "none",
            border: "none",
            borderBottom: "none",
            color: colors.success,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          <span className="material-icons" style={{ fontSize: "16px" }}>add_shopping_cart</span>
          <span>{t("Yangi savdo")}</span>
        </button>
      </div>

      {/* Tab Contents list */}
      <div>
        {activeTab === "sales" ? (
          debtSales.length === 0 ? (
            <div className="card-standard" style={{ padding: "40px", textAlign: "center", color: colors.mutedForeground }}>
              <span className="material-icons" style={{ fontSize: "36px", color: colors.border }}>shopping_bag</span>
              <p style={{ fontSize: "12px", marginTop: "8px" }}>{t("Nasiyaga sotilgan mahsulotlar yo'q")}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {debtSales.map((s) => (
                <div key={s.id} className="card-standard" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="material-icons" style={{ color: "#DC2626", fontSize: "20px" }}>shopping_bag</span>
                    <div>
                      <span className="text-muted" style={{ fontSize: "10px", display: "block" }}>{formatDate(s.createdAt)}</span>
                      <span style={{ fontSize: "14px", fontWeight: 600 }}>#{s.id} · {s.itemCount} {t("ta tovar")}</span>
                      {s.paidAmount != null && s.paidAmount > 0 && (
                        <span style={{ fontSize: "11px", color: colors.success, display: "block", marginTop: "2px" }}>
                          {t("Kassa to'lovi:")} {formatMoney(s.paidAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#DC2626" }}>
                      +{formatMoney(s.debtAmount ?? s.totalAmount)}
                    </span>
                    <span style={{ fontSize: "9px", color: colors.mutedForeground, display: "block", textTransform: "uppercase" }}>{t("qarzga")}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          (payments ?? []).length === 0 ? (
            <div className="card-standard" style={{ padding: "40px", textAlign: "center", color: colors.mutedForeground }}>
              <span className="material-icons" style={{ fontSize: "36px", color: colors.border }}>payments</span>
              <p style={{ fontSize: "12px", marginTop: "8px" }}>{t("Qarz to'lovlari tarixi mavjud emas")}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(payments ?? []).map((p) => (
                <div key={p.id} className="card-standard" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="material-icons" style={{ color: colors.success, fontSize: "20px" }}>check_circle</span>
                    <div>
                      <span className="text-muted" style={{ fontSize: "10px", display: "block" }}>{formatDate(p.createdAt)}</span>
                      <span style={{ fontSize: "14px", fontWeight: 600 }}>{p.note || t("Qarz qaytarilishi")}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: colors.success }}>
                      -{formatMoney(p.amount)}
                    </span>
                    <span style={{ fontSize: "9px", color: colors.mutedForeground, display: "block", textTransform: "uppercase" }}>{t("to'landi")}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Repay Payment modal */}
      {paymentOpen && (
        <div className="modal-backdrop" onClick={() => !payingDebt && setPaymentOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
              <span className="material-icons" style={{ color: colors.success }}>payments</span>
              <h3 style={{ fontSize: "17px" }}>{t("To'lov qabul qilish")}</h3>
            </div>

            <p style={{ fontSize: "13px", color: colors.mutedForeground, marginBottom: "12px" }}>
              {t("Mijoz joriy qarzi:")} <strong style={{ color: colors.foreground }}>{formatMoney(customer.totalDebt)}</strong>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                  {t("To'lanayotgan summa (UZS) *")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder={`${t("Masalan:")} 250000`}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                  {t("Izoh / Eslatma")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder={t("To'lov bo'yicha izoh (ixtiyoriy)...")}
                />
              </div>

              {payError && (
                <div style={{ backgroundColor: "#FEE2E2", color: "#EF4444", padding: "10px", borderRadius: "10px", fontSize: "13px" }}>
                  {payError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button className="btn-secondary" onClick={() => setPaymentOpen(false)} disabled={payingDebt} style={{ flex: 1 }}>
                  {t("Bekor qilish")}
                </button>
                <button className="btn-success" onClick={handlePayment} disabled={payingDebt} style={{ flex: 1 }}>
                  {payingDebt ? t("Saqlanmoqda...") : t("Saqlash")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Info Modal */}
      {editOpen && (
        <div className="modal-backdrop" onClick={() => !updating && setEditOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85%", overflowY: "auto" }}>
            <div className="sheet-handle"></div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
              <span className="material-icons" style={{ color: colors.primary }}>edit</span>
              <h3 style={{ fontSize: "17px" }}>{t("Mijoz ma'lumotlarini tahrirlash")}</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                  {t("To'liq ism")} *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t("Ism F.I.Sh")}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                  {t("Telefon raqami")} *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="998 xx xxx xx xx"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                  {t("Yashash joyi (Manzil)")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder={t("Shahar, ko'cha, uy...")}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                  {t("Qarz limiti (UZS)")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editLimit}
                  onChange={(e) => setEditLimit(e.target.value.replace(/\D/g, ""))}
                  placeholder={t("0 = cheksiz limit")}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                  {t("Telegram ID raqami")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editTelegramId}
                  onChange={(e) => setEditTelegramId(e.target.value.replace(/\D/g, ""))}
                  placeholder={`${t("Masalan:")} 123456789`}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                  {t("Eslatma / Izoh")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder={t("Izoh...")}
                />
              </div>

              {editError && (
                <div style={{ backgroundColor: "#FEE2E2", color: "#EF4444", padding: "10px", borderRadius: "10px", fontSize: "13px" }}>
                  {editError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button className="btn-secondary" onClick={() => setEditOpen(false)} disabled={updating} style={{ flex: 1 }}>
                  {t("Bekor qilish")}
                </button>
                <button className="btn-primary" onClick={handleSaveEdit} disabled={updating} style={{ flex: 1 }}>
                  {updating ? t("Saqlanmoqda...") : t("Saqlash")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Request delete modal */}
      {deleteConfirmOpen && (
        <div className="modal-backdrop" onClick={() => !(deleting || sendingRequest) && setDeleteConfirmOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>

            {deleteRequestSent ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center", padding: "10px 0" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.1)", color: colors.success, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-icons" style={{ fontSize: "32px" }}>check_circle</span>
                </div>
                <h3 style={{ fontSize: "17px" }}>{t("So'rov yuborildi!")}</h3>
                <p className="text-muted" style={{ fontSize: "13px" }}>
                  {t("Rahbar tasdiqlasa, mijoz butunlay o'chiriladi.")}
                </p>
                <button className="btn-primary" onClick={() => { setDeleteConfirmOpen(false); setDeleteRequestSent(false); }} style={{ width: "100%", marginTop: "10px" }}>
                  {t("Yaxshi")}
                </button>
              </div>
            ) : isWorker ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-icons">send</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px" }}>{t("O'chirish so'rovi")}</h3>
                    <p className="text-muted" style={{ fontSize: "11px" }}>{t("Raxbar tasdig'i kutiladi")}</p>
                  </div>
                </div>

                <p style={{ fontSize: "13.5px", lineHeight: "1.5" }}>
                  {t("Haqiqatdan ham")} <strong style={{ color: colors.foreground }}>"{customer.name}"</strong> {t("mijozini o'chirish bo'yicha tizim rahbariga so'rov yuborilsinmi?")}
                </p>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button className="btn-secondary" onClick={() => setDeleteConfirmOpen(false)} disabled={sendingRequest} style={{ flex: 1 }}>
                    {t("Bekor qilish")}
                  </button>
                  <button className="btn-primary" onClick={handleConfirmDelete} disabled={sendingRequest} style={{ flex: 1, backgroundColor: "#E65100", borderColor: "#E65100" }}>
                    {sendingRequest ? t("Yuborilmoqda...") : t("Ha, yuborish")}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.1)", color: colors.destructive, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-icons">delete_forever</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px" }}>{t("Mijozni o'chirish")}</h3>
                    <p className="text-muted" style={{ fontSize: "11px" }}>{t("Ushbu amalni ortga qaytarib bo'lmaydi")}</p>
                  </div>
                </div>

                <p style={{ fontSize: "13.5px", lineHeight: "1.5" }}>
                  {t("Haqiqatdan ham")} <strong style={{ color: colors.foreground }}>"{customer.name}"</strong> {t("mijozini butunlay o'chirasizmi?")}
                </p>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button className="btn-secondary" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting} style={{ flex: 1 }}>
                    {t("Bekor qilish")}
                  </button>
                  <button className="btn-primary" onClick={handleConfirmDelete} disabled={deleting} style={{ flex: 1, backgroundColor: colors.destructive, borderColor: colors.destructive }}>
                    {deleting ? t("O'chirilmoqda...") : t("Ha, o'chirilsin")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerDetail() {
  const { subscriptionActive } = useAuth();
  const { t } = useTranslation();
  if (!subscriptionActive) return <SubscriptionLockScreen screenName={t("Mijoz tafsilotlari")} />;
  return <CustomerDetailScreenInner />;
}
