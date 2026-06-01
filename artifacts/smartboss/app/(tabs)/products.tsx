import {
  useGetProducts,
  useDeleteProduct,
  useCreateProductDeleteRequest,
  getGetProductsQueryKey,
  getGetDashboardStatsQueryKey,
  type Product,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { WebRefreshBar } from "@/components/WebRefreshBar";
import { SubscriptionLockScreen } from "@/components/SubscriptionLockScreen";

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
  onImagePress,
  isEven,
  colors,
  isWorker,
}: {
  product: Product;
  query: string;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onImagePress: (url: string) => void;
  isEven: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  isWorker: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isLowStock = product.quantity < 5;
  const profit = product.salePrice - product.costPrice;
  const profitPct = product.costPrice > 0 ? ((profit / product.costPrice) * 100).toFixed(0) : "0";

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onDelete(product);
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

          <View style={styles.cardTopRight}>
            {product.imageUrl ? (
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  onImagePress(product.imageUrl!);
                }}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
            ) : null}
            {isLowStock && (
              <View style={[styles.lowBadge, { backgroundColor: colors.destructive }]}>
                <MaterialIcons name="warning" size={10} color="#fff" />
                <Text style={styles.lowBadgeText}>Kam</Text>
              </View>
            )}
          </View>
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
            <Text style={styles.qtyChipText}>{product.quantity} {product.unit ?? "dona"}</Text>
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
              style={[styles.actionBtn, { backgroundColor: isWorker ? "#FFF3E0" : "#FEECEC" }]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isWorker ? "send" : "delete-outline"}
                size={15}
                color={isWorker ? "#E65100" : colors.destructive}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function ProductsScreenInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const isWorker = role === "worker";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [unitFilter, setUnitFilter] = useState<"all" | "dona" | "kg" | "m">("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageSearching, setImageSearching] = useState(false);
  const [imageMatchedIds, setImageMatchedIds] = useState<number[] | null>(null);

  // Confirm modal for manager (direct delete) and worker (send request)
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const { data: products, isLoading, refetch, isRefetching } = useGetProducts();

  const { mutate: deleteProduct, isPending: deleting } = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        setConfirmProduct(null);
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
    },
  });

  const { mutate: sendDeleteRequest, isPending: sendingRequest } = useCreateProductDeleteRequest({
    mutation: {
      onSuccess: () => {
        setRequestSent(true);
      },
    },
  });

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(text), 120);
  }, []);

  const handleDelete = useCallback((product: Product) => {
    setRequestSent(false);
    setConfirmProduct(product);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!confirmProduct) return;
    if (isWorker) {
      sendDeleteRequest({
        data: {
          productIds: [confirmProduct.id],
          productNames: [confirmProduct.name],
        },
      });
    } else {
      deleteProduct({ id: confirmProduct.id });
    }
  }, [confirmProduct, isWorker, sendDeleteRequest, deleteProduct]);

  const handleCloseModal = useCallback(() => {
    setConfirmProduct(null);
    setRequestSent(false);
  }, []);

  const handleEdit = useCallback((product: Product) => {
    router.push({ pathname: "/product-form", params: { id: String(product.id) } });
  }, [router]);

  const clearImageSearch = useCallback(() => {
    setImageMatchedIds(null);
    setSearch("");
    setDebouncedSearch("");
  }, []);

  const handleCameraSearch = useCallback(async () => {
    if (Platform.OS === "web") return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Kamera ruxsati", "Kamera ruxsatini ilovaga bering va qayta urinib ko'ring.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.65,
      base64: true,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    setImageSearching(true);
    setImageMatchedIds(null);

    try {
      const base64 = result.assets[0].base64;
      const apiUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/products/image-search`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: base64, mimeType: "image/jpeg" }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Server xatosi: ${response.status}`);
      }

      const data = await response.json() as { matchedIds: number[]; searchQuery: string };
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setImageMatchedIds(data.matchedIds ?? []);
      if (data.searchQuery) {
        setSearch(data.searchQuery);
        setDebouncedSearch(data.searchQuery);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Noma'lum xato";
      Alert.alert("Qidirishda xato", msg);
      setImageMatchedIds(null);
    } finally {
      setImageSearching(false);
    }
  }, []);

  const handleSort = (key: SortKey) => {
    Haptics.selectionAsync();
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = (products ?? [])
    .filter((p) => {
      if (imageMatchedIds !== null) return imageMatchedIds.includes(p.id);
      if (unitFilter !== "all" && p.unit !== unitFilter) return false;
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
      <WebRefreshBar refreshing={isRefetching} onRefresh={refetch} />
      <View style={[styles.topBar, { paddingTop: isWeb ? 20 : 12, paddingHorizontal: 16 }]}>
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: colors.card,
              borderColor: imageMatchedIds !== null ? colors.primary : search ? colors.primary : colors.border,
            },
          ]}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={imageMatchedIds !== null || search ? colors.primary : colors.mutedForeground}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Tovar nomi yoki brend..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={(t) => { setImageMatchedIds(null); handleSearchChange(t); }}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {(search.length > 0 || imageMatchedIds !== null) && Platform.OS !== "ios" && (
            <TouchableOpacity onPress={() => { setSearch(""); setDebouncedSearch(""); setImageMatchedIds(null); }}>
              <MaterialIcons name="close" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          {Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={handleCameraSearch}
              disabled={imageSearching}
              style={styles.cameraBtn}
              activeOpacity={0.7}
            >
              {imageSearching
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <MaterialIcons
                    name="camera-alt"
                    size={20}
                    color={imageMatchedIds !== null ? colors.primary : colors.mutedForeground}
                  />
              }
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

      {imageMatchedIds !== null && (
        <View style={[styles.alertStrip, { backgroundColor: "#E3F2FD", borderColor: colors.primary, marginHorizontal: 16, marginTop: 10 }]}>
          <MaterialIcons name="image-search" size={16} color={colors.primary} />
          <Text style={[styles.alertStripText, { color: colors.primary }]}>
            {imageMatchedIds.length > 0
              ? `AI: ${imageMatchedIds.length} ta mahsulot topildi`
              : "AI: Mos mahsulot topilmadi"}
          </Text>
          <TouchableOpacity onPress={clearImageSearch}>
            <MaterialIcons name="close" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.meta, { paddingHorizontal: 16, marginTop: 10 }]}>
        <Text style={[styles.countText, { color: colors.mutedForeground }]}>
          {filtered.length}/{products?.length ?? 0} mahsulot
          {imageMatchedIds !== null ? " — AI qidiruv" : debouncedSearch ? ` — "${debouncedSearch}"` : ""}
        </Text>
        <View style={styles.sortRow}>
          <Text style={[styles.sortByLabel, { color: colors.mutedForeground }]}>Tartiblash: </Text>
          <SortBtn col="name" label="Nom" />
          <SortBtn col="costPrice" label="Narx" />
          <SortBtn col="quantity" label="Soni" />
        </View>
      </View>

      {/* Unit filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.unitTabsContainer}
        style={styles.unitTabsScroll}
      >
        {([
          { key: "all", label: "Barchasi", icon: "📦" },
          { key: "dona", label: "Dona", icon: "🔢" },
          { key: "kg", label: "Kg", icon: "⚖️" },
          { key: "m", label: "Metr", icon: "📏" },
        ] as const).map((ut) => {
          const isActive = unitFilter === ut.key;
          return (
            <TouchableOpacity
              key={ut.key}
              style={[
                styles.unitTab,
                isActive
                  ? { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }
                  : { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => { Haptics.selectionAsync(); setUnitFilter(ut.key); }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 22 }}>{ut.icon}</Text>
              <Text style={[
                styles.unitTabText,
                { color: isActive ? "#fff" : colors.foreground },
                isActive && { fontFamily: "Inter_700Bold" },
              ]}>
                {ut.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Yuklanmoqda...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons name={debouncedSearch || imageMatchedIds !== null ? "search-off" : "inventory-2"} size={52} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {debouncedSearch || imageMatchedIds !== null ? "Hech narsa topilmadi" : "Mahsulotlar yo'q"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {imageMatchedIds !== null
              ? "Rasmga mos mahsulot topilmadi"
              : debouncedSearch
              ? `"${debouncedSearch}" bo'yicha natija yo'q`
              : "Birinchi mahsulotingizni qo'shing"}
          </Text>
          {imageMatchedIds !== null && (
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={clearImageSearch}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Qidiruvni tozalash</Text>
            </TouchableOpacity>
          )}
          {!debouncedSearch && imageMatchedIds === null && (
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
              onImagePress={setImagePreviewUrl}
              isEven={index % 2 === 0}
              colors={colors}
              isWorker={isWorker}
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

      {/* Full-size image preview Modal */}
      <Modal
        visible={!!imagePreviewUrl}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setImagePreviewUrl(null)}
      >
        <TouchableOpacity
          style={styles.imgModalBackdrop}
          activeOpacity={1}
          onPress={() => setImagePreviewUrl(null)}
        >
          <View style={styles.imgModalContent}>
            {imagePreviewUrl && (
              <Image
                source={{ uri: imagePreviewUrl }}
                style={styles.imgModalImage}
                contentFit="contain"
                transition={150}
              />
            )}
            <TouchableOpacity
              style={styles.imgModalClose}
              onPress={() => setImagePreviewUrl(null)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm / Request Modal */}
      <Modal
        visible={!!confirmProduct}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            {requestSent ? (
              <>
                <View style={[styles.modalIconWrap, { backgroundColor: "#E8F5E9" }]}>
                  <MaterialIcons name="check-circle" size={32} color="#2E7D32" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>So'rov yuborildi!</Text>
                <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
                  Rahbar tasdiqlasa, mahsulot o'chiriladi.
                </Text>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCloseModal}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalConfirmBtnText}>Yaxshi</Text>
                </TouchableOpacity>
              </>
            ) : isWorker ? (
              <>
                <View style={[styles.modalIconWrap, { backgroundColor: "#FFF3E0" }]}>
                  <MaterialIcons name="send" size={32} color="#E65100" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>O'chirish so'rovi</Text>
                <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
                  <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>
                    "{confirmProduct?.name}"
                  </Text>
                  {" "}mahsulotini o'chirish uchun rahbarga so'rov yuborilsinmi?
                </Text>
                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    onPress={handleCloseModal}
                    activeOpacity={0.8}
                    disabled={sendingRequest}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.mutedForeground }]}>Yo'q</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, { backgroundColor: "#E65100", flex: 1 }]}
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                    disabled={sendingRequest}
                  >
                    {sendingRequest
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <MaterialIcons name="send" size={16} color="#fff" />
                          <Text style={styles.modalConfirmBtnText}>Ha, yuborish</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.modalIconWrap, { backgroundColor: "#FEE2E2" }]}>
                  <MaterialIcons name="delete-forever" size={32} color="#DC2626" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mahsulotni o'chirish</Text>
                <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
                  <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>
                    "{confirmProduct?.name}"
                  </Text>
                  {" "}mahsulotini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.
                </Text>
                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    onPress={handleCloseModal}
                    activeOpacity={0.8}
                    disabled={deleting}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.mutedForeground }]}>Yo'q</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, { backgroundColor: "#DC2626", flex: 1 }]}
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                    disabled={deleting}
                  >
                    {deleting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <MaterialIcons name="delete-forever" size={16} color="#fff" />
                          <Text style={styles.modalConfirmBtnText}>Ha, o'chirish</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  unitTabsScroll: { flexGrow: 0, maxHeight: 72 },
  unitTabsContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  unitTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 26,
    paddingVertical: 16,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  unitTabText: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
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
  cameraBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
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
  cardTopRight: { flexDirection: "column", alignItems: "flex-end", gap: 4 },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  imgModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  imgModalContent: {
    width: "90%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  imgModalImage: {
    width: "100%",
    height: "100%",
  },
  imgModalClose: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
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
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalSheet: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  modalMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
  },
  modalBtns: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  modalConfirmBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
  },
  modalConfirmBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});

export default function ProductsScreen() {
  const { subscriptionActive } = useAuth();
  if (!subscriptionActive) return <SubscriptionLockScreen screenName="Tovarlar" />;
  return <ProductsScreenInner />;
}
