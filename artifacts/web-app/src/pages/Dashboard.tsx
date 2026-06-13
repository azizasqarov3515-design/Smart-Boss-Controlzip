import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetDashboardStats,
  useGetProducts,
  useGetSales,
  useGetWorkers,
  useGetDeleteRequests,
} from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";
import { useColors } from "../hooks/useColors";
import { useSettings } from "../hooks/useSettings";

function formatMoney(amount: number) {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + " mlrd UZS";
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + " mln UZS";
  return amount.toLocaleString("uz-UZ") + " UZS";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

export function Dashboard() {
  const [, setLocation] = useLocation();
  const colors = useColors();
  const { username, role, managerId, downloadBackup } = useAuth();
  const { settings } = useSettings(managerId);
  const [backupLoading, setBackupLoading] = useState(false);

  const isManager = role === "manager";

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardStats();
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useGetProducts();
  const { data: sales, isLoading: salesLoading, refetch: refetchSales } = useGetSales();
  const { data: workers, refetch: refetchWorkers } = useGetWorkers({ query: { enabled: isManager, refetchInterval: 30000 } as any });
  const { data: deleteRequests, refetch: refetchDeleteRequests } = useGetDeleteRequests({ query: { enabled: isManager, refetchInterval: 30000 } as any });

  const isLoading = statsLoading || productsLoading || salesLoading;

  const lowStockProducts = (products ?? []).filter((p) => p.quantity < 5).sort((a, b) => a.quantity - b.quantity);
  const topProfitProducts = [...(products ?? [])].sort((a, b) => (b.salePrice - b.costPrice) - (a.salePrice - a.costPrice)).slice(0, 3);

  const todaySales = (sales ?? []).filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.totalAmount, 0);
  const recentSales = (sales ?? []).slice(0, 5);

  const pendingWorkers = (workers ?? []).filter((w) => w.status === "pending");
  const pendingDeleteRequests = deleteRequests ?? [];
  const totalPending = pendingWorkers.length + pendingDeleteRequests.length;

  // -- CHART LOGIC --
  const chartWidth = 432; // fits nicely in 480px wrapper with padding
  const chartHeight = 220;
  const pL = 45;
  const pR = 15;
  const pT = 15;
  const pB = 25;
  const dW = chartWidth - pL - pR;
  const dH = chartHeight - pT - pB;

  const dayNames = ["Yak", "Du", "Se", "Ch", "Pa", "Ju", "Sha"];
  const chartData: number[] = [];
  const xLabels: string[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateString = d.toDateString();
    const dayTotal = (sales ?? []).filter((s) => new Date(s.createdAt).toDateString() === dateString).reduce((sum, sale) => sum + sale.totalAmount, 0);
    chartData.push(dayTotal);
    xLabels.push(dayNames[d.getDay()]);
  }

  const maxVal = Math.max(...chartData, 1000);
  const minVal = 0;
  const yRange = maxVal - minVal;

  const formatCompact = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "m";
    if (num >= 1_000) return (num / 1_000).toFixed(0) + "K";
    return String(Math.round(num));
  };

  const yAxisValues = [maxVal, maxVal * 0.66, maxVal * 0.33, 0];
  const todayDate = new Date();
  const dateStr = `${String(todayDate.getDate()).padStart(2, '0')}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${todayDate.getFullYear()}`;

  const points = chartData.map((val, i) => {
    const x = pL + (i / 6) * dW;
    const y = pT + dH - ((val - minVal) / yRange) * dH;
    return `${x},${y}`;
  }).join(" ");

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const json = await downloadBackup();
      const filename = `smartboss-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "Xato yuz berdi");
    } finally {
      setBackupLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "12px", height: "80vh" }}>
        <div className="spinner" style={{ width: "30px", height: "30px", border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        <span style={{ fontSize: "14px", color: colors.mutedForeground }}>Yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", color: colors.foreground }}>SMARTBOSScontrol</h2>
          <p className="text-muted" style={{ fontSize: "12px", marginTop: "2px" }}>
            Bugungi sana: {dateStr}
          </p>
        </div>
        {settings.managerProfilePic && (
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            padding: "2px",
            background: "linear-gradient(135deg, #fbbf24, #ef4444, #c026d3, #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <img
              src={settings.managerProfilePic}
              alt="Profile"
              style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", backgroundColor: colors.muted, border: `2px solid ${colors.background}` }}
            />
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Left Column (Main Stats & Charts) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Stats Cards */}
          <div>
            <h3 style={{ fontSize: "15px", color: colors.foreground, marginBottom: "10px" }}>Bugungi savdo</h3>
            <div className="dashboard-stats-grid">
              <div className="card-glow-blue" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span className="material-icons" style={{ color: colors.primary, fontSize: "24px" }}>point_of_sale</span>
                <span style={{ fontSize: "11px", color: colors.mutedForeground }}>Sotuv soni</span>
                <span style={{ fontSize: "20px", fontWeight: 700 }}>{todaySales.length} ta</span>
              </div>
              <div className="card-glow-green" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span className="material-icons" style={{ color: colors.success, fontSize: "24px" }}>trending_up</span>
                <span style={{ fontSize: "11px", color: colors.mutedForeground }}>Bugungi tushum</span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: colors.success }}>{formatMoney(todayRevenue)}</span>
              </div>
              <div className="card-glow-green" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span className="material-icons" style={{ color: colors.success, fontSize: "24px" }}>savings</span>
                <span style={{ fontSize: "11px", color: colors.mutedForeground }}>Bugungi sof foyda</span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: colors.success }}>{formatMoney(stats?.todayNetProfit ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* SVG Chart */}
          <div className="card-standard" style={{ padding: "18px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px", marginBottom: "12px" }}>
              <h4 style={{ fontSize: "14px", color: colors.foreground }}>Savdo tendensiyasi</h4>
              <span style={{ fontSize: "12px", color: colors.mutedForeground }}>{dateStr}</span>
            </div>
            <div style={{ height: `${chartHeight}px`, width: "100%", overflow: "hidden" }}>
              <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                {/* Horizontal Grid Lines */}
                {yAxisValues.map((val, i) => {
                  const y = pT + (i / 3) * dH;
                  return (
                    <g key={`h-${i}`}>
                      <text
                        x={pL - 8}
                        y={y + 4}
                        fill={colors.mutedForeground}
                        fontSize="10"
                        fontFamily="Inter"
                        textAnchor="end"
                      >
                        {formatCompact(val)}
                      </text>
                      <line
                        x1={pL}
                        y1={y}
                        x2={pL + dW}
                        y2={y}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    </g>
                  );
                })}

                {/* Vertical Grid Lines */}
                {xLabels.map((label, i) => {
                  const x = pL + (i / 6) * dW;
                  return (
                    <g key={`v-${i}`}>
                      <text
                        x={x}
                        y={chartHeight - 5}
                        fill={colors.mutedForeground}
                        fontSize="10"
                        fontFamily="Inter"
                        textAnchor="middle"
                      >
                        {label}
                      </text>
                      <line
                        x1={x}
                        y1={pT}
                        x2={x}
                        y2={pT + dH}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    </g>
                  );
                })}

                {/* Polyline path */}
                <polyline
                  points={points}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Points dots */}
                {chartData.map((val, i) => {
                  const x = pL + (i / 6) * dW;
                  const y = pT + dH - ((val - minVal) / yRange) * dH;
                  return (
                    <circle
                      key={`dot-${i}`}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#111827"
                      stroke={colors.primary}
                      strokeWidth="2.5"
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Recent Sales */}
          {recentSales.length > 0 && (
            <div>
              <h3 style={{ fontSize: "15px", color: colors.foreground, marginBottom: "10px" }}>So'nggi savdolar</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {recentSales.map((sale) => (
                  <div key={sale.id} className="card-standard" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: colors.primary,
                      fontWeight: 700,
                      fontSize: "13px"
                    }}>
                      #{sale.id}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "14px", color: colors.foreground }}>{sale.itemCount} dona mahsulot</h4>
                      <p style={{ fontSize: "11px", color: colors.mutedForeground, marginTop: "2px" }}>{formatTime(sale.createdAt)}</p>
                    </div>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: colors.primary }}>{formatMoney(sale.totalAmount)}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setLocation("/history")}
                className="btn-secondary"
                style={{
                  width: "100%",
                  marginTop: "10px",
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                  borderColor: colors.border,
                  color: colors.primary,
                  fontWeight: 600,
                  fontSize: "14px"
                }}
              >
                <span>Barcha tranzaksiyalar</span>
                <span className="material-icons">arrow_forward</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column (Side Alerts & Warehouse Stats) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Pending requests */}
          {totalPending > 0 && (
            <div
              className="alert-card"
              onClick={() => setLocation("/settings")}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderColor: "#F59E0B",
                marginTop: 0
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className="pulse-dot"></div>
                <span className="material-icons" style={{ color: "#D97706" }}>notifications_active</span>
                <div>
                  <h4 style={{ fontSize: "13px", color: "#92400E" }}>Kutayotgan so'rovlar</h4>
                  <p style={{ fontSize: "11px", color: "#B45309", marginTop: "2px" }}>
                    {pendingWorkers.length > 0 && `${pendingWorkers.length} ta ishchi arizasi`}
                    {pendingWorkers.length > 0 && pendingDeleteRequests.length > 0 && " • "}
                    {pendingDeleteRequests.length > 0 && `${pendingDeleteRequests.length} ta o'chirish so'rovi`}
                  </p>
                </div>
              </div>
              <span className="material-icons" style={{ color: "#D97706", fontSize: "16px" }}>arrow_forward_ios</span>
            </div>
          )}

          {/* Ombor holati */}
          <div>
            <h3 style={{ fontSize: "15px", color: colors.foreground, marginBottom: "10px" }}>Ombor holati</h3>
            <div className="dashboard-warehouse-grid">
              <div className="card-standard" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span className="material-icons" style={{ color: colors.primary, fontSize: "22px" }}>inventory_2</span>
                <span style={{ fontSize: "11px", color: colors.mutedForeground }}>Tovarlar turi</span>
                <span style={{ fontSize: "18px", fontWeight: 700 }}>{stats?.totalProducts ?? 0} xil</span>
              </div>
              <div className="card-standard" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span className="material-icons" style={{ color: colors.warning, fontSize: "22px" }}>widgets</span>
                <span style={{ fontSize: "11px", color: colors.mutedForeground }}>Jami dona</span>
                <span style={{ fontSize: "18px", fontWeight: 700 }}>{stats?.totalItems ?? 0} dona</span>
              </div>
              <div className="card-standard" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span className="material-icons" style={{ color: colors.primary, fontSize: "22px" }}>account_balance_wallet</span>
                <span style={{ fontSize: "11px", color: colors.mutedForeground }}>Ombor tan narxi</span>
                <span style={{ fontSize: "16px", fontWeight: 700 }}>{formatMoney(stats?.totalCostValue ?? 0)}</span>
              </div>
              <div className="card-standard" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span className="material-icons" style={{ color: colors.warning, fontSize: "22px" }}>monetization_on</span>
                <span style={{ fontSize: "11px", color: colors.mutedForeground }}>Sotuv qiymati</span>
                <span style={{ fontSize: "16px", fontWeight: 700 }}>{formatMoney(stats?.totalSaleValue ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Low stock alert */}
          {lowStockProducts.length > 0 && (
            <div className="alert-card" style={{ borderColor: "#FFB300", backgroundColor: "rgba(255, 179, 0, 0.05)", marginTop: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="material-icons" style={{ color: "#E65100" }}>warning</span>
                  <h4 style={{ fontSize: "14px", color: "#BF360C" }}>Kam qolgan tovarlar</h4>
                </div>
                <div style={{ backgroundColor: "#E65100", color: "white", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                  {lowStockProducts.length} ta
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {lowStockProducts.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setLocation(`/products?edit=${p.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderTop: "1px solid rgba(255, 179, 0, 0.15)",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11px", backgroundColor: "#FFE0B2", color: "#E65100", padding: "1px 4px", borderRadius: "4px" }}>
                        #{p.id}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#BF360C" }}>{p.name}</span>
                      <span style={{ fontSize: "11px", color: "#E65100" }}>{p.brand}</span>
                    </div>
                    <div style={{
                      padding: "4px 8px",
                      borderRadius: "8px",
                      backgroundColor: p.quantity === 0 ? "#B71C1C" : "#E65100",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 700
                    }}>
                      {p.quantity === 0 ? "Tugagan" : `${p.quantity} dona`}
                    </div>
                  </div>
                ))}
              </div>

              <div
                onClick={() => setLocation("/products")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(255, 179, 0, 0.15)",
                  color: colors.primary,
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <span>Mahsulotlar ro'yxatiga o'tish</span>
                <span className="material-icons" style={{ fontSize: "14px" }}>arrow_forward</span>
              </div>
            </div>
          )}

          {/* Backup Section */}
          <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "20px" }}>
            <p style={{ fontSize: "12px", color: colors.mutedForeground, marginBottom: "10px", fontWeight: 500 }}>
              Ma'lumotlar zaxirasi
            </p>
            <button
              onClick={handleBackup}
              className="btn-secondary"
              disabled={backupLoading}
              style={{ width: "100%", gap: "10px" }}
            >
              {backupLoading ? (
                <div className="spinner" style={{ width: "16px", height: "16px", border: `2px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
              ) : (
                <span className="material-icons" style={{ color: colors.primary }}>cloud_download</span>
              )}
              <span style={{ color: colors.primary }}>
                {backupLoading ? "Tayyorlanmoqda..." : "Backup yuklab olish"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
