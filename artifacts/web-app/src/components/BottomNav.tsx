import { useLocation } from "wouter";
import { useColors } from "../hooks/useColors";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/LanguageContext";

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const colors = useColors();
  const { role } = useAuth();
  const { t } = useTranslation();

  const isWorker = role === "worker";

  const tabs = [
    { path: "/", label: t("Asosiy"), icon: "dashboard" },
    { path: "/pos", label: t("Kassa"), icon: "shopping_cart" },
    { path: "/products", label: t("Tovarlar"), icon: "inventory_2" },
    { path: "/history", label: t("Tarix"), icon: "history" },
    { path: "/customers", label: t("Mijozlar"), icon: "people" },
    { path: "/settings", label: t("Sozlamalar"), icon: "settings" },
  ];

  return (
    <div className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = location === tab.path || (tab.path !== "/" && location.startsWith(tab.path));
        return (
          <div
            key={tab.path}
            className={`nav-item ${isActive ? "active" : ""}`}
            onClick={() => setLocation(tab.path)}
          >
            <span className="material-icons">{tab.icon}</span>
            <span>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}
export { BottomNav };
