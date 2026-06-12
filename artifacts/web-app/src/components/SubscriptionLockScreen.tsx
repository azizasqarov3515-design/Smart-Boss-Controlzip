import React, { useState } from "react";
import { useColors } from "../hooks/useColors";

interface Props {
  screenName?: string;
}

export function SubscriptionLockScreen({ screenName }: Props) {
  const colors = useColors();
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleBuySubscription = async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contact");
      if (res.ok) {
        const data = await res.json() as { adminPhone?: string };
        setPhone(data.adminPhone ?? null);
      }
    } catch {
      setPhone(null);
    } finally {
      setLoading(false);
      setFetched(true);
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
      minHeight: "80vh"
    }}>
      <div className="card-standard" style={{
        maxWidth: "380px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "28px"
      }}>
        <div style={{
          width: "96px",
          height: "96px",
          borderRadius: "50%",
          backgroundColor: `${colors.primary}22`,
          border: `2px solid ${colors.primary}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          color: colors.primary
        }}>
          <span className="material-icons" style={{ fontSize: "48px" }}>lock</span>
        </div>

        <h3 style={{ fontSize: "20px", color: colors.foreground, marginBottom: "4px" }}>
          {screenName ? `"${screenName}" bo'limi` : "Bu bo'lim"}
        </h3>
        <p className="text-muted" style={{ fontSize: "14px", marginBottom: "20px" }}>
          faqat faol obuna bilan ishlaydi
        </p>

        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          borderRadius: "12px",
          padding: "12px 14px",
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.secondary,
          color: colors.mutedForeground,
          fontSize: "13px",
          textAlign: "left",
          lineHeight: "20px",
          marginBottom: "24px",
          width: "100%"
        }}>
          <span className="material-icons" style={{ fontSize: "16px", marginTop: "2px" }}>info_outline</span>
          <span>
            Avval obuna paketini sotib oling, so'ng admin tomonidan faollashtiriladi
          </span>
        </div>

        {!fetched ? (
          <button
            className="btn-primary"
            onClick={handleBuySubscription}
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? (
              <span>Yuklanmoqda…</span>
            ) : (
              <>
                <span className="material-icons">shopping_cart</span>
                <span>Obuna sotib olish</span>
              </>
            )}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "12px" }}>
            {phone ? (
              <>
                <span style={{ fontSize: "13px", color: colors.mutedForeground, fontWeight: 500 }}>
                  Admin telefon raqami:
                </span>
                <a
                  href={`tel:${phone}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "14px",
                    borderRadius: "14px",
                    border: "2px solid #16a34a",
                    backgroundColor: "#16a34a1a",
                    color: "#16a34a",
                    fontSize: "20px",
                    fontWeight: 700,
                    textDecoration: "none",
                    letterSpacing: "0.5px"
                  }}
                >
                  <span className="material-icons">phone</span>
                  <span>{phone}</span>
                </a>
                <span style={{ fontSize: "12px", color: colors.mutedForeground, lineHeight: "18px" }}>
                  To'lovni amalga oshiring, admin obunangizni faollashtiradi
                </span>
              </>
            ) : (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                borderRadius: "12px",
                padding: "12px 14px",
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.secondary,
                color: colors.mutedForeground,
                fontSize: "13px",
                lineHeight: "20px",
                textAlign: "left"
              }}>
                <span className="material-icons">phone_disabled</span>
                <span>
                  Admin telefon raqami hali kiritilmagan.<br />Keyinroq urinib ko'ring.
                </span>
              </div>
            )}

            <button
              className="btn-secondary"
              onClick={() => { setFetched(false); setPhone(null); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 16px",
                fontSize: "13px",
                border: `1px solid ${colors.border}`,
                borderRadius: "10px",
                marginTop: "4px",
                cursor: "pointer"
              }}
            >
              <span className="material-icons" style={{ fontSize: "16px" }}>refresh</span>
              <span>Qayta urinish</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default SubscriptionLockScreen;
