import {
  useGetDashboardStats,
  useGetProducts,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { StatCard } from "@/components/StatCard";

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
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        transform: [{ scale: anim }],
      }}
    />
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isRefetching: refetchingStats,
  } = useGetDashboardStats();
  const {
    data: products,
    isLoading: productsLoading,
    refetch: refetchProducts,
    isRefetching: refetchingProducts,
  } = useGetProducts();

  const isLoading = statsLoading || productsLoading;
  const isRefreshing = refetchingStats || refetchingProducts;

  const onRefresh = () => {
    Haptics.selectionAsync();
    refetchStats();
    refetchProducts();
  };

  const lowStockProducts = (products ?? []).filter((p) => p.quantity < 5).sort((a, b) => a.quantity - b.quantity);
  const topProfitProducts = [...(products ?? [])]
    .sort((a, b) => b.salePrice - b.costPrice - (a.salePrice - a.costPrice))
    .slice(0, 3);
  const recentProducts = [...(products ?? [])].reverse().slice(0, 5);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 90, paddingTop: isWeb ? 20 : 16 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Boshqaruv paneli</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>SMARTBOSScontrol</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/product-form");
          }}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Yuklanmoqda...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatCard label="Mahsulot turi" value={String(stats?.totalProducts ?? 0)} icon="inventory-2" variant="primary" />
            <StatCard label="Jami dona" value={String(stats?.totalItems ?? 0)} icon="widgets" variant="default" />
          </View>
          <View style={[styles.statsGrid, { marginTop: 10 }]}>
            <StatCard
              label="Tan narxi (jami)"
              value={formatMoney(stats?.totalCostValue ?? 0)}
              icon="account-balance-wallet"
              variant="default"
              subtitle="Barcha tovar qiymati"
            />
            <StatCard
              label="Sotuv (jami)"
              value={formatMoney(stats?.totalSaleValue ?? 0)}
              icon="trending-up"
              variant="success"
              subtitle="Potentsial daromad"
            />
          </View>

          {lowStockProducts.length > 0 && (
            <View style={[styles.alertCard, { backgroundColor: "#FFF8E1", borderColor: "#FFB300" }]}>
              <View style={styles.alertHeader}>
                <View style={styles.alertHeaderLeft}>
                  <PulsingDot color="#E65100" />
                  <MaterialIcons name="warning" size={18} color="#E65100" />
                  <Text style={[styles.alertTitle, { color: "#BF360C" }]}>
                    Kam qolgan tovarlar
                  </Text>
                </View>
                <View style={[styles.alertCountBadge, { backgroundColor: "#E65100" }]}>
                  <Text style={styles.alertCountText}>{lowStockProducts.length}</Text>
                </View>
              </View>

              {lowStockProducts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.alertRow, { borderTopColor: "#FFE0B2" }]}
                  onPress={() => router.push({ pathname: "/product-form", params: { id: String(p.id) } })}
                  activeOpacity={0.75}
                >
                  <View style={styles.alertRowLeft}>
                    <View style={[styles.smallIdBadge, { backgroundColor: "#FFE0B2" }]}>
                      <Text style={[styles.smallIdText, { color: "#E65100" }]}>#{p.id}</Text>
                    </View>
                    <Text style={[styles.alertRowName, { color: "#BF360C" }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.alertRowBrand, { color: "#E65100" }]}>{p.brand}</Text>
                  </View>
                  <View style={[styles.alertQtyBadge, { backgroundColor: p.quantity === 0 ? "#B71C1C" : "#E65100" }]}>
                    <Text style={styles.alertQtyText}>
                      {p.quantity === 0 ? "Tugagan" : `${p.quantity} dona`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.alertFooter}
                onPress={() => router.push("/(tabs)/products")}
                activeOpacity={0.75}
              >
                <Text style={[styles.alertFooterText, { color: colors.primary }]}>
                  Mahsulotlar ro'yxatiga o'tish
                </Text>
                <MaterialIcons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {topProfitProducts.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Eng foydali mahsulotlar</Text>
              {topProfitProducts.map((p, i) => {
                const profit = p.salePrice - p.costPrice;
                const pct = p.costPrice > 0 ? ((profit / p.costPrice) * 100).toFixed(0) : "0";
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push({ pathname: "/product-form", params: { id: String(p.id) } })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.rankBadge, { backgroundColor: i === 0 ? "#FFC107" : i === 1 ? "#90A4AE" : "#A0724A" }]}>
                      <Text style={styles.rankText}>{i + 1}</Text>
                    </View>
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

          {recentProducts.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>So'nggi qo'shilganlar</Text>
              {recentProducts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: "/product-form", params: { id: String(p.id) } })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.smallIdBadge, { backgroundColor: colors.surfaceVariant, marginRight: 10 }]}>
                    <Text style={[styles.smallIdText, { color: colors.mutedForeground }]}>#{p.id}</Text>
                  </View>
                  <View style={styles.listCardInfo}>
                    <Text style={[styles.listCardName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.listCardSub, { color: colors.mutedForeground }]}>{p.brand}</Text>
                  </View>
                  <View style={styles.listCardRight}>
                    <Text style={[styles.listCardPrice, { color: colors.primary }]}>
                      {formatMoney(p.salePrice)}
                    </Text>
                    <Text style={[styles.listCardSub, { color: p.quantity < 5 ? colors.destructive : colors.mutedForeground }]}>
                      {p.quantity} dona
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {(products?.length ?? 0) === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="inventory-2" size={60} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Mahsulotlar yo'q</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Do'konni boshqarish uchun birinchi mahsulotni qo'shing
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/product-form")}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Mahsulot qo'shish</Text>
              </TouchableOpacity>
            </View>
          )}
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1565C0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  loader: { alignItems: "center", paddingTop: 60, gap: 12 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  statsGrid: { flexDirection: "row", gap: 10 },
  alertCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 18,
    overflow: "hidden",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  alertHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  alertCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  alertCountText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  alertRowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 8 },
  alertRowName: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  alertRowBrand: { fontFamily: "Inter_400Regular", fontSize: 11 },
  alertQtyBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  alertQtyText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  alertFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#FFE0B2",
  },
  alertFooterText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 10, marginTop: 20 },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  listCardInfo: { flex: 1, paddingRight: 8 },
  listCardRight: { alignItems: "flex-end" },
  listCardName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  listCardSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  listCardPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rankText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  profitRight: { alignItems: "flex-end" },
  profitAmt: { fontFamily: "Inter_700Bold", fontSize: 13 },
  profitPct: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  smallIdBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  smallIdText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  emptyState: { alignItems: "center", paddingTop: 50, gap: 8 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 10 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", paddingHorizontal: 30 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});
