import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../contexts/AuthContext";
import { useColors } from "../../hooks/useColors";

export default function Login() {
  const [, setLocation] = useLocation();
  const colors = useColors();
  const { login } = useAuth();

  const [loginCode, setLoginCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recovery States
  const [forgotModal, setForgotModal] = useState(false);
  const [recoverPhone, setRecoverPhone] = useState("+998 ");
  const [recoverStoreId, setRecoverStoreId] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recoverSent, setRecoverSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [sentStore, setSentStore] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = loginCode.trim().toUpperCase();
    const cleanPass = password.trim();

    if (cleanCode.length !== 8) {
      setError("Login kodi 8 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (cleanPass.length !== 6 || !/^\d+$/.test(cleanPass)) {
      setError("Parol 6 ta raqamdan iborat bo'lishi kerak");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(cleanCode, cleanPass);
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = recoverPhone.replace(/[\s+]/g, "");
    const storeId = recoverStoreId.trim().toUpperCase();

    if (phone.length !== 12 || !phone.startsWith("998")) {
      setRecoverError("Telefon raqami noto'g'ri (masalan: +998 90 123 45 67)");
      return;
    }
    if (!/^[A-Z]{2}\d{8}$/.test(storeId)) {
      setRecoverError("Do'kon ID kodi noto'g'ri (masalan: AB12345678)");
      return;
    }

    setRecoverLoading(true);
    setRecoverError(null);
    try {
      const res = await fetch("/api/auth/forgot-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, storeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Yuborishda xato yuz berdi");

      setSentEmail(data.email || "Sizning email");
      setSentStore(data.storeName || "");
      setRecoverSent(true);
    } catch (err: any) {
      setRecoverError(err.message || "Tizimda xatolik yuz berdi");
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      padding: "24px",
      backgroundColor: colors.background,
      minHeight: "100vh"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px", position: "relative", width: "100%" }}>
        <button
          onClick={() => setLocation("/role-select")}
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
        <h1 style={{ fontSize: "24px", color: colors.foreground, display: "inline-block" }}>
          Rahbar bo'limi
        </h1>
        <p className="text-muted" style={{ fontSize: "13px", marginTop: "4px" }}>
          Hisobingizga kiring
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
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
            <span>{error}</span>
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: colors.mutedForeground, marginBottom: "6px" }}>
            Login kodi (8 ta belgi)
          </label>
          <div style={{ position: "relative" }}>
            <span className="material-icons" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: colors.mutedForeground, fontSize: "20px" }}>
              vpn_key
            </span>
            <input
              type="text"
              className="input-field"
              value={loginCode}
              onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
              placeholder="Masalan: AB12CD34"
              maxLength={8}
              style={{ paddingLeft: "45px" }}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: colors.mutedForeground, marginBottom: "6px" }}>
            Parol (6 ta raqam)
          </label>
          <div style={{ position: "relative" }}>
            <span className="material-icons" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: colors.mutedForeground, fontSize: "20px" }}>
              lock
            </span>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              maxLength={6}
              style={{ paddingLeft: "45px" }}
              required
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: "8px" }}>
          {loading ? "Kirilmoqda..." : "Tizimga kirish"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "13px" }}>
          <span
            onClick={() => setForgotModal(true)}
            style={{ color: colors.primary, cursor: "pointer", fontWeight: 500 }}
          >
            Login/Parolni unutdingizmi?
          </span>
          <span
            onClick={() => setLocation("/manager-register")}
            style={{ color: colors.primary, cursor: "pointer", fontWeight: 500 }}
          >
            Ro'yxatdan o'tish
          </span>
        </div>
      </form>

      {/* Recover Modal */}
      {forgotModal && (
        <div className="modal-backdrop" onClick={() => { if (!recoverLoading) setForgotModal(false); }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span className="material-icons" style={{ color: colors.primary, fontSize: "24px" }}>help_outline</span>
              <h2 style={{ fontSize: "18px", color: colors.foreground }}>Ma'lumotlarni tiklash</h2>
            </div>

            {!recoverSent ? (
              <form onSubmit={handleRecover} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <p className="text-muted" style={{ fontSize: "13px", lineHeight: "19px" }}>
                  Profilga bog'langan telefon raqami va do'kon ID kodini kiriting. Tizim email manzilingizga vaqtinchalik hisob ma'lumotlarini yuboradi.
                </p>

                {recoverError && (
                  <div style={{
                    backgroundColor: "#FEE2E2",
                    border: "1px solid #EF4444",
                    borderRadius: "12px",
                    padding: "10px",
                    color: "#B91C1C",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <span className="material-icons" style={{ fontSize: "16px" }}>error_outline</span>
                    <span>{recoverError}</span>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                    Telefon raqam
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    value={recoverPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length < 5) {
                        setRecoverPhone("+998 ");
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
                      setRecoverPhone(formatted);
                    }}
                    maxLength={17}
                    required
                    disabled={recoverLoading}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                    Do'kon ID (masalan: AB12345678)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={recoverStoreId}
                    onChange={(e) => setRecoverStoreId(e.target.value.toUpperCase())}
                    maxLength={10}
                    placeholder="AB12345678"
                    required
                    disabled={recoverLoading}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setForgotModal(false)}
                    style={{ flex: 1 }}
                    disabled={recoverLoading}
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1 }}
                    disabled={recoverLoading}
                  >
                    {recoverLoading ? "Yuborilmoqda..." : "Tiklash"}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center", padding: "10px 0" }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  backgroundColor: "#E8F5E9",
                  color: "#2E7D32",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto"
                }}>
                  <span className="material-icons" style={{ fontSize: "32px" }}>check_circle</span>
                </div>
                <h3 style={{ fontSize: "16px", color: colors.foreground }}>Xabar yuborildi!</h3>
                <p className="text-muted" style={{ fontSize: "13px", lineHeight: "20px" }}>
                  {sentStore ? `"${sentStore}" ` : ""}hisobiga bog'langan <strong style={{ color: colors.foreground }}>{sentEmail}</strong> manziliga yangi kirish ma'lumotlari yuborildi.
                </p>
                <div style={{ fontSize: "11px", color: "#F57C00", backgroundColor: "#FFF3E0", padding: "8px", borderRadius: "8px" }}>
                  ⚠️ Kirganingizdan so'ng darhol parolingizni o'zgartiring!
                </div>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setForgotModal(false);
                    setRecoverSent(false);
                    setRecoverPhone("+998 ");
                    setRecoverStoreId("");
                  }}
                  style={{ width: "100%", marginTop: "8px" }}
                >
                  Yopish
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export { Login };
