import {
  useCreateProduct,
  useGetProducts,
  useUpdateProduct,
  getGetProductsQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionLockScreen } from "@/components/SubscriptionLockScreen";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

// ─── Inline barcode scanner modal ──────────────────────────────────────────
function BarcodeScanModal({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [camError, setCamError] = useState(false);
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setScanned(false);
    setCamError(false);
    if (!permission?.granted) {
      requestPermission();
    }
  }, [visible]);

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

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      onScanned(data);
    }, 300);
  };

  // Works on both web (WebRTC) and native
  const showCamera = !camError && permission?.granted === true;
  const showDenied = !camError && permission?.granted === false;
  const showLoading = !camError && permission === null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={scanStyles.root}>
        {/* Header */}
        <View style={scanStyles.header}>
          <TouchableOpacity style={scanStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={scanStyles.headerTitle}>Barcode o'qish</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ flex: 1 }}>
          {/* Camera */}
          {showCamera && (
            <View style={scanStyles.cameraWrap}>
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
              {/* Overlay */}
              <View style={scanStyles.overlayTop} />
              <View style={scanStyles.overlayMiddle}>
                <View style={scanStyles.overlaySide} />
                <View style={scanStyles.frame}>
                  <View style={[scanStyles.corner, scanStyles.cTL]} />
                  <View style={[scanStyles.corner, scanStyles.cTR]} />
                  <View style={[scanStyles.corner, scanStyles.cBL]} />
                  <View style={[scanStyles.corner, scanStyles.cBR]} />
                  {!scanned ? (
                    <Animated.View
                      style={[
                        scanStyles.scanLine,
                        {
                          transform: [{
                            translateY: lineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 180],
                            }),
                          }],
                        },
                      ]}
                    />
                  ) : (
                    <View style={scanStyles.scannedBox}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={scanStyles.scannedText}>Saqlandi!</Text>
                    </View>
                  )}
                </View>
                <View style={scanStyles.overlaySide} />
              </View>
              <View style={scanStyles.overlayBottom} />
              <Text style={scanStyles.hint}>Barkodni ramka ichiga to'g'rilang</Text>
            </View>
          )}

          {/* Loading */}
          {showLoading && (
            <View style={scanStyles.center}>
              <ActivityIndicator size="large" color="#1565C0" />
              <Text style={[scanStyles.permSub, { marginTop: 12 }]}>Kamera ruxsati so'ralmoqda…</Text>
            </View>
          )}

          {/* Permission denied */}
          {showDenied && (
            <View style={scanStyles.center}>
              <MaterialIcons name="no-photography" size={56} color="#EF5350" />
              <Text style={scanStyles.permTitle}>Kamera ruxsati yo'q</Text>
              <Text style={scanStyles.permSub}>
                Brauzer yoki telefon sozlamalarida kamera ruxsatini bering
              </Text>
              <TouchableOpacity style={scanStyles.permBtn} onPress={() => requestPermission()} activeOpacity={0.85}>
                <Text style={scanStyles.permBtnText}>Ruxsat so'rash</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Camera error */}
          {camError && (
            <View style={scanStyles.center}>
              <MaterialIcons name="error-outline" size={56} color="#FF9800" />
              <Text style={scanStyles.permTitle}>Kamera ishlamadi</Text>
              <Text style={scanStyles.permSub}>Qo'lda barcode kiriting</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const scanStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingTop: 52, paddingBottom: 14,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  cameraWrap: { flex: 1, position: "relative" },
  overlayTop: { position: "absolute", top: 0, left: 0, right: 0, height: "20%", backgroundColor: "rgba(0,0,0,0.6)" },
  overlayMiddle: { position: "absolute", top: "20%", left: 0, right: 0, height: 220, flexDirection: "row" },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  frame: { width: 240, height: 220 },
  overlayBottom: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: -1 },
  corner: { position: "absolute", width: 24, height: 24, borderColor: "#1565C0", borderWidth: 3 },
  cTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanLine: { position: "absolute", left: 4, right: 4, height: 2, backgroundColor: "#1565C0", borderRadius: 1 },
  scannedBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  scannedText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  hint: {
    position: "absolute", bottom: "28%", left: 0, right: 0, textAlign: "center",
    color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  permTitle: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  permSub: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  permBtn: { backgroundColor: "#1565C0", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  permBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});

// ─── Product Form ───────────────────────────────────────────────────────────
type FieldKey = "name" | "brand" | "costPrice" | "salePrice" | "quantity";

type FormValues = {
  name: string;
  brand: string;
  costPrice: string;
  salePrice: string;
  quantity: string;
  barcode: string;
};

const INITIAL: FormValues = { name: "", brand: "", costPrice: "", salePrice: "", quantity: "", barcode: "" };

async function uploadProductImage(
  localUri: string,
  token: string | null,
): Promise<string> {
  // Keep the URI exactly as returned by ImagePicker — React Native's fetch handles
  // file:// and content:// URIs natively on both iOS and Android.
  // Do NOT strip file:// — doing so breaks the upload on iOS.
  const uri = localUri;

  const fileName = `product_${Date.now()}.jpg`;
  const mimeType = "image/jpeg";

  console.log("[ImageUpload] Platform:", Platform.OS);
  console.log("[ImageUpload] URI:", uri);
  console.log("[ImageUpload] API_BASE:", API_BASE || "(empty — EXPO_PUBLIC_DOMAIN not set!)");

  if (!API_BASE) {
    throw new Error("API_BASE is empty. EXPO_PUBLIC_DOMAIN env var is missing in the bundle.");
  }

  const formData = new FormData();
  // React Native FormData requires the { uri, name, type } shape (not a real Blob)
  formData.append("image", {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  // IMPORTANT: Do NOT set Content-Type manually when using FormData in React Native.
  // React Native's fetch automatically sets "multipart/form-data; boundary=..." which
  // includes the required boundary string. Setting it manually without boundary breaks parsing.
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("[ImageUpload] Token (first 20):", token.slice(0, 20) + "…");
  } else {
    console.warn("[ImageUpload] WARNING: No auth token — server will return 401");
  }

  const uploadUrl = `${API_BASE}/api/upload/product-image`;
  console.log("[ImageUpload] POST →", uploadUrl);

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch (networkErr) {
    console.error("[ImageUpload] Network error (device can't reach server):", networkErr);
    throw new Error(`Tarmoq xatosi: server ${uploadUrl} manziliga ulanib bo'lmadi. Wi-Fi/internet aloqasini tekshiring.`);
  }

  const responseText = await response.text();
  console.log("[ImageUpload] HTTP status:", response.status);
  console.log("[ImageUpload] Response body:", responseText);

  if (!response.ok) {
    throw new Error(`Server xatosi (${response.status}): ${responseText}`);
  }

  let data: { url: string };
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Server noto'g'ri javob qaytardi: ${responseText}`);
  }

  console.log("[ImageUpload] SUCCESS — url:", data.url);
  return data.url;
}

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  placeholder: string;
  keyboardType: "default" | "numeric";
  icon: keyof typeof MaterialIcons.glyphMap;
}> = [
  { key: "name", label: "Mahsulot nomi", placeholder: "Masalan: iPhone 15 Pro Max qopqoq", keyboardType: "default", icon: "label-outline" },
  { key: "brand", label: "Brend", placeholder: "Masalan: Apple, Samsung, Xiaomi", keyboardType: "default", icon: "store" },
  { key: "costPrice", label: "Tan narxi (UZS)", placeholder: "0", keyboardType: "numeric", icon: "account-balance-wallet" },
  { key: "salePrice", label: "Sotuv narxi (UZS)", placeholder: "0", keyboardType: "numeric", icon: "sell" },
  { key: "quantity", label: "Miqdori (dona)", placeholder: "0", keyboardType: "numeric", icon: "inventory" },
];

function ProductFormScreenInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = params.id ? parseInt(params.id) : null;
  const isEdit = productId !== null;
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const [form, setForm] = useState<FormValues>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormValues>>({});
  const [submitted, setSubmitted] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: products } = useGetProducts({ query: { enabled: isEdit } as any });

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? "Tahrirlash" : "Yangi mahsulot" });
  }, [navigation, isEdit]);

  useEffect(() => {
    if (isEdit && products) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setForm({
          name: product.name,
          brand: product.brand,
          costPrice: String(product.costPrice),
          salePrice: String(product.salePrice),
          quantity: String(product.quantity),
          barcode: product.barcode ?? "",
        });
        setImageUrl(product.imageUrl ?? null);
      }
    }
  }, [isEdit, products, productId]);

  const pickImage = async (source: "camera" | "gallery") => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === "camera") {
        console.log("[ImagePicker] Requesting camera permission…");
        const pickerPerm = await ImagePicker.requestCameraPermissionsAsync();
        console.log("[ImagePicker] Camera permission status:", pickerPerm.status);

        if (pickerPerm.status !== "granted") {
          Alert.alert(
            "Kamera ruxsati yo'q",
            "Sozlamalar → Ilovalar → SMARTBOSScontrol → Ruxsatlar bo'limida kamera ruxsatini yoqing.",
            [{ text: "OK" }]
          );
          return;
        }

        console.log("[ImagePicker] Launching camera…");
        try {
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            quality: 0.7,
            allowsEditing: true,
            aspect: [1, 1],
            exif: false,
          });
          console.log("[ImagePicker] Camera result — canceled:", result.canceled, "assets:", result.assets?.length);
        } catch (camErr) {
          console.error("[ImagePicker] launchCameraAsync error:", camErr);
          Alert.alert(
            "Kamera mavjud emas",
            "Qurilmangizda kamera ishlamadi. Galereya orqali rasm tanlaysizmi?",
            [
              { text: "Galereya", onPress: () => pickImage("gallery") },
              { text: "Bekor qilish", style: "cancel" },
            ]
          );
          return;
        }
      } else {
        console.log("[ImagePicker] Requesting media library permission…");
        const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log("[ImagePicker] Media library permission status:", libraryPerm.status);

        if (libraryPerm.status !== "granted") {
          Alert.alert(
            "Galereya ruxsati yo'q",
            "Sozlamalar → Ilovalar → SMARTBOSScontrol → Ruxsatlar bo'limida galereya ruxsatini yoqing.",
            [{ text: "OK" }]
          );
          return;
        }

        console.log("[ImagePicker] Launching image library…");
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 0.7,
          allowsEditing: true,
          aspect: [1, 1],
          exif: false,
        });
        console.log("[ImagePicker] Library result — canceled:", result.canceled, "assets:", result.assets?.length);
      }

      if (result.canceled || !result.assets?.[0]?.uri) {
        console.log("[ImagePicker] Picker was canceled or no asset returned.");
        return;
      }

      const uri = result.assets[0].uri;
      console.log("[ImagePicker] Selected uri:", uri);

      setImageUploading(true);
      try {
        const url = await uploadProductImage(uri, token);
        setImageUrl(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (uploadErr) {
        const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
        console.error("[ImagePicker] Upload error:", msg);
        Alert.alert("Yuklash xatosi", msg || "Rasm serverga yuklanmadi. Qayta urinib ko'ring.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setImageUploading(false);
      }
    } catch (err) {
      console.error("[ImagePicker] Unexpected error:", err);
      Alert.alert("Xato", "Rasm tanlashda muammo yuz berdi. Qayta urinib ko'ring.");
    }
  };

  const showImagePicker = () => {
    if (Platform.OS === "web") {
      // On web, only gallery works reliably
      pickImage("gallery");
      return;
    }
    Alert.alert(
      "Rasm qo'shish",
      "Qayerdan olasiz?",
      [
        { text: "📷  Kamera", onPress: () => pickImage("camera") },
        { text: "🖼️  Galereya", onPress: () => pickImage("gallery") },
        { text: "Bekor qilish", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const { mutate: createProduct, isPending: creating } = useCreateProduct({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setSubmitted(true);
        setTimeout(() => router.back(), 200);
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  const { mutate: updateProduct, isPending: updating } = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        router.back();
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  const isPending = creating || updating || imageUploading;

  const validate = (): boolean => {
    const newErrors: Partial<FormValues> = {};
    if (!form.name.trim()) newErrors.name = "Nomi kiritilishi shart";
    if (!form.brand.trim()) newErrors.brand = "Brendi kiritilishi shart";
    const cost = parseFloat(form.costPrice);
    const sale = parseFloat(form.salePrice);
    const qty = parseInt(form.quantity);
    if (!form.costPrice || isNaN(cost) || cost < 0) newErrors.costPrice = "To'g'ri narx kiriting";
    if (!form.salePrice || isNaN(sale) || sale < 0) newErrors.salePrice = "To'g'ri narx kiriting";
    if (!form.quantity || isNaN(qty) || qty < 0) newErrors.quantity = "To'g'ri son kiriting";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      costPrice: parseFloat(form.costPrice),
      salePrice: parseFloat(form.salePrice),
      quantity: parseInt(form.quantity),
      barcode: form.barcode.trim() || null,
      imageUrl: imageUrl || null,
    };
    if (isEdit && productId) {
      updateProduct({ id: productId, data: payload });
    } else {
      createProduct({ data: payload });
    }
  };

  const setField = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleBarcodeScanned = (code: string) => {
    setScannerOpen(false);
    setForm((prev) => ({ ...prev, barcode: code }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const cost = parseFloat(form.costPrice) || 0;
  const sale = parseFloat(form.salePrice) || 0;
  const qty = parseInt(form.quantity) || 0;
  const profit = sale - cost;
  const profitPct = cost > 0 ? ((profit / cost) * 100).toFixed(1) : null;
  const showProfit = form.costPrice && form.salePrice;

  return (
    <>
      <BarcodeScanModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleBarcodeScanned}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 40, paddingTop: isWeb ? 24 : 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isEdit && productId && (
            <View style={[styles.idRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <MaterialIcons name="tag" size={15} color={colors.mutedForeground} />
              <Text style={[styles.idLabel, { color: colors.mutedForeground }]}>
                Unikal ID: <Text style={[styles.idValue, { color: colors.primary }]}>#{productId}</Text>
              </Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Regular fields */}
            {FIELDS.map((field) => (
              <View key={field.key} style={styles.fieldWrap}>
                <View style={styles.labelRow}>
                  <MaterialIcons name={field.icon} size={14} color={colors.primary} />
                  <Text style={[styles.label, { color: colors.foreground }]}>{field.label}</Text>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: errors[field.key] ? colors.destructive : colors.border,
                      color: colors.foreground,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                  value={form[field.key]}
                  onChangeText={(v) => setField(field.key, v)}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType={field.keyboardType}
                  autoCapitalize={field.keyboardType === "default" ? "words" : "none"}
                  returnKeyType="next"
                />
                {errors[field.key] ? (
                  <View style={styles.errorRow}>
                    <MaterialIcons name="error-outline" size={12} color={colors.destructive} />
                    <Text style={[styles.errorText, { color: colors.destructive }]}>{errors[field.key]}</Text>
                  </View>
                ) : null}
              </View>
            ))}

            {/* Barcode field */}
            <View style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <MaterialIcons name="qr-code" size={14} color={colors.primary} />
                <Text style={[styles.label, { color: colors.foreground }]}>Barcode</Text>
                <Text style={[styles.optionalTag, { color: colors.mutedForeground, borderColor: colors.border }]}>
                  ixtiyoriy
                </Text>
              </View>
              <View style={styles.barcodeRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.barcodeInput,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: form.barcode ? colors.primary : colors.border,
                      color: colors.foreground,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                  value={form.barcode}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, barcode: v }))}
                  placeholder="Masalan: 4607123456789"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {form.barcode.length > 0 && (
                  <TouchableOpacity
                    style={[styles.barcodeClearBtn, { borderColor: colors.border }]}
                    onPress={() => setForm((prev) => ({ ...prev, barcode: "" }))}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.barcodeScanBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setScannerOpen(true)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              {form.barcode.length > 0 && (
                <View style={[styles.barcodePreview, { backgroundColor: colors.surfaceVariant, borderColor: colors.primary + "33" }]}>
                  <MaterialIcons name="check-circle" size={14} color={colors.success} />
                  <Text style={[styles.barcodePreviewText, { color: colors.success }]}>
                    Barcode: {form.barcode}
                  </Text>
                </View>
              )}
              <Text style={[styles.barcodeHint, { color: colors.mutedForeground }]}>
                📷 Skaner tugmasini bosib kamera orqali o'qing yoki qo'lda kiriting
              </Text>
            </View>

            {/* Image field */}
            <View style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <MaterialIcons name="image" size={14} color={colors.primary} />
                <Text style={[styles.label, { color: colors.foreground }]}>Mahsulot rasmi</Text>
                <Text style={[styles.optionalTag, { color: colors.mutedForeground, borderColor: colors.border }]}>
                  ixtiyoriy
                </Text>
              </View>

              {imageUrl ? (
                <View style={styles.imagePreviewWrap}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <View style={styles.imageActions}>
                    <TouchableOpacity
                      style={[styles.imageActionBtn, { backgroundColor: colors.primary }]}
                      onPress={showImagePicker}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons name="edit" size={16} color="#fff" />
                      <Text style={styles.imageActionText}>Almashtirish</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imageActionBtn, { backgroundColor: "#EF5350" }]}
                      onPress={() => setImageUrl(null)}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons name="delete" size={16} color="#fff" />
                      <Text style={styles.imageActionText}>O'chirish</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.imagePickerBtn,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={showImagePicker}
                  activeOpacity={0.8}
                  disabled={imageUploading}
                >
                  {imageUploading ? (
                    <View style={styles.imagePickerInner}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>
                        Yuklanmoqda...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.imagePickerInner}>
                      <MaterialIcons name="add-photo-alternate" size={32} color={colors.primary} />
                      <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>
                        Kamera yoki galereya
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {imageUploading && imageUrl === null && null}
            </View>
          </View>

          {showProfit && (
            <View
              style={[
                styles.profitCard,
                {
                  backgroundColor: profit >= 0 ? "#E8F5E9" : "#FFEBEE",
                  borderColor: profit >= 0 ? "#4CAF50" : "#F44336",
                },
              ]}
            >
              <View style={styles.profitRow}>
                <MaterialIcons
                  name={profit >= 0 ? "trending-up" : "trending-down"}
                  size={20}
                  color={profit >= 0 ? "#2E7D32" : "#C62828"}
                />
                <Text style={[styles.profitLabel, { color: profit >= 0 ? "#2E7D32" : "#C62828" }]}>
                  {profit >= 0 ? "Foyda" : "Zarar"}
                </Text>
              </View>
              <View style={styles.profitVals}>
                <Text style={[styles.profitVal, { color: profit >= 0 ? "#1B5E20" : "#B71C1C" }]}>
                  {profit >= 0 ? "+" : ""}{profit.toLocaleString()} UZS
                </Text>
                {profitPct && (
                  <Text style={[styles.profitPct, { color: profit >= 0 ? "#2E7D32" : "#C62828" }]}>
                    ({profitPct}%)
                  </Text>
                )}
              </View>
              {qty > 0 && (
                <Text style={[styles.profitTotal, { color: profit >= 0 ? "#388E3C" : "#C62828" }]}>
                  {qty} dona × {profit >= 0 ? "+" : ""}{profit.toLocaleString()} = {(profit * qty).toLocaleString()} UZS jami
                </Text>
              )}
              {form.quantity && parseInt(form.quantity) < 5 && parseInt(form.quantity) >= 0 && (
                <View style={styles.lowWarn}>
                  <MaterialIcons name="warning" size={13} color="#E65100" />
                  <Text style={[styles.lowWarnText, { color: "#E65100" }]}>
                    Diqqat: {parseInt(form.quantity)} dona — stok kam!
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: isPending || submitted ? colors.mutedForeground : colors.primary },
            ]}
            onPress={handleSubmit}
            disabled={isPending || submitted}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : submitted ? (
              <MaterialIcons name="check-circle" size={22} color="#fff" />
            ) : (
              <>
                <MaterialIcons name={isEdit ? "save" : "add-circle"} size={20} color="#fff" />
                <Text style={styles.submitText}>{isEdit ? "Saqlash" : "Qo'shish"}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Bekor qilish</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16 },
  idRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14,
  },
  idLabel: { fontFamily: "Inter_400Regular", fontSize: 13 },
  idValue: { fontFamily: "Inter_700Bold", fontSize: 13 },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1, gap: 4,
  },
  fieldWrap: { marginBottom: 12 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13 },
  optionalTag: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1, marginLeft: 4,
  },
  input: {
    borderWidth: 1, borderRadius: 11,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12 },

  // Barcode
  barcodeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barcodeInput: { flex: 1 },
  barcodeClearBtn: {
    width: 44, height: 44, borderRadius: 11, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  barcodeScanBtn: {
    width: 52, height: 44, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#1565C0", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  barcodePreview: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, marginTop: 6,
  },
  barcodePreviewText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  barcodeHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 5, lineHeight: 16 },

  imagePickerBtn: {
    borderWidth: 1.5, borderRadius: 12, borderStyle: "dashed",
    paddingVertical: 20, alignItems: "center", justifyContent: "center",
  },
  imagePickerInner: { alignItems: "center", gap: 8 },
  imagePickerText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  imagePreviewWrap: { gap: 10 },
  imagePreview: {
    width: "100%", height: 180, borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  imageActions: { flexDirection: "row", gap: 10 },
  imageActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 10, paddingVertical: 10,
  },
  imageActionText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },

  profitCard: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginTop: 14, gap: 6 },
  profitRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profitLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  profitVals: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  profitVal: { fontFamily: "Inter_700Bold", fontSize: 20 },
  profitPct: { fontFamily: "Inter_400Regular", fontSize: 13 },
  profitTotal: { fontFamily: "Inter_500Medium", fontSize: 12 },
  lowWarn: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  lowWarnText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 20,
    shadowColor: "#1565C0", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  cancelBtn: {
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center", justifyContent: "center",
    marginTop: 10, borderWidth: 1,
  },
  cancelText: { fontFamily: "Inter_500Medium", fontSize: 14 },
});

export default function ProductFormScreen() {
  const { subscriptionActive } = useAuth();
  if (!subscriptionActive) return <SubscriptionLockScreen screenName="Mahsulot qo'shish" />;
  return <ProductFormScreenInner />;
}
