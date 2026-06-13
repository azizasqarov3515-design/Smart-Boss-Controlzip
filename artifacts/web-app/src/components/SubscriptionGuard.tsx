import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/LanguageContext";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

function formatDate(d: Date | null, lang: string = "uz"): string {
  if (!d) return "";
  const locale = lang === "ru" ? "ru-RU" : "uz-UZ";
  return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { t, language } = useTranslation();
  const {
    subscriptionPlan,
    subscriptionExpired,
    subscriptionDaysLeft,
    subscriptionEnd,
    subscriptionActive,
    isAuthenticated,
    logout,
    blocked,
    deleteAccount,
  } = useAuth();
  
  const [deleting, setDeleting] = useState(false);

  if (!isAuthenticated) return <>{children}</>;

  // Show BLOCKED screen
  if (blocked) {
    const handleDeleteProfile = async () => {
      const confirmDelete = window.confirm(
        `${t("Profilni yo'q qilish")}\n\n${t("Barcha ma'lumotlaringiz — login, parol, do'kon ID, sotuvchilar — butunlay o'chiriladi. Bu amal qaytarib bo'lmaydi!")}`
      );
      if (confirmDelete) {
        setDeleting(true);
        try {
          await deleteAccount();
        } catch (err) {
          alert(t("Profilni o'chirishda xato yuz berdi. Qayta urinib ko'ring."));
        } finally {
          setDeleting(false);
        }
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
        backgroundColor: "#0A0E1A",
        minHeight: "100vh"
      }}>
        <div className="card-standard" style={{
          maxWidth: "360px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          border: "1px solid #7f1d1d",
          padding: "32px 24px"
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "#2D1A1A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px"
          }}>
            <span className="material-icons" style={{ fontSize: "48px", color: "#EF4444" }}>gpp_bad</span>
          </div>
          <h2 style={{ color: "#EF4444", marginBottom: "12px", fontSize: "20px" }}>
            {t("Siz tizim tomonidan")}<br />{t("to'liq bloklandingiz")}
          </h2>
          <p className="text-muted" style={{ fontSize: "14px", lineHeight: "22px", marginBottom: "20px" }}>
            {t("Barcha imkoniyatlar cheklangan.")}<br />
            {t("Faqat profilingizni butunlay o'chirishingiz mumkin.")}
          </p>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#2A0A0A",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #EF4444",
            color: "#EF4444",
            fontSize: "12px",
            fontWeight: 500,
            marginBottom: "28px"
          }}>
            <span className="material-icons" style={{ fontSize: "16px" }}>block</span>
            <span>{t("Administrator tomonidan bloklangan")}</span>
          </div>
          <button
            className="btn-primary"
            onClick={handleDeleteProfile}
            disabled={deleting}
            style={{
              backgroundColor: "#7F1D1D",
              borderColor: "#EF4444",
              borderWidth: "1px",
              width: "100%",
              boxShadow: "none"
            }}
          >
            {deleting ? (
              <span>{t("O'chirilmoqda...")}</span>
            ) : (
              <>
                <span className="material-icons">delete_forever</span>
                <span>{t("Profilni yo'q qilish")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Show subscription expired screen
  if ((subscriptionEnd !== null || subscriptionPlan === "unlimited") && (subscriptionExpired || !subscriptionActive)) {
    const handleLogout = async () => {
      const confirmLogout = window.confirm(t("Tizimdan chiqishni xohlaysizmi?"));
      if (confirmLogout) {
        await logout();
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
        backgroundColor: "#0A0E1A",
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
            backgroundColor: "#2D1A1A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px"
          }}>
            <span className="material-icons" style={{ fontSize: "48px", color: "#EF4444" }}>block</span>
          </div>
          <h2 style={{ color: "#EF4444", marginBottom: "12px", fontSize: "20px" }}>
            {t("Obuna muddati tugagan")}
          </h2>
          <p className="text-muted" style={{ fontSize: "14px", lineHeight: "22px", marginBottom: "20px" }}>
            {t("Tizimdan foydalanish uchun obunangizni yangilang.")}<br />
            {t("Administrator bilan bog'laning.")}
          </p>
          {subscriptionEnd && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#2D1A1A",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.27)",
              color: "#EF4444",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "24px"
            }}>
              <span className="material-icons" style={{ fontSize: "16px" }}>event_busy</span>
              <span>{t("Tugagan:")} {formatDate(subscriptionEnd, language)}</span>
            </div>
          )}
          <button className="btn-secondary" onClick={handleLogout} style={{ gap: "8px" }}>
            <span className="material-icons">logout</span>
            <span>{t("Chiqish")}</span>
          </button>
        </div>
      </div>
    );
  }

  // Warning banner if 3 days or less left
  const showWarning = subscriptionActive && subscriptionDaysLeft !== null && subscriptionDaysLeft <= 3 && subscriptionDaysLeft > 0;

  return (
    <>
      {showWarning && (
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          backgroundColor: subscriptionDaysLeft === 1 ? "#EF4444" : "#F59E0B",
          color: "white",
          fontSize: "13px",
          fontWeight: 600,
          gap: "8px"
        }}>
          <span className="material-icons" style={{ fontSize: "18px" }}>warning</span>
          <span style={{ flex: 1 }}>
            {subscriptionDaysLeft === 1
              ? `⚠️ ${t("Obuna bugun tugaydi! Yangilang.")}`
              : `⚠️ ${t("Obuna")} ${subscriptionDaysLeft} ${t("kun ichida tugaydi")} (${formatDate(subscriptionEnd, language)})`}
          </span>
        </div>
      )}
      {children}
    </>
  );
}
export default SubscriptionGuard;
