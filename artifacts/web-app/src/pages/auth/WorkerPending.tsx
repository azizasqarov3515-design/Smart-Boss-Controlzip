import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../contexts/AuthContext";
import { useColors } from "../../hooks/useColors";

export default function WorkerPending() {
  const [, setLocation] = useLocation();
  const colors = useColors();
  const { logout, refreshWorkerStatus, workerStatus } = useAuth();
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const status = await refreshWorkerStatus();
      if (status === "approved") {
        setLocation("/pos");
      } else if (status === "rejected") {
        alert("Ruxsat bekor qilindi. Ro'yxatdan o'tish arizangiz rad etildi.");
        await logout();
        setLocation("/role-select");
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Redirect immediately if already approved
    if (workerStatus === "approved") {
      setLocation("/pos");
      return;
    }

    // Auto-poll status every 10 seconds
    const interval = setInterval(async () => {
      const status = await refreshWorkerStatus();
      if (status === "approved") {
        setLocation("/pos");
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [workerStatus, refreshWorkerStatus, setLocation]);

  const handleCancel = async () => {
    const confirmLogout = window.confirm("Arizani bekor qilib tizimdan chiqmoqchimisiz?");
    if (confirmLogout) {
      await logout();
      setLocation("/role-select");
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
      <div className="card-standard" style={{
        maxWidth: "360px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "32px 24px"
      }}>
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          backgroundColor: `${colors.warning}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          color: colors.warning
        }}>
          <span className="material-icons" style={{ fontSize: "48px" }}>hourglass_empty</span>
        </div>

        <h2 style={{ fontSize: "20px", color: colors.foreground, marginBottom: "12px" }}>
          Tasdiqlash kutilmoqda
        </h2>
        <p className="text-muted" style={{ fontSize: "14px", lineHeight: "22px", marginBottom: "24px" }}>
          Sotuvchi sifatida ro'yxatdan o'tganingiz uchun rahmat. Iltimos, do'kon rahbari arizangizni tasdiqlashini kuting.
        </p>

        <div style={{
          backgroundColor: colors.secondary,
          padding: "10px",
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
          fontSize: "12px",
          color: colors.mutedForeground,
          marginBottom: "28px"
        }}>
          Holat: <strong>Kutilmoqda (Pending)</strong>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "10px" }}>
          <button
            className="btn-primary"
            onClick={checkStatus}
            disabled={checking}
            style={{ width: "100%" }}
          >
            {checking ? "Tekshirilmoqda..." : "Hozir tekshirish"}
          </button>
          
          <button
            className="btn-secondary"
            onClick={handleCancel}
            style={{ width: "100%" }}
          >
            Arizani bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
}
export { WorkerPending };
