import {
  useGetProducts,
  useCreateSale,
  useGetCustomers,
  getGetProductsQueryKey,
  getGetDashboardStatsQueryKey,
  getGetSalesQueryKey,
  getGetCustomersQueryKey,
  type Product,
  type Customer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
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
import { WebRefreshBar } from "@/components/WebRefreshBar";

type CartItem = {
  product: Product;
  quantity: number;
};

function formatMoney(n: number) {
  return n.toLocaleString("uz-UZ") + " UZS";
}

// ─── Scanner Modal ──────────────────────────────────────────────────────────
function ScannerModal({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
}) {
  const isWeb = Platform.OS === "web";
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [permissionAsked, setPermissionAsked] = useState(false);
  const [camError, setCamError] = useState(false);
  const lineAnim = useRef(new Animated.Value(0)).current;

  // Reset state each time modal opens
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setManualBarcode("");
      setCamError(false);
      setPermissionAsked(false);
    }
  }, [visible]);

  // Request permission when modal opens
  useEffect(() => {
    if (!visible || permissionAsked) return;
    if (permission === null || permission?.status === "undetermined") {
      setPermissionAsked(true);
      requestPermission();
    } else {
      setPermissionAsked(true);
    }
  }, [visible, permission, permissionAsked, requestPermission]);

  // Animate scan line
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(lineAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, lineAnim]);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => {
        onScanned(data);
        setScanned(false);
      }, 400);
    },
    [scanned, onScanned]
  );

  const handleManualSubmit = () => {
    const code = manualBarcode.trim();
    if (!code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onScanned(code);
    setManualBarcode("");
  };

  const showCamera = !isWeb && !camError && permission?.granted;
  const showPermissionDenied = !isWeb && !camError && permission?.granted === false;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.scannerRoot}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.scannerHeader}>
          <TouchableOpacity
            style={styles.scannerCloseBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.scannerHeaderTitle}>Barcode skaner</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Camera area */}
        {showCamera && (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  "ean13", "ean8", "qr", "code128",
                  "code39", "upc_a", "upc_e", "itf14",
                  "codabar", "code93", "datamatrix",
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              onCameraReady={() => setCamError(false)}
            />

            {/* Dark overlay with scan frame cutout */}
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddleRow}>
              <View style={styles.overlaySide} />
              <View style={styles.scanFrame}>
                {/* Corners */}
                <View style={[styles.corner, styles.cTL]} />
                <View style={[styles.corner, styles.cTR]} />
                <View style={[styles.corner, styles.cBL]} />
                <View style={[styles.corner, styles.cBR]} />

                {/* Scan line */}
                {!scanned && (
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY: lineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 180],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}

                {scanned && (
                  <View style={styles.scannedBox}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.scannedLabel}>Tekshirilmoqda...</Text>
                  </View>
                )}
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom} />

            <Text style={styles.scanHint}>
              Barkodni ramka ichiga to'g'rilang
            </Text>
          </View>
        )}

        {/* Permission loading */}
        {!isWeb && !permission && (
          <View style={styles.permWrap}>
            <ActivityIndicator size="large" color="#1565C0" />
            <Text style={styles.permText}>Kamera ruxsati so'ralmoqda...</Text>
          </View>
        )}

        {/* Permission denied */}
        {showPermissionDenied && (
          <View style={styles.permWrap}>
            <MaterialIcons name="no-photography" size={56} color="#EF5350" />
            <Text style={styles.permTitle}>Kamera ruxsati yo'q</Text>
            <Text style={styles.permText}>
              Telefon sozlamalarida kamera ruxsatini bering, keyin qayta urinib ko'ring.
            </Text>
            <TouchableOpacity
              style={styles.permBtn}
              onPress={() => requestPermission()}
              activeOpacity={0.85}
            >
              <Text style={styles.permBtnText}>Ruxsat so'rash</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Camera error fallback */}
        {!isWeb && camError && (
          <View style={styles.permWrap}>
            <MaterialIcons name="error-outline" size={48} color="#FF9800" />
            <Text style={styles.permTitle}>Kamera ishlamadi</Text>
            <Text style={styles.permText}>Qo'lda barcode kiriting</Text>
          </View>
        )}

        {/* Web: no native camera API → show instructions */}
        {isWeb && (
          <View style={styles.webCamWrap}>
            <MaterialIcons name="qr-code-scanner" size={72} color="#1565C0" />
            <Text style={styles.webCamTitle}>Barcode skanerlash</Text>
            <Text style={styles.webCamSub}>
              Quyida barcode raqamini kiriting yoki mahsulot ID sini yozing
            </Text>
          </View>
        )}

        {/* Manual barcode input — always available */}
        <View style={styles.manualWrap}>
          <Text style={styles.manualLabel}>
            {isWeb
              ? "Barcode / mahsulot ID raqamini kiriting:"
              : "Yoki qo'lda barcode kiriting:"}
          </Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Barcode yoki ID..."
              placeholderTextColor="#9E9E9E"
              keyboardType="default"
              returnKeyType="search"
              autoFocus={isWeb}
              onSubmitEditing={handleManualSubmit}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[
                styles.manualBtn,
                { backgroundColor: manualBarcode.trim() ? "#1565C0" : "#B0BEC5" },
              ]}
              onPress={handleManualSubmit}
              disabled={!manualBarcode.trim()}
              activeOpacity={0.85}
            >
              <MaterialIcons name="search" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.manualHint}>
            Tip: Mahsulot ID raqamini ham kiritsa bo'ladi (masalan: 12)
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main POS Screen ─────────────────────────────────────────────────────────
export default function POSScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<Map<number, CartItem>>(new Map());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"cart" | "products">("cart");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<"cash" | "card" | "debt">("cash");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [partialPayment, setPartialPayment] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const successAnim = useRef(new Animated.Value(0)).current;

  const { data: products, isLoading: productsLoading, refetch: refetchProducts, isRefetching: productsRefetching } = useGetProducts();
  const { data: customers, refetch: refetchCustomers, isLoading: customersLoading } = useGetCustomers();

  useEffect(() => {
    if (customerPickerOpen) {
      refetchCustomers();
    }
  }, [customerPickerOpen, refetchCustomers]);

  const routeParams = useLocalSearchParams<{ preCustomerId?: string; preCustomerName?: string }>();
  useEffect(() => {
    if (routeParams.preCustomerId && customers) {
      const preId = parseInt(routeParams.preCustomerId, 10);
      const found = customers.find((c) => c.id === preId);
      if (found) {
        setSelectedCustomer(found);
        setTab("products");
      }
    }
  }, [routeParams.preCustomerId, customers]);
  const { mutate: createSale, isPending: checkingOut } = useCreateSale({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        setConfirmOpen(false);
        setSaleError(null);
        setCart(new Map());
        setTab("cart");
        setCheckoutSuccess(true);
        Animated.sequence([
          Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1600),
          Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setCheckoutSuccess(false));
      },
      onError: (err: Error) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setSaleError(err.message || "Sotuv amalga oshmadi");
      },
    },
  });

  const addToCart = useCallback(
    (product: Product, qty = 1) => {
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
    },
    []
  );

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

  // Called by scanner modal when a barcode is found
  const handleScanned = useCallback(
    (data: string) => {
      // Try exact barcode match first
      let found = products?.find((p) => p.barcode === data);

      // If not found by barcode, try matching as numeric product ID
      if (!found) {
        const asId = parseInt(data, 10);
        if (!isNaN(asId)) {
          found = products?.find((p) => p.id === asId);
        }
      }

      if (found) {
        setScannerOpen(false);
        addToCart(found);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(
          "Topilmadi",
          `"${data}" — bu barcode yoki ID bazada yo'q.\n\nMahsulotda barcode biriktirilganini tekshiring.`,
          [
            { text: "Qayta urinish", onPress: () => {} },
            {
              text: "Yopish",
              style: "destructive",
              onPress: () => setScannerOpen(false),
            },
          ]
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [products, addToCart]
  );

  const cartItems = Array.from(cart.values());
  const total = cartItems.reduce((s, i) => s + i.product.salePrice * i.quantity, 0);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setSaleError(null);
    setPartialPayment("");
    setConfirmOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleConfirmSale = () => {
    if (paymentType === "debt" && !selectedCustomer) {
      setSaleError("Qarz uchun mijoz tanlanishi shart");
      return;
    }
    const paid = paymentType === "debt"
      ? (partialPayment ? parseFloat(partialPayment.replace(/\s/g, "")) || 0 : 0)
      : undefined;
    createSale({
      data: {
        items: cartItems.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        paymentType,
        customerId: selectedCustomer?.id ?? undefined,
        paidAmount: paid,
      },
    });
  };

  const filteredProducts = (products ?? []).filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode?.includes(q) ||
      String(p.id).includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScanned}
      />

      {/* ── In-app checkout confirmation modal ── */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => !checkingOut && setConfirmOpen(false)}
      >
        <TouchableOpacity
          style={styles.confirmBackdrop}
          activeOpacity={1}
          onPress={() => !checkingOut && setConfirmOpen(false)}
        />
        <View style={[styles.confirmSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.confirmHandle, { backgroundColor: colors.border }]} />

          <View style={styles.confirmHeader}>
            <MaterialIcons name="shopping-cart-checkout" size={28} color={colors.primary} />
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
              Sotishni tasdiqlash
            </Text>
          </View>

          {/* Payment type selector */}
          <View style={[styles.payTypeRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            {(["cash", "card", "debt"] as const).map((pt) => {
              const labels = { cash: "💵 Naqd", card: "💳 Karta", debt: "📋 Qarz" };
              const isActive = paymentType === pt;
              return (
                <TouchableOpacity
                  key={pt}
                  style={[styles.payTypeBtn, isActive && { backgroundColor: pt === "debt" ? "#DC2626" : colors.primary }]}
                  onPress={() => { setPaymentType(pt); setSaleError(null); }}
                  activeOpacity={0.8}
                  disabled={checkingOut}
                >
                  <Text style={[styles.payTypeBtnText, { color: isActive ? "#fff" : colors.mutedForeground }]}>
                    {labels[pt]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Customer badge — shown for ALL payment types when a customer is set */}
          {selectedCustomer && (
            <View style={[styles.customerBadge, { backgroundColor: colors.secondary, borderColor: colors.primary + "44" }]}>
              <View style={[styles.customerBadgeAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.customerBadgeAvatarText}>
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customerBadgeName, { color: colors.foreground }]}>
                  {selectedCustomer.name}
                </Text>
                {selectedCustomer.totalDebt > 0 && (
                  <Text style={[styles.customerBadgeDebt, { color: "#D97706" }]}>
                    Joriy qarz: {selectedCustomer.totalDebt.toLocaleString()} UZS
                    {selectedCustomer.debtLimit > 0 ? ` / Limit: ${selectedCustomer.debtLimit.toLocaleString()} UZS` : ""}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedCustomer(null)}
                disabled={checkingOut}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}

          {/* Customer picker (shown only for debt when no customer selected) */}
          {paymentType === "debt" && !selectedCustomer && (
            <TouchableOpacity
              style={[styles.customerPickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { setCustomerSearch(""); setCustomerPickerOpen(true); }}
              activeOpacity={0.8}
              disabled={checkingOut}
            >
              <MaterialIcons name="person-search" size={18} color={colors.mutedForeground} />
              <Text style={[styles.customerPickText, { color: colors.mutedForeground }]}>
                Mijoz tanlang...
              </Text>
            </TouchableOpacity>
          )}

          {/* Change customer button for cash/card (optional, shown when no customer) */}
          {paymentType !== "debt" && !selectedCustomer && (
            <TouchableOpacity
              style={[styles.customerPickBtnOptional, { borderColor: colors.border }]}
              onPress={() => { setCustomerSearch(""); setCustomerPickerOpen(true); }}
              activeOpacity={0.8}
              disabled={checkingOut}
            >
              <MaterialIcons name="person-add" size={15} color={colors.mutedForeground} />
              <Text style={[styles.customerPickOptionalText, { color: colors.mutedForeground }]}>
                Mijoz biriktirish (ixtiyoriy)
              </Text>
            </TouchableOpacity>
          )}

          {/* Debt partial payment section */}
          {paymentType === "debt" && (
            <View style={[styles.debtSection, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <View style={styles.partialPayRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partialPayLabel}>Hozir to'lanadigan summa (ixtiyoriy)</Text>
                  <TextInput
                    style={[styles.partialPayInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="0 — to'liq qarzga yoziladi"
                    placeholderTextColor={colors.mutedForeground}
                    value={partialPayment}
                    onChangeText={setPartialPayment}
                    keyboardType="numeric"
                    editable={!checkingOut}
                  />
                </View>
              </View>
              {partialPayment !== "" && !isNaN(parseFloat(partialPayment)) && (
                <View style={styles.debtPreviewRow}>
                  <Text style={styles.debtPreviewLabel}>Qarzga yoziladigan summa:</Text>
                  <Text style={styles.debtPreviewVal}>
                    {Math.max(0, total - (parseFloat(partialPayment.replace(/\s/g, "")) || 0)).toLocaleString()} UZS
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Cart summary */}
          <View style={[styles.confirmSummaryBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            {cartItems.map((item) => (
              <View key={item.product.id} style={styles.confirmItemRow}>
                <Text style={[styles.confirmItemName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.product.name}
                </Text>
                <Text style={[styles.confirmItemQty, { color: colors.mutedForeground }]}>
                  {item.quantity} × {item.product.salePrice.toLocaleString()}
                </Text>
                <Text style={[styles.confirmItemTotal, { color: colors.primary }]}>
                  {(item.product.salePrice * item.quantity).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          {/* Total */}
          <View style={[styles.confirmTotalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.confirmTotalLabel, { color: colors.mutedForeground }]}>
              Jami ({totalItems} dona):
            </Text>
            <Text style={[styles.confirmTotalVal, { color: colors.foreground }]}>
              {formatMoney(total)}
            </Text>
          </View>

          {/* Error banner */}
          {saleError && (
            <View style={[styles.errorBanner, { backgroundColor: "#FEE2E2", borderColor: "#F87171" }]}>
              <MaterialIcons name="error-outline" size={16} color="#DC2626" />
              <Text style={styles.errorBannerText}>{saleError}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.confirmBtns}>
            <TouchableOpacity
              style={[styles.confirmCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => { setConfirmOpen(false); setSaleError(null); }}
              disabled={checkingOut}
              activeOpacity={0.8}
            >
              <Text style={[styles.confirmCancelText, { color: colors.mutedForeground }]}>
                Bekor qilish
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmSellBtn, { backgroundColor: checkingOut ? colors.mutedForeground : colors.success }]}
              onPress={handleConfirmSale}
              disabled={checkingOut}
              activeOpacity={0.85}
            >
              {checkingOut ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.confirmSellText}>Sotish</Text>
                </>
              )}
            </TouchableOpacity>
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
            <MaterialIcons name="check-circle" size={60} color={colors.success} />
            <Text style={[styles.successTitle, { color: colors.foreground }]}>
              Sotuv amalga oshdi!
            </Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
              Ombor yangilandi
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Customer picker modal */}
      <Modal
        visible={customerPickerOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setCustomerPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.confirmBackdrop}
          activeOpacity={1}
          onPress={() => setCustomerPickerOpen(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        >
          <View style={[styles.confirmSheet, { backgroundColor: colors.card, maxHeight: "80%" }]}>
            <View style={[styles.confirmHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.confirmHeader, { marginBottom: 12 }]}>
              <MaterialIcons name="people" size={24} color={colors.primary} />
              <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Mijoz tanlang</Text>
            </View>

            {/* Search */}
            <View style={[styles.pickerSearch, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <MaterialIcons name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.pickerSearchInput, { color: colors.foreground }]}
                placeholder="Ism yoki telefon..."
                placeholderTextColor={colors.mutedForeground}
                value={customerSearch}
                onChangeText={setCustomerSearch}
                autoFocus
              />
              {customerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCustomerSearch("")}>
                  <MaterialIcons name="clear" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {customersLoading && (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
            <ScrollView style={{ marginTop: 10 }} showsVerticalScrollIndicator={false}>
              {(customers ?? [])
                .filter((c) => {
                  const q = customerSearch.toLowerCase();
                  return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
                })
                .map((c) => {
                  const isOver = c.debtLimit > 0 && c.totalDebt >= c.debtLimit;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.pickerItem,
                        {
                          backgroundColor: colors.background,
                          borderColor: isOver ? "#FECACA" : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedCustomer(c);
                        setCustomerPickerOpen(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.pickerAvatar, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.pickerAvatarText, { color: colors.primary }]}>
                          {c.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerName, { color: colors.foreground }]}>{c.name}</Text>
                        <Text style={[styles.pickerPhone, { color: colors.mutedForeground }]}>{c.phone}</Text>
                      </View>
                      {c.totalDebt > 0 && (
                        <View>
                          <Text style={[styles.pickerDebt, { color: isOver ? "#DC2626" : "#D97706" }]}>
                            {c.totalDebt.toLocaleString()} UZS
                          </Text>
                          {isOver && (
                            <Text style={styles.pickerOver}>LIMIT!</Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              {(customers ?? []).length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 30 }}>
                  <MaterialIcons name="people" size={40} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 8 }}>
                    Hali mijoz yo'q
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.topTab,
            tab === "cart" && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
          ]}
          onPress={() => setTab("cart")}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="shopping-cart"
            size={18}
            color={tab === "cart" ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.topTabLabel,
              { color: tab === "cart" ? colors.primary : colors.mutedForeground },
            ]}
          >
            Savat{cartItems.length > 0 ? ` (${cartItems.length})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.topTab,
            tab === "products" && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
          ]}
          onPress={() => setTab("products")}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="inventory-2"
            size={18}
            color={tab === "products" ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.topTabLabel,
              { color: tab === "products" ? colors.primary : colors.mutedForeground },
            ]}
          >
            Mahsulotlar
          </Text>
        </TouchableOpacity>

        {/* Scanner button — always active */}
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setScannerOpen(true)}
          activeOpacity={0.82}
        >
          <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
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
                Mahsulotlar bo'limidan yoki barkod orqali qo'shing
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
                  onPress={() => setScannerOpen(true)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="qr-code-scanner" size={18} color={colors.primary} />
                  <Text style={[styles.emptyBtnOutlineText, { color: colors.primary }]}>
                    Barkod skaner
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <FlatList
                data={cartItems}
                keyExtractor={(item) => String(item.product.id)}
                contentContainerStyle={{ padding: 14, paddingBottom: 200 }}
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
                    {
                      backgroundColor: checkingOut
                        ? colors.mutedForeground
                        : colors.success,
                    },
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
                      <Text style={styles.checkoutBtnText}>
                        Sotish — {formatMoney(total)}
                      </Text>
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
          <View style={styles.searchWrap}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.card,
                  borderColor: search ? colors.primary : colors.border,
                },
              ]}
            >
              <MaterialIcons name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: colors.foreground, fontFamily: "Inter_400Regular" },
                ]}
                placeholder="Nom, brend, barcode, ID..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
                  <MaterialIcons name="close" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <WebRefreshBar refreshing={productsRefetching} onRefresh={refetchProducts} />
          {productsLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(p) => String(p.id)}
              contentContainerStyle={{
                padding: 14,
                paddingBottom: insets.bottom + 80,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={productsRefetching}
                  onRefresh={refetchProducts}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
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
                        <View
                          style={[
                            styles.idChip,
                            { backgroundColor: colors.surfaceVariant },
                          ]}
                        >
                          <Text
                            style={[
                              styles.idChipText,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            #{p.id}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.productName,
                            {
                              color:
                                p.quantity === 0
                                  ? colors.mutedForeground
                                  : colors.foreground,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.productBrand,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {p.brand}
                      </Text>
                      {p.barcode ? (
                        <Text
                          style={[
                            styles.barcodeText,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {p.barcode}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.productCardRight}>
                      <Text style={[styles.productPrice, { color: colors.primary }]}>
                        {formatMoney(p.salePrice)}
                      </Text>
                      <View
                        style={[
                          styles.stockChip,
                          {
                            backgroundColor:
                              p.quantity === 0
                                ? colors.destructive
                                : p.quantity < 5
                                ? colors.warning
                                : colors.success,
                          },
                        ]}
                      >
                        <Text style={styles.stockText}>
                          {p.quantity === 0 ? "Tugagan" : `${p.quantity} dona`}
                        </Text>
                      </View>
                      {inCart ? (
                        <View
                          style={[
                            styles.inCartChip,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text style={styles.inCartText}>
                            Savat: {inCart.quantity}
                          </Text>
                        </View>
                      ) : p.quantity > 0 ? (
                        <View
                          style={[
                            styles.addChip,
                            { backgroundColor: colors.secondary },
                          ]}
                        >
                          <MaterialIcons
                            name="add"
                            size={14}
                            color={colors.primary}
                          />
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyProducts}>
                  <MaterialIcons name="search-off" size={40} color={colors.border} />
                  <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                    Mahsulot topilmadi
                  </Text>
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

// ─── Cart Card ───────────────────────────────────────────────────────────────
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
    <View style={[styles.cartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cartCardTop}>
        <View style={styles.cartCardInfo}>
          <View style={[styles.idChip, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.idChipText, { color: colors.mutedForeground }]}>
              #{item.product.id}
            </Text>
          </View>
          <View style={styles.cartNameBlock}>
            <Text style={[styles.cartName, { color: colors.foreground }]} numberOfLines={1}>
              {item.product.name}
            </Text>
            <Text style={[styles.cartBrand, { color: colors.mutedForeground }]}>
              {item.product.brand}
            </Text>
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
        <Text style={[styles.subtotal, { color: colors.primary }]}>
          {subtotal.toLocaleString()} UZS
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  // Scanner modal
  scannerRoot: { flex: 1, backgroundColor: "#000" },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 48 : 60,
    paddingBottom: 14,
    backgroundColor: "rgba(0,0,0,0.85)",
    zIndex: 10,
  },
  scannerCloseBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  scannerHeaderTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  cameraWrap: { flex: 1, position: "relative", backgroundColor: "#000" },
  overlayTop: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 90,
    backgroundColor: "rgba(0,0,0,0.62)",
    zIndex: 2,
  },
  overlayMiddleRow: {
    position: "absolute",
    top: 90,
    left: 0, right: 0,
    height: 220,
    flexDirection: "row",
    zIndex: 2,
  },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)" },
  overlayBottom: {
    position: "absolute",
    top: 310,
    left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.62)",
    zIndex: 2,
  },
  scanFrame: {
    width: 220,
    height: 220,
    position: "relative",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: "#2196F3",
    borderWidth: 3.5,
  },
  cTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 4 },
  cTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 4 },
  cBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 4 },
  cBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 4 },
  scanLine: {
    position: "absolute",
    left: 6,
    right: 6,
    height: 2.5,
    backgroundColor: "#2196F3",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  scannedBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scannedLabel: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  scanHint: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    zIndex: 10,
    paddingHorizontal: 20,
  },
  permWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
    backgroundColor: "#111",
  },
  permTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  permText: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  permBtn: {
    backgroundColor: "#1565C0",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  permBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  webCamWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A1A",
    gap: 12,
    paddingHorizontal: 32,
  },
  webCamTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 8 },
  webCamSub: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  manualWrap: {
    backgroundColor: "#111827",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 10,
  },
  manualLabel: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  manualRow: { flexDirection: "row", gap: 10 },
  manualInput: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  manualBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  manualHint: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 2,
  },
  topTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  topTabLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: "auto" as any,
    backgroundColor: "#1565C0",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: "#1565C0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  scanBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },

  // Empty states
  emptyCart: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 8 },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyActions: { flexDirection: "row", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "center" },
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
  emptyProducts: { paddingTop: 50, alignItems: "center", gap: 10 },

  // Cart card
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
  cartCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cartCardInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  cartNameBlock: { flex: 1 },
  cartName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  cartBrand: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  removeBtn: { padding: 4 },
  cartCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
  qtyText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    minWidth: 28,
    textAlign: "center",
  },
  subtotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    minWidth: 90,
    textAlign: "right",
  },

  // Checkout
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
  checkoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutLabel: { fontFamily: "Inter_400Regular", fontSize: 14 },
  checkoutTotal: { fontFamily: "Inter_700Bold", fontSize: 18 },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },

  // Product card
  productCard: {
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
  productCardLeft: { flex: 1 },
  productNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  idChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  idChipText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  productName: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  productBrand: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  barcodeText: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  productCardRight: {
    alignItems: "flex-end",
    gap: 5,
    paddingLeft: 8,
  },
  productPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  stockChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stockText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  inCartChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  inCartText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  addChip: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  // Search
  searchWrap: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  // Loader
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Success overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  successCard: {
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  successSub: { fontFamily: "Inter_400Regular", fontSize: 14 },

  // Confirmation bottom sheet
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  confirmSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  confirmHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  confirmHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  confirmTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  confirmSummaryBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
    maxHeight: 200,
  },
  confirmItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    gap: 8,
  },
  confirmItemName: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  confirmItemQty: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  confirmItemTotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    minWidth: 80,
    textAlign: "right",
  },
  confirmTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 16,
  },
  confirmTotalLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  confirmTotalVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#DC2626",
  },
  confirmBtns: {
    flexDirection: "row",
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  confirmSellBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmSellText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },

  // Payment type selector
  payTypeRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  payTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  payTypeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  // Debt section
  debtSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  customerPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  customerPickText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  customerDebtInfo: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#991B1B",
    paddingHorizontal: 4,
  },
  customerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  customerBadgeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  customerBadgeAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  customerBadgeName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  customerBadgeDebt: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  customerPickBtnOptional: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 9,
    marginBottom: 10,
  },
  customerPickOptionalText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  partialPayRow: {
    flexDirection: "row",
    gap: 8,
  },
  partialPayLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#991B1B",
    marginBottom: 6,
  },
  partialPayInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  debtPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  debtPreviewLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#991B1B",
  },
  debtPreviewVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#DC2626",
  },

  // Customer picker modal
  pickerSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerSearchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    padding: 0,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  pickerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  pickerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  pickerPhone: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  pickerDebt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textAlign: "right",
  },
  pickerOver: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#DC2626",
    textAlign: "right",
  },
});
