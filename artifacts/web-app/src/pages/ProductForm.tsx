import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateProduct,
  useUpdateProduct,
  useGetProducts,
  getGetProductsQueryKey,
  getGetDashboardStatsQueryKey,
  type ProductUnit,
} from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { useColors } from "../hooks/useColors";
import { useSettings } from "../hooks/useSettings";
import { SubscriptionLockScreen } from "../components/SubscriptionLockScreen";
import { useTranslation } from "../contexts/LanguageContext";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";

interface FormValues {
  name: string;
  brand: string;
  costPrice: string;
  salePrice: string;
  quantity: string;
  barcode: string;
  thickness: string;
}

const INITIAL_FORM: FormValues = {
  name: "",
  brand: "",
  costPrice: "",
  salePrice: "",
  quantity: "",
  barcode: "",
  thickness: "",
};

function ProductFormScreenInner() {
  const { t } = useTranslation();
  const colors = useColors();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { token, managerId } = useAuth();
  const { settings } = useSettings(managerId);

  // Parse product ID from url query: e.g. /product-form?id=123
  const searchParams = new URLSearchParams(window.location.search);
  const idParam = searchParams.get("id");
  const productId = idParam ? parseInt(idParam, 10) : null;
  const isEdit = productId !== null;

  const allowedUnits = (["dona", "kg", "m"] as const).filter(
    (u) => !settings.disabledUnits?.includes(u)
  );
  const defaultUnit = allowedUnits[0] || "dona";

  const [form, setForm] = useState<FormValues>(INITIAL_FORM);
  const [unit, setUnit] = useState<ProductUnit>(defaultUnit);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormValues>>({});
  const [submitted, setSubmitted] = useState(false);

  // Web camera barcode scanner state
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);

  const { data: products, isLoading: productsLoading } = useGetProducts({
    query: { enabled: isEdit } as any,
  });

  const { mutate: createProduct, isPending: creating } = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setLocation("/products");
      },
      onError: (err: any) => {
        alert(err.message || t("Saqlashda xato yuz berdi"));
      },
    },
  });

  const { mutate: updateProduct, isPending: updating } = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setLocation("/products");
      },
      onError: (err: any) => {
        alert(err.message || t("Tahrirlashda xato yuz berdi"));
      },
    },
  });

  const isLoading = isEdit && productsLoading;
  const isPending = creating || updating;

  useEffect(() => {
    if (isEdit && products) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setForm({
          name: product.name,
          brand: product.brand ?? "",
          costPrice: String(product.costPrice),
          salePrice: String(product.salePrice),
          quantity: String(product.quantity),
          barcode: product.barcode ?? "",
          thickness: product.thickness != null ? String(product.thickness) : "",
        });
        setUnit(product.unit ?? "dona");
        setImageUrl(product.imageUrl ?? null);
      }
    }
  }, [isEdit, products, productId]);

  // Handle Image Upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
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
      setImageUrl(data.url);
    } catch (err: any) {
      alert(err.message || t("Rasmni yuklashda xato yuz berdi"));
    } finally {
      setImageUploading(false);
    }
  };


  const handleChange = (key: keyof FormValues, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormValues> = {};
    if (!form.name.trim()) newErrors.name = t("Nomi kiritilishi shart");
    if (!form.costPrice.trim() || isNaN(parseFloat(form.costPrice))) newErrors.costPrice = t("Tan narxini to'g'ri kiriting");
    if (!form.salePrice.trim() || isNaN(parseFloat(form.salePrice))) newErrors.salePrice = t("Sotuv narxini to'g'ri kiriting");
    if (!form.quantity.trim() || isNaN(parseFloat(form.quantity))) newErrors.quantity = t("Miqdorni to'g'ri kiriting");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    setSubmitted(true);
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      costPrice: parseFloat(form.costPrice),
      salePrice: parseFloat(form.salePrice),
      quantity: parseFloat(form.quantity),
      unit,
      barcode: form.barcode.trim() || undefined,
      thickness: unit === "m" && form.thickness.trim() ? parseFloat(form.thickness) : undefined,
      imageUrl: imageUrl || undefined,
    };

    if (isEdit) {
      updateProduct({ id: productId!, data: payload });
    } else {
      createProduct({ data: payload });
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "12px", height: "80vh" }}>
        <div className="spinner" style={{ width: "30px", height: "30px", border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        <span style={{ fontSize: "14px", color: colors.mutedForeground }}>{t("Yuklanmoqda...")}</span>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "20px", color: colors.foreground }}>
          {isEdit ? t("Tovarni tahrirlash") : t("Yangi tovar qo'shish")}
        </h2>
        <p className="text-muted" style={{ fontSize: "12px", marginTop: "2px" }}>
          {t("Mahsulot parametrlari, narxlari va ombor qoldig'ini kiriting")}
        </p>
      </div>

      {/* Unit choice */}
      <div>
        <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "8px", fontWeight: 500 }}>
          {t("O'lchov birligi")}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {([
            { value: "dona", label: t("Dona"), icon: "🔢" },
            { value: "kg", label: t("Kilogramm") + " (kg)", icon: "⚖️" },
            { value: "m", label: t("Metr") + " (m)", icon: "📏" },
          ] as const).filter((opt) => opt.value === unit || !settings.disabledUnits?.includes(opt.value)).map((opt) => {
            const active = unit === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUnit(opt.value)}
                className="btn-secondary"
                style={{
                  padding: "12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: active ? `${colors.primary}12` : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? "2.5px" : "1px",
                  color: active ? colors.primary : colors.foreground,
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                <span style={{ fontSize: "20px" }}>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main form */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Name */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
            {t("Mahsulot nomi")}
          </label>
          <input
            type="text"
            className="input-field"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder={
              unit === "kg"
                ? t("Masalan: Olma, Kartoshka...")
                : unit === "m"
                ? t("Masalan: Alyumin profil, Kabel...")
                : t("Masalan: iPhone 15 Pro Max qopqoq")
            }
            style={{ borderColor: errors.name ? colors.destructive : colors.border }}
          />
          {errors.name && <span style={{ fontSize: "11px", color: colors.destructive, marginTop: "2px", display: "block" }}>{errors.name}</span>}
        </div>

        {/* Brand */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
            {unit === "kg" ? t("Navi yoki Turi (ixtiyoriy)") : t("Brend / Ishlab chiqaruvchi (ixtiyoriy)")}
          </label>
          <input
            type="text"
            className="input-field"
            value={form.brand}
            onChange={(e) => handleChange("brand", e.target.value)}
            placeholder={
              unit === "kg"
                ? t("Masalan: Samarqand, Lazer...")
                : unit === "m"
                ? t("Masalan: Xitoy, O'zbekiston...")
                : t("Masalan: Apple, Samsung, Xiaomi")
            }
            style={{ borderColor: errors.brand ? colors.destructive : colors.border }}
          />
          {errors.brand && <span style={{ fontSize: "11px", color: colors.destructive, marginTop: "2px", display: "block" }}>{errors.brand}</span>}
        </div>

        {/* Prices row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
              {t("Tan narxi (UZS)")}
            </label>
            <input
              type="text"
              className="input-field"
              value={form.costPrice}
              onChange={(e) => handleChange("costPrice", e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              style={{ borderColor: errors.costPrice ? colors.destructive : colors.border }}
            />
            {errors.costPrice && <span style={{ fontSize: "11px", color: colors.destructive, marginTop: "2px", display: "block" }}>{errors.costPrice}</span>}
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
              {t("Sotuv narxi (UZS)")}
            </label>
            <input
              type="text"
              className="input-field"
              value={form.salePrice}
              onChange={(e) => handleChange("salePrice", e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              style={{ borderColor: errors.salePrice ? colors.destructive : colors.border }}
            />
            {errors.salePrice && <span style={{ fontSize: "11px", color: colors.destructive, marginTop: "2px", display: "block" }}>{errors.salePrice}</span>}
          </div>
        </div>

        {/* Stock quantity */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
            {t("Ombor qoldig'i")} ({unit === "dona" ? t("Dona") : unit === "kg" ? t("Kg") : t("Metr")})
          </label>
          <input
            type="text"
            className="input-field"
            value={form.quantity}
            onChange={(e) => handleChange("quantity", e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            style={{ borderColor: errors.quantity ? colors.destructive : colors.border }}
          />
          {errors.quantity && <span style={{ fontSize: "11px", color: colors.destructive, marginTop: "2px", display: "block" }}>{errors.quantity}</span>}
        </div>

        {/* Thickness (only if unit is metr) */}
        {unit === "m" && (
          <div>
            <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
              {t("Profil qalinligi (mm, ixtiyoriy)")}
            </label>
            <input
              type="text"
              className="input-field"
              value={form.thickness}
              onChange={(e) => handleChange("thickness", e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder={t("Masalan:") + " 1.2"}
            />
          </div>
        )}

        {/* Barcode input & Scan buttons */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px", fontWeight: 500 }}>
            {t("Shtrix-kod (Skaner)")}
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              className="input-field"
              value={form.barcode}
              onChange={(e) => handleChange("barcode", e.target.value.replace(/\s/g, ""))}
              placeholder={t("Barcode raqami...")}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCameraScannerOpen(true)}
              style={{ padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <span className="material-icons">qr_code_scanner</span>
            </button>
          </div>
          <p className="text-muted" style={{ fontSize: "11px", marginTop: "4px" }}>
            {t("Maslahat: Jismoniy skaner quroli yordamida shtrix-kodni to'g'ridan-to'g'ri skanerlashingiz ham mumkin.")}
          </p>
        </div>

        {/* Image upload */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "8px", fontWeight: 500 }}>
            {t("Mahsulot rasmi")}
          </label>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {imageUrl ? (
              <div style={{ position: "relative" }}>
                <img
                  src={imageUrl}
                  alt="Product"
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "12px",
                    objectFit: "cover",
                    backgroundColor: colors.muted,
                    border: `1px solid ${colors.border}`
                  }}
                />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    backgroundColor: colors.destructive,
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <span className="material-icons" style={{ fontSize: "14px" }}>close</span>
                </button>
              </div>
            ) : (
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "12px",
                border: `2px dashed ${colors.border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: colors.mutedForeground,
                backgroundColor: colors.card
              }}>
                <span className="material-icons" style={{ fontSize: "24px" }}>image</span>
                <span style={{ fontSize: "9px", marginTop: "2px", fontWeight: 600 }}>{t("Rasm yo'q")}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <input
                type="file"
                id="product-image-file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="btn-secondary"
                disabled={imageUploading}
                onClick={() => document.getElementById("product-image-file")?.click()}
                style={{ fontSize: "12px", padding: "8px 12px" }}
              >
                {imageUploading ? t("Yuklanmoqda...") : t("Rasm tanlash")}
              </button>
              <span className="text-muted" style={{ fontSize: "11px" }}>
                Max: 5MB (Format: JPG, PNG, WEBP)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={cameraScannerOpen}
        onClose={() => setCameraScannerOpen(false)}
        onScan={(code) => {
          setForm((prev) => ({ ...prev, barcode: code }));
          setCameraScannerOpen(false);
        }}
      />

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        <button
          className="btn-secondary"
          onClick={() => setLocation("/products")}
          style={{ flex: 1 }}
          disabled={isPending}
        >
          {t("Bekor qilish")}
        </button>
        <button
          className="btn-primary"
          onClick={handleSave}
          style={{ flex: 1 }}
          disabled={isPending}
        >
          {isPending ? t("Saqlanmoqda...") : t("Saqlash")}
        </button>
      </div>
    </div>
  );
}

export default function ProductForm() {
  const { subscriptionActive } = useAuth();
  const { t } = useTranslation();
  if (!subscriptionActive) return <SubscriptionLockScreen screenName={t("Mahsulot formasi")} />;
  return <ProductFormScreenInner />;
}
