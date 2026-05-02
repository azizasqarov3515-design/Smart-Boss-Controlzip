import {
  useGetProducts,
  useCreateSale,
  getGetProductsQueryKey,
  getGetDashboardStatsQueryKey,
  getGetSalesQueryKey,
  type Product,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
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

type CartItem = {
  product: Product;
  quantity: number;
};

function formatMoney(n: number) {
  return n.toLocaleString("uz-UZ") + " UZS";
}

export default function POSScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";

  const [cart, setCart] = useState<Map<number, CartItem>>(new Map());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"cart" | "products">("cart");
  const [permission, requestPermission] = useCameraPermissions();
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  const { data: products, isLoading: productsLoading } = useGetProducts();
  const { mutate: createSale, isPending: checkingOut } = useCreateSale({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
        setCart(new Map());
        setTab("cart");
        setCheckoutSuccess(true);
        Animated.sequence([
          Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setCheckoutSuccess(false));
      },
      onError: (err: Error) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Xato", err.message || "Sotuv amalga oshmadi");
      },
    },
  });

  const addToCart = useCallback((product: Product, qty = 1) => {
    if (product.quantity <= 0) {
      Alert.alert("Stok yo'q", `"${product.name}" mahsulotida stok qolmagan`);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.id);
      const newQty = (existing?.quantity ?? 0) + qty;
      if (newQty > product.quantity) {
        Alert.alert("Stok yetarli emas", `Faqat ${product.quantity} dona mavjud`);
        return prev;
      }
      next.set(product.id, { product, quantity: newQty });
      return next;
    });
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const item = next.get(productId);
      if (!item) return prev;
      if (qty <= 0) {
        next.delete(productId);
      } else if (qty > item.product.quantity) {
        Alert.alert("Stok yetarli emas", `Faqat ${item.product.quantity} dona mavjud`);
      } else {
        next.set(productId, { ...item, quantity: qty });
      }
      return next;
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  const cartItems = Array.from(cart.values());
  const total = cartItems.reduce((s, i) => s + i.product.salePrice * i.quantity, 0);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const found = products?.find((p) => p.barcode === data);
      if (found) {
        setScannerOpen(false);
        addToCart(found);
        setTimeout(() => setScanned(false), 1500);
      } else {
        Alert.alert(
          "Topilmadi",
          `Barcode: ${data}\n\nBu mahsulot bazada yo'q yoki barcode biriktirilmagan.`,
          [
            {
              text: "Qayta skaner",
              onPress: () => setScanned(false),
            },
            {
              text: "Yopish",
              onPress: () => {
                setScannerOpen(false);
                setScanned(false);
              },
            },
          ]
        );
      }
    },
    [scanned, products, addToCart]
  );

  const openScanner = async () => {
    if (isWeb) {
      Alert.alert("Kamera", "Barcode skanerlash faqat Android/iOS qurilmalarida ishlaydi");
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Ruxsat kerak",
          "Barcode skanerlash uchun kamera ruxsatini bering",
          [{ text: "OK" }]
        );
        return;
      }
    }
    setScanned(false);
    setScannerOpen(true);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    Alert.alert(
      "Sotishni tasdiqlash",
      `Jami: ${formatMoney(total)}\n${totalItems} dona mahsulot`,
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Sotish",
          onPress: () => {
            createSale({
              data: {
                items: cartItems.map((i) => ({
                  productId: i.product.id,
                  quantity: i.quantity,
                })),
              },
            });
          },
        },
      ]
    );
  };

  const filteredProducts = (products ?? []).filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.barcode?.includes(q);
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barcode Scanner Modal */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scannerModal}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr", "code128", "code39", "upc_a", "upc_e", "itf14"] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
          {/* Scanner overlay */}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerTop}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => { setScannerOpen(false); setScanned(false); }}
              >
                <MaterialIcons name="close" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Barcode skanerlang</Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              {scanned && (
                <View style={styles.scannedIndicator}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.scannedText}>Tekshirilmoqda...</Text>
                </View>
              )}
            </View>

            <Text style={styles.scanHint}>
              Mahsulot barkodini ramka ichiga to'g'rilang
            </Text>
          </View>
        </View>
      </Modal>

      {/* Success overlay */}
      {checkoutSuccess && (
        <Animated.View
          style={[
            styles.successOverlay,
            { opacity: successAnim, transform: [{ scale: successAnim }] },
          ]}
        >
          <View style={[styles.successCard, { backgroundColor: colors.card }]}>
            <MaterialIcons name="check-circle" size={56} color={colors.success} />
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Sotuv amalga oshdi!</Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>Ombor yangilandi</Text>
          </View>
        </Animated.View>
      )}

      {/* Tab switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, tab === "cart" && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
          onPress={() => setTab("cart")}
          activeOpacity={0.8}
        >
          <MaterialIcons name="shopping-cart" size={18} color={tab === "cart" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.tabLabel, { color: tab === "cart" ? colors.primary : colors.mutedForeground }]}>
            Savat {cartItems.length > 0 ? `(${cartItems.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === "products" && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
          onPress={() => setTab("products")}
          activeOpacity={0.8}
        >
          <MaterialIcons name="inventory-2" size={18} color={tab === "products" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.tabLabel, { color: tab === "products" ? colors.primary : colors.mutedForeground }]}>
            Mahsulotlar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scanBtn}
          onPress={openScanner}
          activeOpacity={0.85}
        >
          <MaterialIcons name="qr-code-scanner" size={22} color="#fff" />
          <Text style={styles.scanBtnText}>Skaner</Text>
        </TouchableOpacity>
      </View>

      {/* Cart tab */}
      {tab === "cart" && (
        <View style={styles.flex}>
          {cartItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <MaterialIcons name="shopping-cart" size={64} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Savat bo'sh</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Mahsulotlar yorlig'idan yoki barkod orqali qo'shing
              </Text>
              <View style={styles.emptyActions}>
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setTab("products")}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyBtnText}>Mahsulot tanlash</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.emptyBtnOutline, { borderColor: colors.primary }]}
                  onPress={openScanner}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="qr-code-scanner" size={18} color={colors.primary} />
                  <Text style={[styles.emptyBtnOutlineText, { color: colors.primary }]}>Barkod skaner</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <FlatList
                data={cartItems}
                keyExtractor={(item) => String(item.product.id)}
                contentContainerStyle={{ padding: 14, paddingBottom: 180 }}
                renderItem={({ item }) => (
                  <CartCard
                    item={item}
                    colors={colors}
                    onQty={setQty}
                    onRemove={removeFromCart}
                  />
                )}
                showsVerticalScrollIndicator={false}
              />

              {/* Checkout panel */}
              <View
                style={[
                  styles.checkoutPanel,
                  {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    paddingBottom: insets.bottom + 70,
                  },
                ]}
              >
                <View style={styles.checkoutRow}>
                  <Text style={[styles.checkoutLabel, { color: colors.mutedForeground }]}>
                    Jami ({totalItems} dona):
                  </Text>
                  <Text style={[styles.checkoutTotal, { color: colors.foreground }]}>
                    {formatMoney(total)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.checkoutBtn,
                    { backgroundColor: checkingOut ? colors.mutedForeground : colors.success },
                  ]}
                  onPress={handleCheckout}
                  disabled={checkingOut}
                  activeOpacity={0.85}
                >
                  {checkingOut ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={22} color="#fff" />
                      <Text style={styles.checkoutBtnText}>Sotish — {formatMoney(total)}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Products tab */}
      {tab === "products" && (
        <View style={styles.flex}>
          <View style={[styles.searchWrap, { paddingHorizontal: 14, paddingTop: 12 }]}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.card, borderColor: search ? colors.primary : colors.border },
              ]}
            >
              <MaterialIcons name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="Tovar qidirish..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <MaterialIcons name="close" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {productsLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(p) => String(p.id)}
              contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 80 }}
              renderItem={({ item: p }) => {
                const inCart = cart.get(p.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: inCart ? colors.secondary : colors.card,
                        borderColor: inCart ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => addToCart(p)}
                    activeOpacity={0.8}
                    disabled={p.quantity === 0}
                  >
                    <View style={styles.productCardLeft}>
                      <View style={styles.productNameRow}>
                        <View style={[styles.idChip, { backgroundColor: colors.surfaceVariant }]}>
                          <Text style={[styles.idChipText, { color: colors.mutedForeground }]}>#{p.id}</Text>
                        </View>
                        <Text
                          style={[
                            styles.productName,
                            { color: p.quantity === 0 ? colors.mutedForeground : colors.foreground },
                          ]}
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                      </View>
                      <Text style={[styles.productBrand, { color: colors.mutedForeground }]}>{p.brand}</Text>
                      {p.barcode && (
                        <Text style={[styles.barcodeText, { color: colors.mutedForeground }]}>
                          <MaterialIcons name="qr-code" size={11} color={colors.mutedForeground} /> {p.barcode}
                        </Text>
                      )}
                    </View>
                    <View style={styles.productCardRight}>
                      <Text style={[styles.productPrice, { color: colors.primary }]}>
                        {formatMoney(p.salePrice)}
                      </Text>
                      <View
                        style={[
                          styles.stockChip,
                          { backgroundColor: p.quantity === 0 ? colors.destructive : p.quantity < 5 ? colors.warning : colors.success },
                        ]}
                      >
                        <Text style={styles.stockText}>
                          {p.quantity === 0 ? "Tugagan" : `${p.quantity} dona`}
                        </Text>
                      </View>
                      {inCart ? (
                        <View style={[styles.inCartChip, { backgroundColor: colors.primary }]}>
                          <Text style={styles.inCartText}>Savat: {inCart.quantity}</Text>
                        </View>
                      ) : p.quantity > 0 ? (
                        <View style={[styles.addChip, { backgroundColor: colors.secondary }]}>
                          <MaterialIcons name="add" size={14} color={colors.primary} />
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyProducts}>
                  <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Mahsulot topilmadi</Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      )}
    </View>
  );
}

function CartCard({
  item,
  colors,
  onQty,
  onRemove,
}: {
  item: CartItem;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
}) {
  const subtotal = item.product.salePrice * item.quantity;
  return (
    <View
      style={[
        styles.cartCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.cartCardTop}>
        <View style={styles.cartCardInfo}>
          <View style={[styles.idChip, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.idChipText, { color: colors.mutedForeground }]}>#{item.product.id}</Text>
          </View>
          <View style={styles.cartNameBlock}>
            <Text style={[styles.cartName, { color: colors.foreground }]} numberOfLines={1}>
              {item.product.name}
            </Text>
            <Text style={[styles.cartBrand, { color: colors.mutedForeground }]}>{item.product.brand}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => onRemove(item.product.id)} style={styles.removeBtn}>
          <MaterialIcons name="close" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <View style={styles.cartCardBottom}>
        <Text style={[styles.unitPrice, { color: colors.mutedForeground }]}>
          {item.product.salePrice.toLocaleString()} UZS × {item.quantity}
        </Text>
        <View style={styles.qtyControls}>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={() => onQty(item.product.id, item.quantity - 1)}
          >
            <MaterialIcons name="remove" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
            onPress={() => onQty(item.product.id, item.quantity + 1)}
          >
            <MaterialIcons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtotal, { color: colors.primary }]}>{subtotal.toLocaleString()} UZS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 4,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: "auto" as any,
    backgroundColor: "#1565C0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scanBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  emptyCart: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 8 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  emptyActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  emptyBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  emptyBtnOutlineText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  emptyProducts: { paddingTop: 40, alignItems: "center" },
  cartCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cartCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  cartCardInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  cartNameBlock: { flex: 1 },
  cartName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  cartBrand: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  removeBtn: { padding: 4 },
  cartCardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  unitPrice: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  qtyText: { fontFamily: "Inter_700Bold", fontSize: 16, minWidth: 28, textAlign: "center" },
  subtotal: { fontFamily: "Inter_700Bold", fontSize: 14, minWidth: 90, textAlign: "right" },
  checkoutPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  checkoutRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  checkoutLabel: { fontFamily: "Inter_400Regular", fontSize: 14 },
  checkoutTotal: { fontFamily: "Inter_700Bold", fontSize: 20 },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  checkoutBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  searchWrap: { marginBottom: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  productCardLeft: { flex: 1, paddingRight: 8 },
  productNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  productName: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  productBrand: { fontFamily: "Inter_400Regular", fontSize: 12 },
  barcodeText: { fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 2 },
  productCardRight: { alignItems: "flex-end", gap: 5 },
  productPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  stockChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  stockText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  inCartChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  inCartText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  addChip: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  idChip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  idChipText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  scannerModal: { flex: 1, backgroundColor: "#000" },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 54,
    paddingBottom: 60,
  },
  scannerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  scanFrame: {
    width: 260,
    height: 200,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#fff",
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  scannedIndicator: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  scannedText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#fff" },
  scanHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 100,
  },
  successCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  successSub: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
