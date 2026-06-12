import React, { useState } from "react";
import { useLocation } from "wouter";
import { useColors } from "../../hooks/useColors";

export default function WorkerRegister() {
  const [, setLocation] = useLocation();
  const colors = useColors();

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "+998 ",
    password: "",
    storeName: "",
    storeId: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) nextErrors.name = "Ismingiz kamida 2 ta harf bo'lishi shart";
    if (form.address.trim().length < 2) nextErrors.address = "Manzil kiritilishi shart";
    
    const phoneDigits = form.phone.replace(/[\s+]/g, "");
    if (phoneDigits.length !== 12 || !phoneDigits.startsWith("998")) {
      nextErrors.phone = "Telefon raqami noto'g'ri (masalan: +998 90 123 45 67)";
    }

    if (form.password.length < 4) {
      nextErrors.password = "Parol kamida 4 ta belgidan iborat bo'lishi shart";
    }

    if (form.storeName.trim().length < 2) nextErrors.storeName = "Do'kon nomi kiritilishi shart";
    if (!/^[A-Z]{2}\d{8}$/.test(form.storeId.trim().toUpperCase())) {
      nextErrors.storeId = "Do'kon ID kodi 2 ta katta harf va 8 ta raqam bo'lishi shart";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGeneralError(null);

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.replace(/[\s+]/g, ""),
      password: form.password.trim(),
      storeName: form.storeName.trim(),
      storeId: form.storeId.trim().toUpperCase(),
    };

    try {
      const res = await fetch("/api/auth/worker-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ro'yxatdan o'tishda xatolik");

      setLocation("/worker-pending");
    } catch (err: any) {
      setGeneralError(err.message || "Tizimda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      flex: 1,
      padding: "24px",
      backgroundColor: colors.background,
      minHeight: "100vh",
      paddingBottom: "40px"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "24px", position: "relative", width: "100%" }}>
        <button
          onClick={() => setLocation("/worker-login")}
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: colors.mutedForeground,
            cursor: "pointer",
            display: "flex",
            alignItems: "center"
          }}
        >
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 style={{ fontSize: "20px", color: colors.foreground, display: "inline-block" }}>
          Sotuvchi ro'yxati
        </h1>
        <p className="text-muted" style={{ fontSize: "12px", marginTop: "4px" }}>
          Yangi ishchi hisobini ochish
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
        {generalError && (
          <div style={{
            backgroundColor: "#FEE2E2",
            border: "1px solid #EF4444",
            borderRadius: "12px",
            padding: "12px",
            color: "#B91C1C",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span className="material-icons" style={{ fontSize: "18px" }}>error_outline</span>
            <span>{generalError}</span>
          </div>
        )}

        {/* Name */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Ism Familiya
          </label>
          <input
            type="text"
            className="input-field"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="To'liq ism familiyangiz"
            required
            disabled={loading}
          />
          {errors.name && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.name}</div>}
        </div>

        {/* Address */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Yashash joyi manzili
          </label>
          <input
            type="text"
            className="input-field"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Viloyat, shahar, tuman..."
            required
            disabled={loading}
          />
          {errors.address && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.address}</div>}
        </div>

        {/* Phone */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Telefon raqami
          </label>
          <input
            type="tel"
            className="input-field"
            value={form.phone}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length < 5) {
                handleChange("phone", "+998 ");
                return;
              }
              const mainDigits = val.slice(5).replace(/\D/g, "");
              const code = mainDigits.slice(0, 2);
              const part1 = mainDigits.slice(2, 5);
              const part2 = mainDigits.slice(5, 7);
              const part3 = mainDigits.slice(7, 9);
              let formatted = "+998 ";
              if (code) formatted += code;
              if (part1) formatted += " " + part1;
              if (part2) formatted += " " + part2;
              if (part3) formatted += " " + part3;
              handleChange("phone", formatted);
            }}
            maxLength={17}
            required
            disabled={loading}
          />
          {errors.phone && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.phone}</div>}
        </div>

        {/* Password */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Parol
          </label>
          <input
            type="password"
            className="input-field"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            placeholder="Kamida 4 ta belgi..."
            required
            disabled={loading}
          />
          {errors.password && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.password}</div>}
        </div>

        {/* Store Name */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Do'kon nomi (boshliqniki bilan bir xil bo'lishi shart)
          </label>
          <input
            type="text"
            className="input-field"
            value={form.storeName}
            onChange={(e) => handleChange("storeName", e.target.value)}
            placeholder="Boshliq belgilagan do'kon nomi"
            required
            disabled={loading}
          />
          {errors.storeName && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.storeName}</div>}
        </div>

        {/* Store ID */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Do'kon ID kodi (masalan: AB12345678)
          </label>
          <input
            type="text"
            className="input-field"
            value={form.storeId}
            onChange={(e) => handleChange("storeId", e.target.value.toUpperCase())}
            placeholder="AB12345678"
            maxLength={10}
            required
            disabled={loading}
          />
          {errors.storeId && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.storeId}</div>}
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: "10px" }}>
          {loading ? "Arizangiz yuborilmoqda..." : "Ro'yxatdan o'tish"}
        </button>
      </form>
    </div>
  );
}
export { WorkerRegister };
