import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../contexts/AuthContext";
import { useColors } from "../../hooks/useColors";

export default function WorkerLogin() {
  const [, setLocation] = useLocation();
  const colors = useColors();
  const { loginWorker } = useAuth();

  const [phone, setPhone] = useState("+998 ");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[\s+]/g, "");
    const cleanPass = password.trim();

    if (cleanPhone.length !== 12 || !cleanPhone.startsWith("998")) {
      setError("Telefon raqami noto'g'ri (masalan: +998 90 123 45 67)");
      return;
    }
    if (cleanPass.length < 4) {
      setError("Parol kamida 4 ta belgidan iborat bo'lishi kerak");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await loginWorker(cleanPhone, cleanPass);
      if (res.status === "approved") {
        setLocation("/pos");
      } else {
        setLocation("/worker-pending");
      }
    } catch (err: any) {
      setError(err.message || "Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
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
          Sotuvchi bo'limi
        </h1>
        <p className="text-muted" style={{ fontSize: "13px", marginTop: "4px" }}>
          Tizimga kirish
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
            Telefon raqami
          </label>
          <div style={{ position: "relative" }}>
            <span className="material-icons" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: colors.mutedForeground, fontSize: "20px" }}>
              phone
            </span>
            <input
              type="tel"
              className="input-field"
              value={phone}
              onChange={(e) => {
                const val = e.target.value;
                if (val.length < 5) {
                  setPhone("+998 ");
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
                setPhone(formatted);
              }}
              maxLength={17}
              style={{ paddingLeft: "45px" }}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: colors.mutedForeground, marginBottom: "6px" }}>
            Parol
          </label>
          <div style={{ position: "relative" }}>
            <span className="material-icons" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: colors.mutedForeground, fontSize: "20px" }}>
              lock
            </span>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolingiz..."
              style={{ paddingLeft: "45px" }}
              required
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: "8px" }}>
          {loading ? "Kirilmoqda..." : "Kassaga kirish"}
        </button>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "10px", fontSize: "13px" }}>
          <span
            onClick={() => setLocation("/worker-register")}
            style={{ color: colors.primary, cursor: "pointer", fontWeight: 500 }}
          >
            Sotuvchi sifatida ro'yxatdan o'tish
          </span>
        </div>
      </form>
    </div>
  );
}
export { WorkerLogin };
