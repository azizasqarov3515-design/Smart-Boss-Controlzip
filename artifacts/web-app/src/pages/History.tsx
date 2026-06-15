import React, { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSales,
  useGetCustomers,
  useDeleteSale,
  useBulkDeleteSales,
  useCreateDeleteRequest,
  getGetSalesQueryKey,
  getGetDashboardStatsQueryKey,
  getGetCustomersQueryKey,
  type SaleWithItems,
} from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { useColors } from "../hooks/useColors";
import { useSettings } from "../hooks/useSettings";
import { SubscriptionLockScreen } from "../components/SubscriptionLockScreen";
import {
  buildInvoiceHtml,
  buildReceiptHtml,
  buildWaybillHtml,
  type PdfCustomer,
  type PdfSeller,
} from "../utils/pdfTemplates";
import { printDoc, sharePdf } from "../utils/PrintService";
import { useTranslation } from "../contexts/LanguageContext";

type DocType = "invoice" | "receipt" | "waybill";

const DOC_ACTIONS: Array<{
  type: DocType;
  icon: string;
  label: string;
  color: string;
  bg: string;
}> = [
  { type: "invoice", icon: "receipt", label: "Faktura", color: "#1565C0", bg: "rgba(21, 101, 192, 0.1)" },
  { type: "receipt", icon: "point_of_sale", label: "Chek", color: "#065F46", bg: "rgba(6, 95, 70, 0.1)" },
  { type: "waybill", icon: "local_shipping", label: "Yuk xati", color: "#7C3AED", bg: "rgba(124, 58, 237, 0.1)" },
];

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

function SaleCard({
  sale,
  colors,
  selectionMode,
  selected,
  onSelect,
  onLongPress,
  settings,
  customers,
  seller,
}: {
  sale: SaleWithItems;
  colors: ReturnType<typeof useColors>;
  selectionMode: boolean;
  selected: boolean;
  onSelect: (id: number) => void;
  onLongPress: (id: number) => void;
  settings: any;
  customers: any[] | undefined;
  seller: PdfSeller;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState<DocType | null>(null);
  const { t } = useTranslation();

  const pdfCustomer: PdfCustomer | null = sale.customerId
    ? (() => {
        const found = customers?.find((c) => c.id === sale.customerId);
        if (!found) return null;
        return { name: found.name, phone: found.phone ?? "", address: found.address ?? "" };
      })()
    : sale.customerName
    ? { name: sale.customerName, phone: "", address: "" }
    : null;

  const handleDocAction = (type: DocType, action: "print" | "download") => {
    let html = "";
    if (type === "invoice") html = buildInvoiceHtml(sale, settings, pdfCustomer, seller);
    else if (type === "receipt") html = buildReceiptHtml(sale, settings, pdfCustomer, seller);
    else html = buildWaybillHtml(sale, settings, pdfCustomer, seller);

    const filename = `${settings.storeName}-${type}-${sale.id}.html`;
    if (action === "print") {
      printDoc(html);
    } else {
      sharePdf(html, filename);
    }
  };

  const payTypeLabel: Record<string, string> = { cash: t("Naqd"), card: t("Plastik"), debt: t("Qarz") };
  const payTypeBg: Record<string, string> = { cash: "rgba(16, 185, 129, 0.15)", card: "rgba(59, 130, 246, 0.15)", debt: "rgba(245, 158, 11, 0.15)" };
  const payTypeColor: Record<string, string> = { cash: "#10B981", card: "#3B82F6", debt: "#F59E0B" };

  return (
    <div
      className="card-standard"
      style={{
        padding: "0",
        overflow: "hidden",
        border: selected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
        cursor: "pointer"
      }}
      onClick={() => {
        if (selectionMode) {
          onSelect(sale.id);
        } else {
          setExpanded((v) => !v);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress(sale.id);
      }}
    >
      {/* Card Header Content */}
      <div style={{ padding: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
        {selectionMode && (
          <div style={{
            width: "20px",
            height: "20px",
            borderRadius: "6px",
            border: `2px solid ${selected ? colors.primary : colors.border}`,
            backgroundColor: selected ? colors.primary : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white"
          }}>
            {selected && <span className="material-icons" style={{ fontSize: "14px", fontWeight: "bold" }}>check</span>}
          </div>
        )}
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          backgroundColor: colors.primary,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "13px"
        }}>
          #{sale.id}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "11px", color: colors.mutedForeground }}>{formatDate(sale.createdAt)}</span>
            <span style={{ fontSize: "12px", padding: "2px 6px", borderRadius: "6px", backgroundColor: payTypeBg[sale.paymentType] ?? colors.muted, color: payTypeColor[sale.paymentType] ?? colors.foreground, fontWeight: 700 }}>
              {payTypeLabel[sale.paymentType] ?? sale.paymentType}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: colors.success }}>{formatMoney(sale.totalAmount)}</span>
            <span className="text-muted" style={{ fontSize: "11px" }}>{sale.itemCount} {t("dona")}</span>
          </div>
          {sale.customerName && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: colors.mutedForeground, marginTop: "4px" }}>
              <span className="material-icons" style={{ fontSize: "12px" }}>person</span>
              <span>{sale.customerName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.muted, padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Docs printer row */}
          <div>
            <span style={{ fontSize: "11px", color: colors.mutedForeground, display: "block", marginBottom: "6px", fontWeight: 500 }}>{t("Hujjatlar:")}</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {DOC_ACTIONS.map((d) => (
                <div key={d.type} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "10px", textAlign: "center", color: colors.mutedForeground, fontWeight: 600 }}>{t(d.label)}</span>
                  <div style={{ display: "flex", gap: "2px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={(e) => { e.stopPropagation(); handleDocAction(d.type, "print"); }}
                      style={{ padding: "6px", flex: 1, backgroundColor: d.bg, borderColor: `${d.color}30`, color: d.color, justifyContent: "center" }}
                    >
                      <span className="material-icons" style={{ fontSize: "16px" }}>print</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={(e) => { e.stopPropagation(); handleDocAction(d.type, "download"); }}
                      style={{ padding: "6px", flex: 1, backgroundColor: d.bg, borderColor: `${d.color}30`, color: d.color, justifyContent: "center" }}
                    >
                      <span className="material-icons" style={{ fontSize: "16px" }}>download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items Table list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: `1px solid ${colors.border}`, paddingTop: "8px" }}>
            <span style={{ fontSize: "11px", color: colors.mutedForeground, fontWeight: 500 }}>{t("Sotilgan tovarlar:")}</span>
            {sale.items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 8px",
                  borderRadius: "8px",
                  backgroundColor: colors.card,
                  fontSize: "12px"
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{item.productName}</div>
                  <div className="text-muted" style={{ fontSize: "10px" }}>{item.brand}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{item.quantity} {t("dona")} × {item.unitPrice.toLocaleString("uz-UZ")} UZS</div>
                  <div style={{ fontWeight: 700, color: colors.primary }}>{formatMoney(item.totalPrice)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Sale note */}
          {sale.note && (
            <div style={{ display: "flex", gap: "6px", fontSize: "11px", color: colors.mutedForeground, borderTop: `1px solid ${colors.border}`, paddingTop: "8px" }}>
              <span className="material-icons" style={{ fontSize: "14px" }}>notes</span>
              <span style={{ fontStyle: "italic" }}>{t("Izoh:")} {sale.note}</span>
            </div>
          )}

          {/* Financial summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderTop: `1px solid ${colors.border}`, paddingTop: "8px", fontSize: "12px", color: colors.foreground }}>
            {(sale.discountAmount ?? 0) > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", color: colors.mutedForeground }}>
                  <span>{t("Mahsulotlar jami:")}</span>
                  <span>{formatMoney(sale.items.reduce((s, item) => s + item.totalPrice, 0))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: colors.mutedForeground }}>
                  <span>{t("Chegirma:")}</span>
                  <span>-{formatMoney(sale.discountAmount ?? 0)}</span>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>{t("Jami to'lov:")}</span>
              <span>{formatMoney(sale.totalAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryScreenInner() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { role, workerName, managerId, managerPhone, username } = useAuth();
  const isWorker = role === "worker";
  const { settings } = useSettings(managerId);
  const { t } = useTranslation();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmType, setConfirmType] = useState<"selected" | "all" | null>(null);
  const [workerRequestModal, setWorkerRequestModal] = useState<"selected" | "all" | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const { data: sales, isLoading, refetch, isRefetching } = useGetSales();
  const { data: customers } = useGetCustomers();

  const getPdfSeller = (): PdfSeller => {
    if (role === "worker") {
      return { name: workerName ?? "Ishchi", phone: null, isManager: false };
    }
    return {
      name: settings.sellers?.[0]?.name ?? username ?? "Menejer",
      phone: settings.sellers?.[0]?.phone ?? managerPhone ?? null,
      isManager: true,
    };
  };

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
  }, [queryClient]);

  const { mutate: bulkDelete, isPending: bulkDeleting } = useBulkDeleteSales({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setSelectedIds(new Set());
        setSelectionMode(false);
        setConfirmType(null);
      },
      onError: (err: any) => {
        alert(err.message || t("O'chirishda xatolik yuz berdi"));
      }
    },
  });

  const { mutate: createDeleteRequest, isPending: sendingRequest } = useCreateDeleteRequest({
    mutation: {
      onSuccess: () => {
        setRequestSuccess(true);
        setSelectedIds(new Set());
        setSelectionMode(false);
        setTimeout(() => {
          setWorkerRequestModal(null);
          setRequestSuccess(false);
        }, 2000);
      },
      onError: (err: any) => {
        alert(err.message || t("So'rov yuborishda xatolik"));
      }
    },
  });

  const totalRevenue = (sales ?? []).reduce((s, sale) => s + sale.totalAmount, 0);
  const todaySales = (sales ?? []).filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.totalAmount, 0);

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLongPress = useCallback((id: number) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const handleSelectAll = () => {
    if (!sales) return;
    if (selectedIds.size === sales.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sales.map((s) => s.id)));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleConfirmDelete = () => {
    if (confirmType === "all") {
      bulkDelete({ data: { deleteAll: true } });
    } else if (confirmType === "selected") {
      bulkDelete({ data: { ids: Array.from(selectedIds) } });
    }
  };

  const handleSendWorkerRequest = () => {
    let ids: number[] = [];
    if (workerRequestModal === "all") {
      ids = (sales ?? []).map((s) => s.id);
    } else {
      ids = Array.from(selectedIds);
    }
    if (ids.length === 0) return;
    createDeleteRequest({ data: { saleIds: ids } });
  };

  const allSelected = (sales?.length ?? 0) > 0 && selectedIds.size === (sales?.length ?? 0);

  return (
    <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Action / Selection Top bar */}
      {selectionMode ? (
        <div style={{
          backgroundColor: colors.primary,
          margin: "-16px -16px 0 -16px",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "white"
        }}>
          <button
            onClick={exitSelectionMode}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <span className="material-icons">close</span>
          </button>
          <span style={{ fontSize: "15px", fontWeight: 700 }}>{selectedIds.size} {t("ta tanlandi")}</span>
          <button
            onClick={handleSelectAll}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
          >
            {allSelected ? t("Bekor qilish") : t("Hammasini tanlash")}
          </button>
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: "20px", color: colors.foreground }}>{t("Savdo tarixi")}</h2>
          <p className="text-muted" style={{ fontSize: "12px", marginTop: "2px" }}>
            {t("Tranzaksiyalar va sotuv fakturalarini boshqarish")}
          </p>
        </div>
      )}

      {/* Metrics Row */}
      {!selectionMode && (
        <div className="card-standard" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center", padding: "12px" }}>
          <div>
            <span style={{ fontSize: "10px", color: colors.mutedForeground, display: "block" }}>{t("Sotuvlar")}</span>
            <span style={{ fontSize: "14px", fontWeight: 700 }}>{sales?.length ?? 0} {t("ta")}</span>
          </div>
          <div style={{ borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
            <span style={{ fontSize: "10px", color: colors.mutedForeground, display: "block" }}>{t("Bugungi tushum")}</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: colors.success }}>{formatMoney(todayRevenue)}</span>
          </div>
          <div>
            <span style={{ fontSize: "10px", color: colors.mutedForeground, display: "block" }}>{t("Jami tushum")}</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: colors.primary }}>{formatMoney(totalRevenue)}</span>
          </div>
        </div>
      )}

      {/* Action toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {selectionMode ? (
          <button
            className="btn-primary"
            onClick={() => {
              if (isWorker) setWorkerRequestModal("selected");
              else setConfirmType("selected");
            }}
            disabled={selectedIds.size === 0 || bulkDeleting || sendingRequest}
            style={{
              backgroundColor: isWorker ? "#D97706" : colors.destructive,
              borderColor: isWorker ? "#D97706" : colors.destructive,
              gap: "6px"
            }}
          >
            <span className="material-icons">{isWorker ? "send" : "delete_sweep"}</span>
            <span>{isWorker ? `${t("O'chirish so'rovi")} (${selectedIds.size})` : `${t("O'chirish")} (${selectedIds.size})`}</span>
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: colors.mutedForeground }}>
            <span className="material-icons" style={{ fontSize: "14px" }}>touch_app</span>
            <span>{t("Uzoq bosish orqali tanlang")}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "6px" }}>
          {!selectionMode && (
            <button
              className="btn-secondary"
              onClick={() => {
                if (isWorker) setWorkerRequestModal("all");
                else setConfirmType("all");
              }}
              disabled={!sales || sales.length === 0}
              style={{
                fontSize: "12px",
                padding: "8px 10px",
                borderColor: isWorker ? "#FCD34D" : "rgba(239, 68, 68, 0.2)",
                color: isWorker ? "#92400E" : colors.destructive,
                backgroundColor: isWorker ? "rgba(251, 191, 36, 0.05)" : "rgba(239, 68, 68, 0.05)"
              }}
            >
              <span className="material-icons" style={{ fontSize: "15px", marginRight: "4px" }}>{isWorker ? "send" : "delete_forever"}</span>
              <span>{t("Jami o'chirish")}</span>
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={() => {
              if (selectionMode) exitSelectionMode();
              else setSelectionMode(true);
            }}
            disabled={!sales || sales.length === 0}
            style={{ fontSize: "12px", padding: "8px 10px" }}
          >
            <span className="material-icons" style={{ fontSize: "15px", marginRight: "4px" }}>checklist</span>
            <span>{selectionMode ? t("Yopish") : t("Tanlash")}</span>
          </button>
        </div>
      </div>

      {/* Sales list / Loader */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px", gap: "12px" }}>
          <div className="spinner" style={{ width: "30px", height: "30px", border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
          <span style={{ fontSize: "13px", color: colors.mutedForeground }}>{t("Savdolar yuklanmoqda...")}</span>
        </div>
      ) : (sales ?? []).length === 0 ? (
        <div className="card-standard" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "50px 20px", textAlign: "center", gap: "10px" }}>
          <span className="material-icons" style={{ fontSize: "48px", color: colors.border }}>receipt_long</span>
          <div>
            <h4 style={{ fontSize: "15px", color: colors.foreground }}>{t("Sotuvlar tarixi bo'sh")}</h4>
            <p className="text-muted" style={{ fontSize: "12px", marginTop: "4px" }}>
              {t("POS kassa bo'limidan birinchi sotuvni amalga oshiring")}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {(sales ?? []).map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              colors={colors}
              selectionMode={selectionMode}
              selected={selectedIds.has(sale.id)}
              onSelect={handleToggleSelect}
              onLongPress={handleLongPress}
              settings={settings}
              customers={customers}
              seller={getPdfSeller()}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal (Manager) */}
      {confirmType !== null && (
        <div className="modal-backdrop" onClick={() => !bulkDeleting && setConfirmType(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.1)", color: colors.destructive, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-icons">delete_forever</span>
              </div>
              <h3 style={{ fontSize: "17px" }}>{t("Savdo tarixini o'chirish")}</h3>
            </div>
            <p style={{ fontSize: "13.5px", lineHeight: "1.5" }}>
              {confirmType === "all"
                ? t("Haqiqatdan ham barcha sotuvlar tarixini butunlay o'chirib tashlaysizmi? Tovar qoldiqlari avtomatik ravishda tiklanadi.")
                : `${selectedIds.size} ${t("ta sotuv tarixini o'chirasizmi? Tovar qoldiqlari tiklanadi.")}`}
              <br />
              <strong style={{ color: colors.destructive }}>{t("Ushbu amalni ortga qaytarib bo'lmaydi!")}</strong>
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button className="btn-secondary" onClick={() => setConfirmType(null)} disabled={bulkDeleting} style={{ flex: 1 }}>
                {t("Bekor qilish")}
              </button>
              <button className="btn-primary" onClick={handleConfirmDelete} disabled={bulkDeleting} style={{ flex: 1, backgroundColor: colors.destructive, borderColor: colors.destructive }}>
                {bulkDeleting ? t("O'chirilmoqda...") : t("Ha, o'chirilsin")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Request Modal (Worker) */}
      {workerRequestModal !== null && (
        <div className="modal-backdrop" onClick={() => !sendingRequest && !requestSuccess && setWorkerRequestModal(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            {requestSuccess ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center", padding: "10px 0" }}>
                <div style={{ width: "65px", height: "65px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.1)", color: colors.success, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-icons" style={{ fontSize: "32px" }}>check_circle</span>
                </div>
                <h3 style={{ fontSize: "17px" }}>{t("So'rov yuborildi!")}</h3>
                <p className="text-muted" style={{ fontSize: "13px" }}>
                  {t("Rahbar so'rovni ko'rib chiqib tasdiqlaganidan so'ng ushbu savdo ma'lumotlari o'chiriladi.")}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-icons">send</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px" }}>{t("O'chirish so'rovi yuborish")}</h3>
                    <p className="text-muted" style={{ fontSize: "11px" }}>{t("Rahbar tasdig'i lozim")}</p>
                  </div>
                </div>
                <p style={{ fontSize: "13.5px", lineHeight: "1.5" }}>
                  {workerRequestModal === "all"
                    ? t("Barcha savdolar tarixini o'chirish bo'yicha rahbariyatga so'rov yuborilsinmi?")
                    : `${selectedIds.size} ${t("ta savdo tarixini o'chirish bo'yicha rahbariyatga so'rov yuborilsinmi?")}`}
                </p>
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button className="btn-secondary" onClick={() => setWorkerRequestModal(null)} disabled={sendingRequest} style={{ flex: 1 }}>
                    {t("Bekor qilish")}
                  </button>
                  <button className="btn-primary" onClick={handleSendWorkerRequest} disabled={sendingRequest} style={{ flex: 1, backgroundColor: "#E65100", borderColor: "#E65100" }}>
                    {sendingRequest ? t("Yuborilmoqda...") : t("Ha, yuborish")}
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

export default function History() {
  const { subscriptionActive } = useAuth();
  const { t } = useTranslation();
  if (!subscriptionActive) return <SubscriptionLockScreen screenName={t("Tarix")} />;
  return <HistoryScreenInner />;
}
