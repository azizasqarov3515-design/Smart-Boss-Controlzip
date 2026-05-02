import {
  useGetProducts,
  useDeleteProduct,
  getGetProductsQueryKey,
  getGetDashboardStatsQueryKey,
  type Product,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type SortKey = "name" | "brand" | "costPrice" | "salePrice" | "quantity";

function HighlightText({
  text,
  query,
  style,
  highlightStyle,
}: {
  text: string;
  query: string;
  style?: object;
  highlightStyle?: object;
}) {
  if (!query.trim()) return <Text style={style}>{text}</Text>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {text.slice(0, idx)}
      <Text style={[highlightStyle]}>{text.slice(idx, idx + q.length)}</Text>
      {text.slice(idx + q.length)}
    </Text>
  );
}

function ProductCard({
  product,
  query,
  onEdit,
  onDelete,
  isEven,
  colors,
}: {
  product: Product;
  query: string;
  onEdit: (p: Product) => void;
  onDelete: (id: number) => void;
  isEven: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isLowStock = product.quantity < 5;
  const profit = product.salePrice - product.costPrice;
  const profitPct = product.costPrice > 0 ? ((profit / product.costPrice) * 100).toFixed(0) : "0";

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert("O'chirish", `"${product.name}" mahsulotini o'chirmoqchimisiz?`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: () => {
          Animated.timing(slideAnim, {
            toValue: -400,
            duration: 220,
            useNativeDriver: true,
          }).start(() => onDelete(product.id));
        },
      },
    ]);
  };

  const handleEdit = () => {
    Haptics.selectionAsync();
    onEdit(product);
  };

  return (
    <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isEven ? colors.card : colors.muted,
            borderBottomColor: colors.border,
            borderLeftWidth: isLowStock ? 3 : 0,
            borderLeftColor: colors.destructive,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={styles.nameLine}>
              <View style={[styles.idBadge, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.idText, { color: colors.mutedForeground }]}>#{product.id}</Text>
              </View>
              <HighlightText
                text={product.name}
                query={query}
                style={[styles.name, { color: colors.foreground }]}
                highlightStyle={{ backgroundColor: "#FFF176", color: "#1A1A2E", borderRadius: 2 }}
              />
            </View>
            <HighlightText
              text={product.brand}
              query={query}
              style={[styles.brand, { color: colors.mutedForeground }]}
              highlightStyle={{ backgroundColor: "#FFF9C4", color: "#555", borderRadius: 2 }}
            />
          </View>

          {isLowStock && (
            <View style={[styles.lowBadge, { backgroundColor: colors.destructive }]}>
              <MaterialIcons name="warning" size={10} color="#fff" />
              <Text style={styles.lowBadgeText}>Kam</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.priceGroup}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Tan:</Text>
            <Text style={[styles.priceVal, { color: colors.foreground }]}>
              {product.costPrice.toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceGroup}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Sotuv:</Text>
            <Text style={[styles.priceVal, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              {product.salePrice.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.profitChip, { backgroundColor: profit >= 0 ? "#E8F5E9" : "#FFEBEE" }]}>
            <Text style={[styles.profitChipText, { color: profit >= 0 ? "#2E7D32" : "#C62828" }]}>
              +{profitPct}%
            </Text>
          </View>
          <View style={[styles.qtyChip, { backgroundColor: isLowStock ? colors.destructive : colors.primary }]}>
            <Text style={styles.qtyChipText}>{product.quantity} dona</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleEdit}
              style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={15} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.actionBtn, { backgroundColor: "#FEECEC" }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete-outline" size={15} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: products, isLoading, refetch, isRefetching } = useGetProducts();

  const { mutate: deleteProduct } = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
    },
  });

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(text), 120);
  }, []);

  const handleDelete = useCallback((id: number) => {
    deleteProduct({ id });
  }, [deleteProduct]);

  const handleEdit = useCallback((product: Product) => {
    router.push({ pathname: "/product-form", params: { id: String(product.id) } });
  }, [router]);

  const handleSort = (key: SortKey) => {
    Haptics.selectionAsync();
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = (products ?? [])
    .filter((p) => {
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = typeof a[sortKey] === "string" ? (a[sortKey] as string).toLowerCase() : a[sortKey];
      const bv = typeof b[sortKey] === "string" ? (b[sortKey] as string).toLowerCase() : b[sortKey];
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

  const lowStockCount = (products ?? []).filter((p) => p.quantity < 5).length;

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <TouchableOpacity style={styles.sortBtn} onPress={() => handleSort(col)} activeOpacity={0.7}>
      <Text style={[styles.sortLabel, { color: sortKey === col ? colors.primary : colors.mutedForeground }]}>
        {label}
      </Text>
      {sortKey === col && (
        <MaterialIcons
          name={sortAsc ? "arrow-upward" : "arrow-downward"}
          size={11}
          color={colors.primary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: isWeb ? 20 : 12, paddingHorizontal: 16 }]}>
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.card, borderColor: search ? colors.primary : colors.border },
          ]}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={search ? colors.primary : colors.mutedForeground}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Tovar nomi yoki brend..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {search.length > 0 && Platform.OS !== "ios" && (
            <TouchableOpacity onPress={() => { setSearch(""); setDebouncedSearch(""); }}>
              <MaterialIcons name="close" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addFab, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/product-form");
          }}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {lowStockCount > 0 && (
        <View style={[styles.alertStrip, { backgroundColor: "#FFF3E0", borderColor: "#FFB74D", marginHorizontal: 16, marginTop: 10 }]}>
          <MaterialIcons name="warning-amber" size={16} color="#E65100" />
          <Text style={[styles.alertStripText, { color: "#E65100" }]}>
            {lowStockCount} ta tovar kam qolgan (5 tadan kam)
          </Text>
          <TouchableOpacity onPress={() => handleSort("quantity")}>
            <Text style={[styles.alertLink, { color: colors.primary }]}>Ko'rish</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.meta, { paddingHorizontal: 16, marginTop: 10 }]}>
        <Text style={[styles.countText, { color: colors.mutedForeground }]}>
          {filtered.length}/{products?.length ?? 0} mahsulot
          {debouncedSearch ? ` — "${debouncedSearch}"` : ""}
        </Text>
        <View style={styles.sortRow}>
          <Text style={[styles.sortByLabel, { color: colors.mutedForeground }]}>Tartiblash: </Text>
          <SortBtn col="name" label="Nom" />
          <SortBtn col="costPrice" label="Narx" />
          <SortBtn col="quantity" label="Soni" />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Yuklanmoqda...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons name={debouncedSearch ? "search-off" : "inventory-2"} size={52} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {debouncedSearch ? "Hech narsa topilmadi" : "Mahsulotlar yo'q"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {debouncedSearch
              ? `"${debouncedSearch}" bo'yicha natija yo'q`
              : "Birinchi mahsulotingizni qo'shing"}
          </Text>
          {!debouncedSearch && (
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/product-form")}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Qo'shish</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <ProductCard
              product={item}
              query={debouncedSearch}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isEven={index % 2 === 0}
              colors={colors}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + 90,
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  addFab: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1565C0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  alertStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  alertStripText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12 },
  alertLink: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 },
  countText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  sortRow: { flexDirection: "row", alignItems: "center" },
  sortByLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 7, paddingVertical: 3 },
  sortLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 8 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13 },
  emptyBtn: { marginTop: 12, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  card: {
    borderRadius: 14,
    marginBottom: 8,
    padding: 12,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: "hidden",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 },
  cardLeft: { flex: 1, paddingRight: 8 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 },
  idBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  idText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  brand: { fontFamily: "Inter_400Regular", fontSize: 12 },
  lowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  lowBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  priceGroup: { flexDirection: "row", alignItems: "center", gap: 3 },
  priceLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  priceVal: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  profitChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  profitChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  qtyChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  qtyChipText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  actions: { flexDirection: "row", gap: 6, marginLeft: "auto" },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
