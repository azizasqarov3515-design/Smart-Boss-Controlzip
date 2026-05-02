import {
  useGetDashboardStats,
  useGetProducts,
  useGetSales,
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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";

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

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { username, downloadBackup } = useAuth();
  const [backupLoading, setBackupLoading] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching: r1 } = useGetDashboardStats();
  const { data: products, isLoading: productsLoading, refetch: refetchProducts, isRefetching: r2 } = useGetProducts();
  const { data: sales, isLoading: salesLoading, refetch: refetchSales, isRefetching: r3 } = useGetSales();

  const isLoading = statsLoading || productsLoading || salesLoading;
  const isRefreshing = r1 || r2 || r3;

  const onRefresh = () => {
    Haptics.selectionAsync();
    refetchStats(); refetchProducts(); refetchSales();
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90, paddingTop: isWeb ? 20 : 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Xush kelibsiz, {username ?? "Admin"}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>SMARTBOSScontrol</Text>
        </View>
        <TouchableOpacity style={[styles.posBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(tabs)/pos")} activeOpacity={0.85}>
          <MaterialIcons name="point-of-sale" size={20} color="#fff" />
          <Text style={styles.posBtnText}>Kassa</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Yuklanmoqda...</Text></View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bugungi savdo</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Bugungi sotuv" value={String(todaySales.length) + " ta"} icon="point-of-sale" variant="primary" />
            <StatCard label="Bugungi tushum" value={formatMoney(todayRevenue)} icon="trending-up" variant="success" />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 18 }]}>Ombor holati</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Mahsulot turi" value={String(stats?.totalProducts ?? 0)} icon="inventory-2" variant="default" />
            <StatCard label="Jami dona" value={String(stats?.totalItems ?? 0)} icon="widgets" variant="default" />
          </View>
          <View style={[styles.statsGrid, { marginTop: 10 }]}>
            <StatCard label="Tan narxi (jami)" value={formatMoney(stats?.totalCostValue ?? 0)} icon="account-balance-wallet" variant="default" subtitle="Ombordagi qiymat" />
            <StatCard label="Sotuv (jami)" value={formatMoney(stats?.totalSaleValue ?? 0)} icon="monetization-on" variant="default" subtitle="Potentsial tushum" />
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
                  <View style={[styles.saleBadge, { backgroundColor: colors.primary }]}><Text style={styles.saleBadgeText}>#{sale.id}</Text></View>
                  <View style={styles.listCardInfo}>
                    <Text style={[styles.listCardName, { color: colors.foreground }]}>{sale.itemCount} dona mahsulot</Text>
                    <Text style={[styles.listCardSub, { color: colors.mutedForeground }]}>{formatTime(sale.createdAt)}</Text>
                  </View>
                  <Text style={[styles.saleAmount, { color: colors.success }]}>{formatMoney(sale.totalAmount)}</Text>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22 },
  posBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, shadowColor: "#1565C0", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 4 },
  posBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
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
  listCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  listCardInfo: { flex: 1, paddingHorizontal: 10 },
  listCardName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  listCardSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  saleBadge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  saleBadgeText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
  saleAmount: { fontFamily: "Inter_700Bold", fontSize: 14 },
  moreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 11, marginTop: 2, marginBottom: 4 },
  moreBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
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
});
