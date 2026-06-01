import {
  useGetDashboardStats,
  useGetProducts,
  useGetSales,
  useGetWorkers,
  useGetDeleteRequests,
} from "@workspace/api-client-react";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Image,
} from "react-native";
import Svg, { Circle, Line as SvgLine, Text as SvgText, Polyline } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { StatCard } from "@/components/StatCard";
import { LiveClock } from "@/components/LiveClock";
import { WebRefreshBar } from "@/components/WebRefreshBar";
import { useAuth } from "@/contexts/AuthContext";

const PREMIUM_THEME = {
  background: "#0b0f19",
  foreground: "#ffffff",
  mutedForeground: "#9ca3af",
  border: "rgba(255, 255, 255, 0.08)",
  card: "rgba(17, 24, 39, 0.75)", // glassmorphism dark container
  primary: "#3b82f6", // neon blue
  orange: "#f97316", // neon orange
  green: "#10b981", // neon green
  success: "#10b981",
  warning: "#f97316",
  text: "#ffffff",
};

function formatMoney(amount: number) {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + " mlrd UZS";
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + " mln UZS";
  return amount.toLocaleString("uz-UZ") + " UZS";
}

function PulsingDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, transform: [{ scale: anim }] }} />
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function WorkerDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { workerName } = useAuth();
  const isWeb = Platform.OS === "web";

  const { refetch: refetchProducts, isRefetching: r1 } = useGetProducts();
  const { refetch: refetchSales, isRefetching: r2 } = useGetSales();
  const isRefreshing = r1 || r2;

  const onRefresh = () => {
    Haptics.selectionAsync();
    refetchProducts();
    refetchSales();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90, paddingTop: isWeb ? 20 : 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <WebRefreshBar refreshing={isRefreshing} onRefresh={onRefresh} />
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.foreground }]}>SMARTBOSScontrol</Text>
          <View style={styles.subHeader}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{workerName ?? "Sotuvchi"}</Text>
            <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
            <LiveClock />
          </View>
        </View>
      </View>

      <View style={[styles.workerWelcomeCard, { backgroundColor: colors.primary }]}>
        <MaterialIcons name="badge" size={40} color="rgba(255,255,255,0.9)" />
        <Text style={styles.workerWelcomeTitle}>Sotuvchi bo'limi</Text>
        <Text style={styles.workerWelcomeSub}>Savdo qilish uchun Kassa bo'limiga o'ting</Text>
        <TouchableOpacity
          style={styles.workerPosBtn}
          onPress={() => router.push("/(tabs)/pos")}
          activeOpacity={0.85}
        >
          <MaterialIcons name="point-of-sale" size={20} color={colors.primary} />
          <Text style={[styles.workerPosBtnText, { color: colors.primary }]}>Kassaga o'tish</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.workerQuickLinks}>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/history")}
          activeOpacity={0.8}
        >
          <MaterialIcons name="receipt-long" size={26} color={colors.primary} />
          <Text style={[styles.quickCardLabel, { color: colors.foreground }]}>Tarix</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/customers")}
          activeOpacity={0.8}
        >
          <MaterialIcons name="people" size={26} color={colors.primary} />
          <Text style={[styles.quickCardLabel, { color: colors.foreground }]}>Mijozlar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/products")}
          activeOpacity={0.8}
        >
          <MaterialIcons name="inventory" size={26} color={colors.primary} />
          <Text style={[styles.quickCardLabel, { color: colors.foreground }]}>Tovarlar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function DashboardScreen() {
  const colors = PREMIUM_THEME;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { username, logout, role, managerId, downloadBackup } = useAuth();
  const { settings } = useSettings(managerId);
  const isWeb = Platform.OS === "web";
  const [backupLoading, setBackupLoading] = useState(false);

  const isManager = role === "manager";

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching: r1 } = useGetDashboardStats();
  const { data: products, isLoading: productsLoading, refetch: refetchProducts, isRefetching: r2 } = useGetProducts();
  const { data: sales, isLoading: salesLoading, refetch: refetchSales, isRefetching: r3 } = useGetSales();
  // workers/deleteRequests only needed by manager — disabled for workers via enabled flag
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workers, refetch: refetchWorkers } = useGetWorkers({ query: { enabled: isManager, refetchInterval: 30000 } as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: deleteRequests, refetch: refetchDeleteRequests } = useGetDeleteRequests({ query: { enabled: isManager, refetchInterval: 30000 } as any });

  if (role === "worker") {
    return <WorkerDashboard />;
  }

  const isLoading = statsLoading || productsLoading || salesLoading;
  const isRefreshing = r1 || r2 || r3;

  const onRefresh = () => {
    Haptics.selectionAsync();
    refetchStats(); refetchProducts(); refetchSales(); refetchWorkers(); refetchDeleteRequests();
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    Haptics.selectionAsync();
    try {
      const json = await downloadBackup();
      const filename = `smartboss-backup-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert("Muvaffaqiyat", "Backup fayli yuklab olindi.");
        return;
      }

      const fileUri = (FileSystem.cacheDirectory ?? "") + filename;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Backup faylini saqlang",
          UTI: "public.json",
        });
      } else {
        Alert.alert("Muvaffaqiyat", `Backup saqlandi:\n${fileUri}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Xato yuz berdi";
      Alert.alert("Xato", msg);
    } finally {
      setBackupLoading(false);
    }
  };

  const lowStockProducts = (products ?? []).filter((p) => p.quantity < 5).sort((a, b) => a.quantity - b.quantity);
  const topProfitProducts = [...(products ?? [])].sort((a, b) => (b.salePrice - b.costPrice) - (a.salePrice - a.costPrice)).slice(0, 3);

  const todaySales = (sales ?? []).filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.totalAmount, 0);
  const recentSales = (sales ?? []).slice(0, 5);

  const pendingWorkers = (workers ?? []).filter((w) => w.status === "pending");
  const pendingDeleteRequests = deleteRequests ?? [];
  const totalPending = pendingWorkers.length + pendingDeleteRequests.length;

  // -- CHART LOGIC --
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = isWeb ? Math.min(screenWidth - 32, 800) : screenWidth - 32;
  const chartHeight = 220;
  const pL = 45;
  const pR = 15;
  const pT = 15;
  const pB = 25;
  const dW = chartWidth - pL - pR;
  const dH = chartHeight - pT - pB;

  const chartData = [150000, 230000, 180000, 350000, 600000, 450000, 520000];
  const maxVal = Math.max(...chartData);
  const minVal = 0;
  const yRange = maxVal - minVal || 1;

  const formatCompact = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(0) + "K";
    return String(num);
  };

  const yAxisValues = [maxVal, maxVal * 0.66, maxVal * 0.33, 0];
  const xLabels = ["Du", "Se", "Cho", "Pay", "Ju", "Sha", "Yak"];

  const todayDate = new Date();
  const dateStr = `${String(todayDate.getDate()).padStart(2, '0')}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${todayDate.getFullYear()}`;

  const points = chartData.map((val, i) => {
    const x = pL + (i / 6) * dW;
    const y = pT + dH - ((val - minVal) / yRange) * dH;
    return `${x},${y}`;
  }).join(" ");
  // -- END CHART LOGIC --

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90, paddingTop: isWeb ? 20 : 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <WebRefreshBar refreshing={isRefreshing} onRefresh={onRefresh} />
      <View style={[styles.header, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
        <View style={{ flex: 1, alignItems: "center", marginLeft: settings.managerProfilePic ? 44 : 0 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>SMARTBOSScontrol</Text>
          <View style={styles.subHeader}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{username ?? "Asosiy Do'kon"}</Text>
            <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
            <LiveClock />
          </View>
        </View>
        {settings.managerProfilePic && (
          <LinearGradient
            colors={["#fbbf24", "#ef4444", "#c026d3", "#3b82f6", "#22d3ee"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 19, overflow: 'hidden', backgroundColor: colors.muted, borderWidth: 2, borderColor: colors.background }}>
              <Image source={{ uri: settings.managerProfilePic }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          </LinearGradient>
        )}
      </View>

      {/* Pending notifications for manager */}
      {totalPending > 0 && (
        <TouchableOpacity
          style={[styles.notifCard, { backgroundColor: "#FFFBEB", borderColor: "#F59E0B" }]}
          onPress={() => router.push("/(tabs)/settings")}
          activeOpacity={0.85}
        >
          <View style={styles.notifLeft}>
            <PulsingDot color="#D97706" />
            <MaterialIcons name="notifications-active" size={20} color="#D97706" />
            <View>
              <Text style={[styles.notifTitle, { color: "#92400E" }]}>Kutayotgan so'rovlar</Text>
              <Text style={[styles.notifSub, { color: "#B45309" }]}>
                {pendingWorkers.length > 0 && `${pendingWorkers.length} ta ishchi arizasi`}
                {pendingWorkers.length > 0 && pendingDeleteRequests.length > 0 && " • "}
                {pendingDeleteRequests.length > 0 && `${pendingDeleteRequests.length} ta o'chirish so'rovi`}
              </Text>
            </View>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={16} color="#D97706" />
        </TouchableOpacity>
      )}

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Yuklanmoqda...</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bugungi savdo</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Bugungi sotuv" value={String(todaySales.length) + " ta"} icon="point-of-sale" variant="primary" />
            <StatCard label="Bugungi tushum" value={formatMoney(todayRevenue)} icon="trending-up" variant="success" />
          </View>
          <View style={[styles.statsGrid, { marginTop: 10 }]}>
            <StatCard
              label="Bugungi sof foyda"
              value={formatMoney(stats?.todayNetProfit ?? 0)}
              icon="savings"
              variant="success"
              subtitle="Foyda (tan narxi ayirib)"
            />
          </View>

          <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 }}>
              <Text style={[styles.chartTitle, { color: colors.foreground, marginLeft: 0, marginBottom: 0 }]}>Savdo tendensiyasi</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>{dateStr}</Text>
            </View>
            
            <View style={{ height: chartHeight, width: "100%" }}>
              <Svg width="100%" height="100%">
                {/* Horizontal Grid Lines & Y-Axis Labels */}
                {yAxisValues.map((val, i) => {
                  const y = pT + (i / 3) * dH;
                  return (
                    <React.Fragment key={`h-${i}`}>
                      <SvgText
                        x={pL - 8}
                        y={y + 4}
                        fill={colors.mutedForeground}
                        fontSize="10"
                        fontFamily="Inter_500Medium"
                        textAnchor="end"
                      >
                        {formatCompact(val)}
                      </SvgText>
                      <SvgLine
                        x1={pL}
                        y1={y}
                        x2={pL + dW}
                        y2={y}
                        stroke={colors.border}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    </React.Fragment>
                  );
                })}

                {/* Vertical Grid Lines & X-Axis Labels */}
                {xLabels.map((label, i) => {
                  const x = pL + (i / 6) * dW;
                  return (
                    <React.Fragment key={`v-${i}`}>
                      <SvgText
                        x={x}
                        y={chartHeight - 5}
                        fill={colors.mutedForeground}
                        fontSize="11"
                        fontFamily="Inter_500Medium"
                        textAnchor="middle"
                      >
                        {label}
                      </SvgText>
                      <SvgLine
                        x1={x}
                        y1={pT}
                        x2={x}
                        y2={pT + dH}
                        stroke={colors.border}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    </React.Fragment>
                  );
                })}

                {/* The Indicator Line */}
                <Polyline
                  points={points}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Data Dots */}
                {chartData.map((val, i) => {
                  const x = pL + (i / 6) * dW;
                  const y = pT + dH - ((val - minVal) / yRange) * dH;
                  return (
                    <Circle
                      key={`dot-${i}`}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={colors.card}
                      stroke={colors.primary}
                      strokeWidth="2.5"
                    />
                  );
                })}
              </Svg>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 18 }]}>Ombor holati</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Mahsulot turi" value={String(stats?.totalProducts ?? 0)} icon="inventory-2" variant="primary" />
            <StatCard label="Jami dona" value={String(stats?.totalItems ?? 0)} icon="widgets" variant="warning" />
          </View>
          <View style={[styles.statsGrid, { marginTop: 10 }]}>
            <StatCard label="Tan narxi (jami)" value={formatMoney(stats?.totalCostValue ?? 0)} icon="account-balance-wallet" variant="primary" subtitle="Ombordagi qiymat" />
            <StatCard label="Sotuv (jami)" value={formatMoney(stats?.totalSaleValue ?? 0)} icon="monetization-on" variant="warning" subtitle="Potentsial tushum" />
          </View>

          {lowStockProducts.length > 0 && (
            <View style={[styles.alertCard, { backgroundColor: "#FFF8E1", borderColor: "#FFB300" }]}>
              <View style={styles.alertHeader}>
                <View style={styles.alertHeaderLeft}>
                  <PulsingDot color="#E65100" />
                  <MaterialIcons name="warning" size={18} color="#E65100" />
                  <Text style={[styles.alertTitle, { color: "#BF360C" }]}>Kam qolgan tovarlar</Text>
                </View>
                <View style={[styles.alertCountBadge, { backgroundColor: "#E65100" }]}>
                  <Text style={styles.alertCountText}>{lowStockProducts.length}</Text>
                </View>
              </View>
              {lowStockProducts.map((p) => (
                <TouchableOpacity key={p.id} style={[styles.alertRow, { borderTopColor: "#FFE0B2" }]} onPress={() => router.push({ pathname: "/product-form", params: { id: String(p.id) } })} activeOpacity={0.75}>
                  <View style={styles.alertRowLeft}>
                    <View style={[styles.smallBadge, { backgroundColor: "#FFE0B2" }]}><Text style={[styles.smallBadgeText, { color: "#E65100" }]}>#{p.id}</Text></View>
                    <Text style={[styles.alertRowName, { color: "#BF360C" }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.alertRowBrand, { color: "#E65100" }]}>{p.brand}</Text>
                  </View>
                  <View style={[styles.alertQtyBadge, { backgroundColor: p.quantity === 0 ? "#B71C1C" : "#E65100" }]}>
                    <Text style={styles.alertQtyText}>{p.quantity === 0 ? "Tugagan" : `${p.quantity} dona`}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.alertFooter} onPress={() => router.push("/(tabs)/products")} activeOpacity={0.75}>
                <Text style={[styles.alertFooterText, { color: colors.primary }]}>Mahsulotlar ro'yxatiga o'tish</Text>
                <MaterialIcons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {recentSales.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>So'nggi savdolar</Text>
              {recentSales.map((sale) => (
                <View key={sale.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.saleBadge, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}><Text style={styles.saleBadgeText}>#{sale.id}</Text></View>
                  <View style={styles.listCardInfo}>
                    <Text style={[styles.listCardName, { color: colors.foreground }]}>{sale.itemCount} dona mahsulot</Text>
                    <Text style={[styles.listCardSub, { color: colors.mutedForeground }]}>{formatTime(sale.createdAt)}</Text>
                  </View>
                  <Text style={[styles.saleAmount, { color: colors.primary }]}>{formatMoney(sale.totalAmount)}</Text>
                </View>
              ))}
              <TouchableOpacity style={[styles.moreBtn, { borderColor: colors.border }]} onPress={() => router.push("/(tabs)/history")} activeOpacity={0.8}>
                <Text style={[styles.moreBtnText, { color: colors.primary }]}>Barcha tranzaksiyalar</Text>
                <MaterialIcons name="arrow-forward" size={15} color={colors.primary} />
              </TouchableOpacity>
            </>
          )}

          {topProfitProducts.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Eng foydali tovarlar</Text>
              {topProfitProducts.map((p, i) => {
                const profit = p.salePrice - p.costPrice;
                const pct = p.costPrice > 0 ? ((profit / p.costPrice) * 100).toFixed(0) : "0";
                return (
                  <TouchableOpacity key={p.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push({ pathname: "/product-form", params: { id: String(p.id) } })} activeOpacity={0.8}>
                    <View style={[styles.rankBadge, { backgroundColor: i === 0 ? "#FFC107" : i === 1 ? "#90A4AE" : "#A0724A" }]}><Text style={styles.rankText}>{i + 1}</Text></View>
                    <View style={styles.listCardInfo}>
                      <Text style={[styles.listCardName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[styles.listCardSub, { color: colors.mutedForeground }]}>{p.brand}</Text>
                    </View>
                    <View style={styles.profitRight}>
                      <Text style={[styles.profitAmt, { color: colors.success }]}>+{formatMoney(profit)}</Text>
                      <Text style={[styles.profitPct, { color: colors.mutedForeground }]}>{pct}% marja</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {(products?.length ?? 0) === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="inventory-2" size={60} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Mahsulotlar yo'q</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Birinchi mahsulotni qo'shib boshlang</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/product-form")} activeOpacity={0.85}>
                <MaterialIcons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Mahsulot qo'shish</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.backupSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.backupLabel, { color: colors.mutedForeground }]}>Ma'lumotlar zaxirasi</Text>
            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleBackup}
              activeOpacity={0.82}
              disabled={backupLoading}
            >
              {backupLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons name="cloud-download" size={20} color={colors.primary} />
              )}
              <Text style={[styles.backupBtnText, { color: colors.primary }]}>
                {backupLoading ? "Tayyorlanmoqda..." : "Backup yuklab olish"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  chartContainer: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  chartTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginLeft: 18,
    marginBottom: 4,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    paddingTop: 10,
  },
  headerCenter: {
    alignItems: "center",
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 11 },
  title: { fontFamily: "Inter_700Bold", fontSize: 19 },
  posBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
    shadowColor: "#1565C0", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28, shadowRadius: 6, elevation: 4,
  },
  posBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  notifCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 16,
  },
  notifLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  notifTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  notifSub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  loader: { alignItems: "center", paddingTop: 60, gap: 12 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 10 },
  statsGrid: { flexDirection: "row", gap: 10 },
  alertCard: { borderRadius: 16, borderWidth: 1.5, marginTop: 18, overflow: "hidden" },
  alertHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
  alertHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  alertCountBadge: { minWidth: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  alertCountText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  alertRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1 },
  alertRowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 8 },
  alertRowName: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  alertRowBrand: { fontFamily: "Inter_400Regular", fontSize: 11 },
  alertQtyBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  alertQtyText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  alertFooter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#FFE0B2" },
  alertFooterText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  smallBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  smallBadgeText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  listCard: { flexDirection: "row", alignItems: "center", borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  listCardInfo: { flex: 1, paddingHorizontal: 12 },
  listCardName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  listCardSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  saleBadge: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saleBadgeText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#3b82f6" },
  saleAmount: { fontFamily: "Inter_700Bold", fontSize: 15 },
  moreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 14, marginTop: 4, marginBottom: 8, backgroundColor: "rgba(59, 130, 246, 0.05)" },
  moreBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rankBadge: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rankText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  profitRight: { alignItems: "flex-end" },
  profitAmt: { fontFamily: "Inter_700Bold", fontSize: 13 },
  profitPct: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  emptyState: { alignItems: "center", paddingTop: 50, gap: 8 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 10 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", paddingHorizontal: 30 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  backupSection: { marginTop: 28, paddingTop: 20, borderTopWidth: 1 },
  backupLabel: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 10 },
  backupBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 14 },
  backupBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  workerWelcomeCard: {
    borderRadius: 20, padding: 28, alignItems: "center",
    marginBottom: 20, gap: 10,
    shadowColor: "#1565C0", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  workerWelcomeTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  workerWelcomeSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.85)", textAlign: "center" },
  workerPosBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13,
    marginTop: 8,
  },
  workerPosBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  workerQuickLinks: { flexDirection: "row", gap: 12 },
  quickCard: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, borderWidth: 1, paddingVertical: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  quickCardLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
