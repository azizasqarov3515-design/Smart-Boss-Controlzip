import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../contexts/AuthContext";
import { useColors } from "../../hooks/useColors";

export default function ManagerRegister() {
  const [, setLocation] = useLocation();
  const colors = useColors();
  const { loginWithData } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    address: "",
    phone: "+998 ",
    email: "",
    storeName: "",
    storeAddress: "",
    storeId: "",
    login: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (form.fullName.trim().length < 2) nextErrors.fullName = "Ism va familiya kamida 2 ta harfdan iborat bo'lishi kerak";
    if (form.address.trim().length < 2) nextErrors.address = "Yashash joyi kiritilishi shart";
    
    const phoneDigits = form.phone.replace(/[\s+]/g, "");
    if (phoneDigits.length !== 12 || !phoneDigits.startsWith("998")) {
      nextErrors.phone = "Telefon raqami noto'g'ri (masalan: +998 90 123 45 67)";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Email manzil noto'g'ri";
    }

    if (form.storeName.trim().length < 2) nextErrors.storeName = "Do'kon nomi kiritilishi shart";
    if (form.storeAddress.trim().length < 2) nextErrors.storeAddress = "Do'kon manzili kiritilishi shart";

    if (!/^[A-Z]{2}\d{8}$/.test(form.storeId)) {
      nextErrors.storeId = "Do'kon ID 2 ta katta harf va 8 ta raqam bo'lishi shart (masalan: AB12345678)";
    }

    if (!/^[A-Z0-9]{8}$/.test(form.login)) {
      nextErrors.login = "Login 8 ta katta harf va raqamlardan iborat bo'lishi shart (masalan: MYLOGIN8)";
    }

    if (form.password.length !== 6 || !/^\d+$/.test(form.password)) {
      nextErrors.password = "Parol 6 ta raqamdan iborat bo'lishi shart";
    }

    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Parollar mos kelmadi";
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
      fullName: form.fullName.trim(),
      address: form.address.trim(),
      phone: form.phone.replace(/[\s+]/g, ""),
      email: form.email.trim().toLowerCase(),
      storeName: form.storeName.trim(),
      storeAddress: form.storeAddress.trim(),
      storeId: form.storeId.trim().toUpperCase(),
      login: form.login.trim().toUpperCase(),
      password: form.password,
    };

    try {
      const res = await fetch("/api/auth/manager-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ro'yxatdan o'tishda xato yuz berdi");

      // Auto login
      await loginWithData(data);
      setLocation("/");
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
          onClick={() => setLocation("/login")}
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
          Ro'yxatdan o'tish
        </h1>
        <p className="text-muted" style={{ fontSize: "12px", marginTop: "4px" }}>
          Yangi rahbar hisobini ochish
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

        {/* Full Name */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Ism Familiya
          </label>
          <input
            type="text"
            className="input-field"
            value={form.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder="To'liq ism familiyangiz"
            required
            disabled={loading}
          />
          {errors.fullName && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.fullName}</div>}
        </div>

        {/* Address */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Yashash joyi
          </label>
          <input
            type="text"
            className="input-field"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Shahar, ko'cha, uy raqami"
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

        {/* Email */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Email manzil
          </label>
          <input
            type="email"
            className="input-field"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="example@gmail.com"
            required
            disabled={loading}
          />
          <span style={{ fontSize: "10px", color: colors.mutedForeground, display: "block", marginTop: "2px" }}>
            Parolni unutsangiz tiklash uchun ishlatiladi
          </span>
          {errors.email && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.email}</div>}
        </div>

        {/* Store Name */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Do'kon nomi
          </label>
          <input
            type="text"
            className="input-field"
            value={form.storeName}
            onChange={(e) => handleChange("storeName", e.target.value)}
            placeholder="Do'koningiz nomi"
            required
            disabled={loading}
          />
          {errors.storeName && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.storeName}</div>}
        </div>

        {/* Store Address */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Do'kon manzili
          </label>
          <input
            type="text"
            className="input-field"
            value={form.storeAddress}
            onChange={(e) => handleChange("storeAddress", e.target.value)}
            placeholder="Do'kon joylashgan manzil"
            required
            disabled={loading}
          />
          {errors.storeAddress && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.storeAddress}</div>}
        </div>

        {/* Store ID */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Do'kon ID (2 ta harf + 8 ta raqam)
          </label>
          <input
            type="text"
            className="input-field"
            value={form.storeId}
            onChange={(e) => handleChange("storeId", e.target.value.toUpperCase())}
            placeholder="Masalan: AB12345678"
            maxLength={10}
            required
            disabled={loading}
          />
          {errors.storeId && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.storeId}</div>}
        </div>

        {/* Login */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Login kodi (8 ta harf/raqam)
          </label>
          <input
            type="text"
            className="input-field"
            value={form.login}
            onChange={(e) => handleChange("login", e.target.value.toUpperCase())}
            placeholder="Masalan: MYLOGIN8"
            maxLength={8}
            required
            disabled={loading}
          />
          {errors.login && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.login}</div>}
        </div>

        {/* Password */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Parol (6 ta raqam)
          </label>
          <input
            type="password"
            className="input-field"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            maxLength={6}
            required
            disabled={loading}
          />
          {errors.password && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.password}</div>}
        </div>

        {/* Confirm Password */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
            Parol tasdig'i
          </label>
          <input
            type="password"
            className="input-field"
            value={form.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            maxLength={6}
            required
            disabled={loading}
          />
          {errors.confirmPassword && <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px" }}>{errors.confirmPassword}</div>}
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: "10px" }}>
          {loading ? "Ro'yxatdan o'tkazilmoqda..." : "Ro'yxatdan o'tish"}
        </button>
      </form>
    </div>
  );
}
export { ManagerRegister };
