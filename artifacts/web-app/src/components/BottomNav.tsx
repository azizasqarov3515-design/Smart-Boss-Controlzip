import { useLocation } from "wouter";
import { useColors } from "../hooks/useColors";
import { useAuth } from "../contexts/AuthContext";

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const colors = useColors();
  const { role } = useAuth();

  const isWorker = role === "worker";

  // Workers only see POS, History, Customers, Products, and Settings
  // Managers see all 6 tabs
  const tabs = [
    ...(!isWorker
      ? [{ path: "/", label: "Asosiy", icon: "dashboard" }]
      : []),
    { path: "/pos", label: "Kassa", icon: "shopping_cart" },
    { path: "/products", label: "Tovarlar", icon: "inventory_2" },
    { path: "/history", label: "Tarix", icon: "history" },
    { path: "/customers", label: "Mijozlar", icon: "people" },
    { path: "/settings", label: "Sozlamalar", icon: "settings" },
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
