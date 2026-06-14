import React, { useEffect } from "react";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { useAuth } from "./contexts/AuthContext";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import { BottomNav } from "./components/BottomNav";

// Pages
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import History from "./pages/History";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Settings from "./pages/Settings";

// Auth Pages
import RoleSelect from "./pages/auth/RoleSelect";
import Login from "./pages/auth/Login";
import ManagerRegister from "./pages/auth/ManagerRegister";
import WorkerLogin from "./pages/auth/WorkerLogin";
import WorkerRegister from "./pages/auth/WorkerRegister";
import WorkerPending from "./pages/auth/WorkerPending";

import { LanguageProvider } from "./contexts/LanguageContext";
import { useSettings } from "./hooks/useSettings";

export default function App() {
  const { isAuthenticated, role, workerStatus, managerId } = useAuth();
  const [location, setLocation] = useLocation();
  const { settings } = useSettings(managerId);

  useEffect(() => {
    const scale = (settings?.uiFontSizePercent ?? 50) / 50;
    document.body.style.zoom = String(scale);
  }, [settings?.uiFontSizePercent]);

  const isAuthPage = [
    "/role-select",
    "/login",
    "/manager-register",
    "/worker-login",
    "/worker-register",
    "/worker-pending"
  ].includes(location);

  useEffect(() => {
    if (!isAuthenticated) {
      if (!isAuthPage) {
        setLocation("/role-select");
      }
    } else {
      if (role === "worker" && workerStatus === "pending") {
        if (location !== "/worker-pending") {
          setLocation("/worker-pending");
        }
      } else if (role === "worker" && workerStatus === "approved") {
        if (isAuthPage) {
          setLocation("/");
        }
      } else if (role === "manager") {
        if (isAuthPage) {
          setLocation("/");
        }
      }
    }
  }, [isAuthenticated, role, workerStatus, location, setLocation, isAuthPage]);

  return (
    <LanguageProvider>
      <SubscriptionGuard>
        <div style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          backgroundColor: "var(--background)",
          color: "var(--foreground)"
        }}>
        <div style={{ flex: 1 }}>
          <Switch>
            {/* Auth Routes */}
            <Route path="/role-select" component={RoleSelect} />
            <Route path="/login" component={Login} />
            <Route path="/manager-register" component={ManagerRegister} />
            <Route path="/worker-login" component={WorkerLogin} />
            <Route path="/worker-register" component={WorkerRegister} />
            <Route path="/worker-pending" component={WorkerPending} />

            {/* Core Protected Routes */}
            <Route path="/" component={Dashboard} />
            <Route path="/pos" component={POS} />
            <Route path="/products" component={Products} />
            <Route path="/product-form" component={ProductForm} />
            <Route path="/history" component={History} />
            <Route path="/customers" component={Customers} />
            <Route path="/customer-detail" component={CustomerDetail} />
            <Route path="/settings" component={Settings} />

            {/* Fallback Route */}
            <Route>
              {isAuthenticated ? (
                <Redirect to="/" />
              ) : (
                <Redirect to="/role-select" />
              )}
            </Route>
          </Switch>
        </div>

        {isAuthenticated && (role === "manager" || workerStatus === "approved") && !isAuthPage && (
          <BottomNav />
        )}
      </div>
      </SubscriptionGuard>
    </LanguageProvider>
  );
}
export { App };
