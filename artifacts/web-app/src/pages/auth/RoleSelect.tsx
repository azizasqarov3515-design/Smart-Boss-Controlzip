import { useLocation } from "wouter";
import { useColors } from "../../hooks/useColors";

export default function RoleSelect() {
  const [, setLocation] = useLocation();
  const colors = useColors();

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
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "28px", color: colors.foreground, marginBottom: "8px" }}>
          SMARTBOSScontrol
        </h1>
        <p className="text-muted" style={{ fontSize: "14px" }}>
          Do'kon boshqaruv tizimiga xush kelibsiz
        </p>
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Manager Card */}
        <div
          className="card-glow-blue"
          onClick={() => setLocation("/login")}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "18px",
            padding: "24px"
          }}
        >
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            backgroundColor: `${colors.primary}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.primary
          }}>
            <span className="material-icons" style={{ fontSize: "32px" }}>storefront</span>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "18px", color: colors.foreground, marginBottom: "4px" }}>
              Rahbar
            </h3>
            <p className="text-muted" style={{ fontSize: "12px" }}>
              Do'kon egasi, tovarlar, sotuv va ishchilar boshqaruvi
            </p>
          </div>
          <span className="material-icons" style={{ color: colors.primary }}>arrow_forward_ios</span>
        </div>

        {/* Worker Card */}
        <div
          className="card-glow-orange"
          onClick={() => setLocation("/worker-login")}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "18px",
            padding: "24px"
          }}
        >
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            backgroundColor: `${colors.warning}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.warning
          }}>
            <span className="material-icons" style={{ fontSize: "32px" }}>badge</span>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "18px", color: colors.foreground, marginBottom: "4px" }}>
              Sotuvchi (Xodim)
            </h3>
            <p className="text-muted" style={{ fontSize: "12px" }}>
              Kassa (POS) orqali savdolar qilish va mijozlar ro'yxati
            </p>
          </div>
          <span className="material-icons" style={{ color: colors.warning }}>arrow_forward_ios</span>
        </div>
      </div>
    </div>
  );
}
export { RoleSelect };
