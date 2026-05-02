import { useGetSales, type SaleWithItems } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function formatMoney(n: number) {
  return n.toLocaleString("uz-UZ") + " UZS";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Bugun";
  if (d.toDateString() === yesterday.toDateString()) return "Kecha";
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

function SaleCard({
  sale,
  colors,
}: {
  sale: SaleWithItems;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.saleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.saleHeader}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View style={[styles.saleIdBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.saleIdText}>#{sale.id}</Text>
        </View>
        <View style={styles.saleInfo}>
          <Text style={[styles.saleDate, { color: colors.mutedForeground }]}>{formatDate(sale.createdAt)}</Text>
          <Text style={[styles.saleTotal, { color: colors.foreground }]}>{formatMoney(sale.totalAmount)}</Text>
        </View>
        <View style={styles.saleRight}>
          <View style={[styles.itemCountBadge, { backgroundColor: colors.secondary }]}>
            <MaterialIcons name="inventory" size={12} color={colors.primary} />
            <Text style={[styles.itemCountText, { color: colors.primary }]}>{sale.itemCount} dona</Text>
          </View>
          <MaterialIcons
            name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color={colors.mutedForeground}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.itemsList, { borderTopColor: colors.border }]}>
          {sale.items.map((item, i) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                { backgroundColor: i % 2 === 0 ? colors.muted : colors.card, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.itemLeft}>
                {item.productId && (
                  <View style={[styles.itemIdBadge, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.itemIdText, { color: colors.mutedForeground }]}>#{item.productId}</Text>
                  </View>
                )}
                <View style={styles.itemNames}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{item.productName}</Text>
                  <Text style={[styles.itemBrand, { color: colors.mutedForeground }]}>{item.brand}</Text>
                </View>
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>{item.quantity} × {item.unitPrice.toLocaleString()}</Text>
                <Text style={[styles.itemTotal, { color: colors.primary }]}>{formatMoney(item.totalPrice)}</Text>
              </View>
            </View>
          ))}
          {sale.note && (
            <View style={[styles.noteRow, { borderTopColor: colors.border }]}>
              <MaterialIcons name="notes" size={14} color={colors.mutedForeground} />
              <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{sale.note}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Jami to'lov:</Text>
            <Text style={[styles.totalVal, { color: colors.success }]}>{formatMoney(sale.totalAmount)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: sales, isLoading, refetch, isRefetching } = useGetSales();

  const totalRevenue = (sales ?? []).reduce((s, sale) => s + sale.totalAmount, 0);
  const todaySales = (sales ?? []).filter((s) => {
    const d = new Date(s.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.totalAmount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary cards */}
      <View style={[styles.summaryBar, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: isWeb ? 16 : 12 }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Jami savdolar</Text>
          <Text style={[styles.summaryVal, { color: colors.foreground }]}>{sales?.length ?? 0} ta</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Bugungi tushum</Text>
          <Text style={[styles.summaryVal, { color: colors.success }]}>{formatMoney(todayRevenue)}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Jami tushum</Text>
          <Text style={[styles.summaryVal, { color: colors.primary }]}>{formatMoney(totalRevenue)}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Yuklanmoqda...</Text>
        </View>
      ) : (sales?.length ?? 0) === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt-long" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Tranzaksiyalar yo'q</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Kassa bo'limidan birinchi sotuvni amalga oshiring
          </Text>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <SaleCard sale={item} colors={colors} />}
          contentContainerStyle={{
            padding: 14,
            paddingBottom: insets.bottom + 80,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 2, textAlign: "center" },
  summaryVal: { fontFamily: "Inter_700Bold", fontSize: 13, textAlign: "center" },
  summaryDivider: { width: 1, height: 36 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 8 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  saleCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  saleHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  saleIdBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saleIdText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
  saleInfo: { flex: 1 },
  saleDate: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 2 },
  saleTotal: { fontFamily: "Inter_700Bold", fontSize: 16 },
  saleRight: { alignItems: "flex-end", gap: 4 },
  itemCountBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  itemCountText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  itemsList: { borderTopWidth: 1 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  itemLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 8 },
  itemIdBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  itemIdText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  itemNames: { flex: 1 },
  itemName: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  itemBrand: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  itemRight: { alignItems: "flex-end" },
  itemQty: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 2 },
  itemTotal: { fontFamily: "Inter_700Bold", fontSize: 13 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
  noteText: { fontFamily: "Inter_400Regular", fontSize: 12, fontStyle: "italic" },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  totalLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  totalVal: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
