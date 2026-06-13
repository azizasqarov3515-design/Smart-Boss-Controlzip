import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProducts,
  useDeleteProduct,
  useCreateProductDeleteRequest,
  getGetProductsQueryKey,
  getGetDashboardStatsQueryKey,
  type Product,
} from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { useColors } from "../hooks/useColors";
import { SubscriptionLockScreen } from "../components/SubscriptionLockScreen";
import { useTranslation } from "../contexts/LanguageContext";

type SortKey = "name" | "brand" | "costPrice" | "salePrice" | "quantity";

function HighlightText({
  text,
  query,
  style,
  highlightStyle,
}: {
  text: string;
  query: string;
  style?: React.CSSProperties;
  highlightStyle?: React.CSSProperties;
}) {
  if (!query.trim()) return <span style={style}>{text}</span>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <span style={style}>{text}</span>;
  return (
    <span style={style}>
      {text.slice(0, idx)}
      <mark style={{ backgroundColor: "#FFF176", color: "#1A1A2E", borderRadius: "2px", padding: "0 2px", ...highlightStyle }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

function ProductsScreenInner() {
  const colors = useColors();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { role, subscriptionActive } = useAuth();
  const isWorker = role === "worker";
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [unitFilter, setUnitFilter] = useState<"all" | "dona" | "kg" | "m">("all");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Confirm delete modal state
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const { data: products, isLoading, refetch, isRefetching } = useGetProducts();

  const { mutate: deleteProduct, isPending: deleting } = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        setConfirmProduct(null);
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
      onError: (err: any) => {
        alert(err.message || t("Mahsulotni o'chirishda xato yuz berdi"));
      }
    },
  });

  const { mutate: sendDeleteRequest, isPending: sendingRequest } = useCreateProductDeleteRequest({
    mutation: {
      onSuccess: () => {
        setRequestSent(true);
      },
      onError: (err: any) => {
        alert(err.message || t("So'rov yuborishda xato yuz berdi"));
      }
    },
  });

  const handleDelete = (product: Product) => {
    setRequestSent(false);
    setConfirmProduct(product);
  };

  const handleConfirm = () => {
    if (!confirmProduct) return;
    if (isWorker) {
      sendDeleteRequest({
        data: {
          productIds: [confirmProduct.id],
          productNames: [confirmProduct.name],
        },
      });
    } else {
      deleteProduct({ id: confirmProduct.id });
    }
  };

  const handleCloseModal = () => {
    setConfirmProduct(null);
    setRequestSent(false);
  };

  const handleEdit = (product: Product) => {
    setLocation(`/product-form?id=${product.id}`);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filtered = (products ?? [])
    .filter((p) => {
      if (unitFilter !== "all" && p.unit !== unitFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        String(p.id).includes(q) ||
        p.barcode?.includes(q)
      );
    })
    .sort((a: any, b: any) => {
      const av = typeof a[sortKey] === "string" ? a[sortKey].toLowerCase() : a[sortKey];
      const bv = typeof b[sortKey] === "string" ? b[sortKey].toLowerCase() : b[sortKey];
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

  const lowStockCount = (products ?? []).filter((p) => p.quantity < 5).length;

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(col)}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        fontSize: "12px",
        fontFamily: "Inter",
        fontWeight: sortKey === col ? 600 : 400,
        color: sortKey === col ? colors.primary : colors.mutedForeground,
        padding: "4px 8px",
        borderRadius: "6px"
      }}
    >
      <span>{label}</span>
      {sortKey === col && (
        <span className="material-icons" style={{ fontSize: "12px" }}>
          {sortAsc ? "arrow_upward" : "arrow_downward"}
        </span>
      )}
    </button>
  );

  return (
    <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", color: colors.foreground }}>{t("Mahsulotlar")}</h2>
          <p className="text-muted" style={{ fontSize: "12px", marginTop: "2px" }}>
            {t("Do'kon omboridagi barcha tovarlar ro'yxati")}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setLocation("/product-form")}
          style={{ padding: "10px 14px", borderRadius: "12px", gap: "6px" }}
        >
          <span className="material-icons">add</span>
          <span>{t("Yangi tovar")}</span>
        </button>
      </div>

      {/* Search & Scan row */}
      <div style={{ position: "relative" }}>
        <span className="material-icons" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: colors.mutedForeground }}>search</span>
        <input
          type="text"
          className="input-field"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Nomi, brendi yoki shtrix-kodi bo'yicha qidirish...")}
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

      {/* Alert strip for low stock */}
      {lowStockCount > 0 && (
        <div
          className="alert-card"
          onClick={() => handleSort("quantity")}
          style={{
            borderColor: "#F59E0B",
            backgroundColor: "rgba(245, 158, 11, 0.05)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="material-icons" style={{ color: "#D97706" }}>warning</span>
            <span style={{ fontSize: "13px", color: "#B45309", fontWeight: 500 }}>
              {lowStockCount} {t("ta mahsulot omborda kam qoldi (5 tadan kam)")}
            </span>
          </div>
          <span style={{ fontSize: "12px", color: colors.primary, fontWeight: 600 }}>{t("Ko'rish")}</span>
        </div>
      )}

      {/* Unit Filter tabs */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
        {([
          { key: "all", label: t("Barchasi"), icon: "📦" },
          { key: "dona", label: t("Dona"), icon: "🔢" },
          { key: "kg", label: t("Kilogramm"), icon: "⚖️" },
          { key: "m", label: t("Metr"), icon: "📏" },
        ] as const).map((ut) => {
          const isActive = unitFilter === ut.key;
          return (
            <button
              key={ut.key}
              onClick={() => setUnitFilter(ut.key)}
              className="btn-secondary"
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 16px",
                borderRadius: "14px",
                minWidth: "85px",
                backgroundColor: isActive ? colors.primary : colors.card,
                borderColor: isActive ? colors.primary : colors.border,
                color: isActive ? "white" : colors.foreground,
                gap: "2px"
              }}
            >
              <span style={{ fontSize: "18px" }}>{ut.icon}</span>
              <span style={{ fontSize: "11px", fontWeight: 600 }}>{ut.label}</span>
            </button>
          );
        })}
      </div>

      {/* Meta sorting line */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
        <span style={{ color: colors.mutedForeground, fontWeight: 500 }}>
          {t("Natija:")} {filtered.length} / {products?.length ?? 0} {t("ta tovar")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ color: colors.mutedForeground }}>{t("Tartiblash:")}</span>
          <SortBtn col="name" label={t("Nom")} />
          <SortBtn col="salePrice" label={t("Sotuv")} />
          <SortBtn col="quantity" label={t("Soni")} />
        </div>
      </div>

      {/* Loader / Empty state / List */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px", gap: "12px" }}>
          <div className="spinner" style={{ width: "30px", height: "30px", border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
          <span style={{ fontSize: "13px", color: colors.mutedForeground }}>{t("Mahsulotlar yuklanmoqda...")}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-standard" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", gap: "12px" }}>
          <span className="material-icons" style={{ fontSize: "48px", color: colors.border }}>inventory_2</span>
          <div>
            <h4 style={{ fontSize: "15px", color: colors.foreground }}>{t("Hech narsa topilmadi")}</h4>
            <p className="text-muted" style={{ fontSize: "12px", marginTop: "4px" }}>
              {search ? `"${search}" ${t("qidiruviga mos mahsulot yo'q")}` : t("Hozircha mahsulot qo'shilmagan")}
            </p>
          </div>
          {!search && (
            <button className="btn-primary" onClick={() => setLocation("/product-form")} style={{ marginTop: "8px" }}>
              {t("Tovar qo'shish")}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((product, idx) => {
            const isLowStock = product.quantity < 5;
            const profit = product.salePrice - product.costPrice;
            const profitPct = product.costPrice > 0 ? ((profit / product.costPrice) * 100).toFixed(0) : "0";

            return (
              <div
                key={product.id}
                className="card-standard"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  borderLeft: isLowStock ? `4px solid ${colors.destructive}` : `1px solid ${colors.border}`,
                  backgroundColor: idx % 2 === 0 ? colors.card : colors.muted
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{
                      backgroundColor: colors.surfaceVariant,
                      color: colors.mutedForeground,
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "6px",
                      marginTop: "2px"
                    }}>
                      #{product.id}
                    </div>
                    <div>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: colors.foreground }}>
                        <HighlightText text={product.name} query={search} />
                      </h4>
                      <p className="text-muted" style={{ fontSize: "12px", marginTop: "2px" }}>
                        <HighlightText text={product.brand} query={search} />
                        {product.barcode && ` · 📝 ${product.barcode}`}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        onClick={() => setImagePreviewUrl(product.imageUrl!)}
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "8px",
                          objectFit: "cover",
                          cursor: "pointer",
                          backgroundColor: colors.muted,
                          border: `1px solid ${colors.border}`
                        }}
                      />
                    )}
                    {isLowStock && (
                      <span style={{
                        backgroundColor: "#EF4444",
                        color: "white",
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "6px",
                        textTransform: "uppercase"
                      }}>
                        {t("Kam qoldi")}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${colors.border}`, paddingTop: "8px", marginTop: "2px" }}>
                  <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span className="text-muted" style={{ marginRight: "4px" }}>{t("Tan:")}</span>
                      <span style={{ fontWeight: 600 }}>{product.costPrice.toLocaleString("uz-UZ")} UZS</span>
                    </div>
                    <div>
                      <span className="text-muted" style={{ marginRight: "4px" }}>{t("Sotuv:")}</span>
                      <span style={{ color: colors.primary, fontWeight: 700 }}>{product.salePrice.toLocaleString("uz-UZ")} UZS</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Profit margin chip */}
                    <div style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: profit >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      color: profit >= 0 ? colors.success : colors.destructive,
                      padding: "3px 7px",
                      borderRadius: "6px"
                    }}>
                      +{profitPct}%
                    </div>

                    {/* Stock quantity chip */}
                    <div style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      backgroundColor: isLowStock ? "rgba(239, 68, 68, 0.15)" : `rgba(59, 130, 246, 0.15)`,
                      color: isLowStock ? colors.destructive : colors.primary,
                      padding: "3px 8px",
                      borderRadius: "8px"
                    }}>
                      {product.quantity} {product.unit ? t(product.unit.charAt(0).toUpperCase() + product.unit.slice(1)) : t("Dona")}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "4px", marginLeft: "4px" }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleEdit(product)}
                        style={{ padding: "6px 8px", borderRadius: "8px" }}
                      >
                        <span className="material-icons" style={{ fontSize: "15px", color: colors.primary }}>edit</span>
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleDelete(product)}
                        style={{
                          padding: "6px 8px",
                          borderRadius: "8px",
                          backgroundColor: isWorker ? "rgba(245, 158, 11, 0.05)" : "rgba(239, 68, 68, 0.05)",
                          borderColor: isWorker ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)"
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: "15px", color: isWorker ? "#E65100" : colors.destructive }}>
                          {isWorker ? "send" : "delete"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreviewUrl && (
        <div className="modal-backdrop" onClick={() => setImagePreviewUrl(null)}>
          <div style={{
            position: "relative",
            width: "90%",
            maxWidth: "400px",
            aspectRatio: "1/1",
            backgroundColor: "black",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
          }} onClick={(e) => e.stopPropagation()}>
            <img
              src={imagePreviewUrl}
              alt="Preview"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <button
              onClick={() => setImagePreviewUrl(null)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: "rgba(0,0,0,0.6)",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <span className="material-icons" style={{ fontSize: "18px" }}>close</span>
            </button>
          </div>
        </div>
      )}

      {/* Direct Delete / Request Delete Modal */}
      {confirmProduct && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>

            {requestSent ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center", padding: "10px 0" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.1)", color: colors.success, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-icons" style={{ fontSize: "32px" }}>check_circle</span>
                </div>
                <h3 style={{ fontSize: "18px", color: colors.foreground }}>{t("So'rov yuborildi!")}</h3>
                <p className="text-muted" style={{ fontSize: "13px" }}>
                  {t("Tizim raxbari so'rovni ko'rib chiqib tasdiqlagach, ushbu mahsulot ro'yxatdan o'chiriladi.")}
                </p>
                <button className="btn-primary" onClick={handleCloseModal} style={{ width: "100%", marginTop: "10px" }}>
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
                    <p className="text-muted" style={{ fontSize: "12px" }}>{t("Raxbardan ruxsat so'rash")}</p>
                  </div>
                </div>

                <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
                  {t("Haqiqatdan ham")} <strong style={{ color: colors.foreground }}>"{confirmProduct.name}"</strong> {t("mahsulotini o'chirish bo'yicha rahbariyatga so'rov yuborilsinmi?")}
                </p>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button className="btn-secondary" onClick={handleCloseModal} style={{ flex: 1 }} disabled={sendingRequest}>
                    {t("Yo'q, bekor qilish")}
                  </button>
                  <button className="btn-primary" onClick={handleConfirm} style={{ flex: 1, backgroundColor: "#E65100", borderColor: "#E65100" }} disabled={sendingRequest}>
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
                    <h3 style={{ fontSize: "16px" }}>{t("Tovarni o'chirish")}</h3>
                    <p className="text-muted" style={{ fontSize: "12px" }}>{t("Ushbu amalni ortga qaytarib bo'lmaydi")}</p>
                  </div>
                </div>

                <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
                  {t("Haqiqatdan ham")} <strong style={{ color: colors.foreground }}>"{confirmProduct.name}"</strong> {t("mahsulotini do'kon bazasidan butunlay o'chirasizmi?")}
                </p>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button className="btn-secondary" onClick={handleCloseModal} style={{ flex: 1 }} disabled={deleting}>
                    {t("Bekor qilish")}
                  </button>
                  <button className="btn-primary" onClick={handleConfirm} style={{ flex: 1, backgroundColor: colors.destructive, borderColor: colors.destructive }} disabled={deleting}>
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

export default function Products() {
  const { subscriptionActive } = useAuth();
  const { t } = useTranslation();
  if (!subscriptionActive) return <SubscriptionLockScreen screenName={t("Mahsulotlar")} />;
  return <ProductsScreenInner />;
}
