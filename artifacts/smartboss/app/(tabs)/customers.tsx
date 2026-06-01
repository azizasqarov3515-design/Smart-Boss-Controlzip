import {
  useGetCustomers,
  useCreateCustomer,
  useDeleteCustomer,
  getGetCustomersQueryKey,
  getGetDashboardStatsQueryKey,
  type Customer,
  type CreateCustomer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { WebRefreshBar } from "@/components/WebRefreshBar";
import { SubscriptionLockScreen } from "@/components/SubscriptionLockScreen";
import { useAuth } from "@/contexts/AuthContext";

function formatMoney(n: number) {
  return n.toLocaleString("uz-UZ") + " UZS";
}

function formatCustomerPhone(text: string): string {
  if (text.length < 4) {
    return "998 ";
  }

  const mainDigits = text.slice(4).replace(/\D/g, "");
  const code = mainDigits.slice(0, 2);
  const part1 = mainDigits.slice(2, 5);
  const part2 = mainDigits.slice(5, 7);
  const part3 = mainDigits.slice(7, 9);
  
  let formatted = "998 ";
  if (code.length > 0) {
    formatted += code;
  }
  if (part1.length > 0) {
    formatted += " " + part1;
  }
  if (part2.length > 0) {
    formatted += " " + part2;
  }
  if (part3.length > 0) {
    formatted += " " + part3;
  }
  
  return formatted;
}

function getDebtStatus(customer: Customer): "ok" | "warning" | "over" {
  if (customer.totalDebt === 0) return "ok";
  if (customer.debtLimit <= 0) return customer.totalDebt > 0 ? "warning" : "ok";
  if (customer.totalDebt >= customer.debtLimit) return "over";
  if (customer.totalDebt >= customer.debtLimit * 0.8) return "warning";
  return customer.totalDebt > 0 ? "warning" : "ok";
}

function CustomerCard({
  customer,
  colors,
  onPress,
}: {
  customer: Customer;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onPress: () => void;
}) {
  const status = getDebtStatus(customer);
  const statusColor = status === "over" ? "#DC2626" : status === "warning" ? "#D97706" : colors.success;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[
        styles.instagramAvatarWrap,
        {
          borderColor: customer.imageUrl ? colors.primary : "transparent",
          borderWidth: customer.imageUrl ? 1.5 : 0
        }
      ]}>
        <View style={[
          styles.cardAvatar,
          {
            backgroundColor: colors.primary + "18",
            width: customer.imageUrl ? 40 : 44,
            height: customer.imageUrl ? 40 : 44,
            borderRadius: customer.imageUrl ? 20 : 22
          }
        ]}>
          {customer.imageUrl ? (
            <Image source={{ uri: customer.imageUrl }} style={[styles.instagramAvatar, { borderRadius: 20 }]} />
          ) : (
            <Text style={[styles.cardAvatarText, { color: colors.primary }]}>
              {customer.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.cardForeground }]} numberOfLines={1}>
          {customer.name}
        </Text>
        <View style={styles.cardPhoneRow}>
          <MaterialIcons name="phone" size={13} color={colors.mutedForeground} />
          <Text style={[styles.cardPhone, { color: colors.mutedForeground }]}>{customer.phone}</Text>
        </View>
        {customer.address ? (
          <View style={styles.cardPhoneRow}>
            <MaterialIcons name="location-on" size={13} color={colors.mutedForeground} />
            <Text style={[styles.cardPhone, { color: colors.mutedForeground }]} numberOfLines={1}>
              {customer.address}
            </Text>
          </View>
        ) : null}
        {customer.note ? (
          <Text style={[styles.cardNote, { color: colors.mutedForeground }]} numberOfLines={1}>
            {customer.note}
          </Text>
        ) : null}
      </View>

      <View style={styles.cardDebt}>
        {customer.totalDebt > 0 ? (
          <>
            <View style={[styles.debtBadge, { backgroundColor: statusColor + "18" }]}>
              <MaterialIcons
                name={status === "over" ? "warning" : "account-balance-wallet"}
                size={13}
                color={statusColor}
              />
              <Text style={[styles.debtBadgeText, { color: statusColor }]}>
                {status === "over" ? "LIMIT!" : "Qarz"}
              </Text>
            </View>
            <Text style={[styles.debtAmount, { color: statusColor }]}>
              {formatMoney(customer.totalDebt)}
            </Text>
            {customer.debtLimit > 0 && (
              <Text style={[styles.debtLimit, { color: colors.mutedForeground }]}>
                / {formatMoney(customer.debtLimit)}
              </Text>
            )}
          </>
        ) : (
          <View style={[styles.debtBadge, { backgroundColor: colors.success + "18" }]}>
            <MaterialIcons name="check-circle" size={13} color={colors.success} />
            <Text style={[styles.debtBadgeText, { color: colors.success }]}>Qarz yo'q</Text>
          </View>
        )}
        <MaterialIcons name="chevron-right" size={18} color={colors.mutedForeground} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

function CustomersScreenInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("998 ");
  const [formAddress, setFormAddress] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: customers, isLoading, refetch, isRefetching } = useGetCustomers();
  const { token } = useAuth();

  const { mutate: createCustomer, isPending: creating } = useCreateCustomer({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setAddOpen(false);
        resetForm();
      },
      onError: (err: Error) => {
        setFormError(err.message || "Mijoz yaratishda xatolik");
      },
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormPhone("998 ");
    setFormAddress("");
    setFormLimit("");
    setFormNote("");
    setFormImage(null);
    setFormError(null);
  };

  const pickImage = async (source: "camera" | "gallery") => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === "camera") {
        const pickerPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (pickerPerm.status !== "granted") {
          Alert.alert(
            "Kamera ruxsati yo'q",
            "Sozlamalar → Ilovalar → SMARTBOSScontrol → Ruxsatlar bo'limida kamera ruxsatini yoqing.",
            [{ text: "OK" }]
          );
          return;
        }

        try {
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            quality: 0.7,
            allowsEditing: true,
            aspect: [1, 1],
            exif: false,
          });
        } catch (camErr) {
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
        const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libraryPerm.status !== "granted") {
          Alert.alert(
            "Galereya ruxsati yo'q",
            "Sozlamalar → Ilovalar → SMARTBOSScontrol → Ruxsatlar bo'limida galereya ruxsatini yoqing.",
            [{ text: "OK" }]
          );
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 0.7,
          allowsEditing: true,
          aspect: [1, 1],
          exif: false,
        });
      }

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const rawUri = result.assets[0].uri;
      setImageUploading(true);
      setFormError(null);

      try {
        const compressed = await manipulateAsync(
          rawUri,
          [{ resize: { width: 500 } }],
          { compress: 0.65, format: SaveFormat.JPEG }
        );
        const uri = compressed.uri;

        const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
          ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
          : "";

        if (!API_BASE) {
          throw new Error("API_BASE is empty. EXPO_PUBLIC_DOMAIN env var is missing.");
        }

        const formData = new FormData();
        formData.append("image", {
          uri,
          name: `customer_${Date.now()}.jpg`,
          type: "image/jpeg",
        } as unknown as Blob);

        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const uploadUrl = `${API_BASE}/api/upload/product-image`;
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers,
          body: formData,
        });

        const responseText = await uploadRes.text();
        if (!uploadRes.ok) {
          throw new Error(`Server xatosi: ${responseText}`);
        }

        const data = JSON.parse(responseText);
        setFormImage(data.url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (uploadErr) {
        const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
        setFormError(`Rasm yuklashda xatolik: ${msg}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setImageUploading(false);
      }
    } catch (err) {
      Alert.alert("Xato", "Rasm tanlashda muammo yuz berdi.");
    }
  };

  const showImagePicker = () => {
    if (Platform.OS === "web") {
      pickImage("gallery");
      return;
    }
    Alert.alert(
      "Mijoz rasmi",
      "Rasm olish manbasini tanlang",
      [
        { text: "📷 Kamera orqali", onPress: () => pickImage("camera") },
        { text: "🖼️ Galereyadan", onPress: () => pickImage("gallery") },
        { text: "Bekor qilish", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const handleAdd = () => {
    setFormError(null);
    if (!formName.trim()) { setFormError("Ism kiritilishi shart"); return; }
    if (!formPhone.trim()) { setFormError("Telefon kiritilishi shart"); return; }
    const cleanPhone = formPhone.replace(/\s/g, "");
    if (cleanPhone.length !== 12 || !cleanPhone.startsWith("998")) {
      setFormError("Telefon raqami noto'g'ri (998xx xxx xx xx shaklida bo'lishi shart)");
      return;
    }
    const limit = formLimit ? parseFloat(formLimit.replace(/\s/g, "")) : 0;
    const body: CreateCustomer = {
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim() || undefined,
      debtLimit: isNaN(limit) ? 0 : limit,
      note: formNote.trim() || undefined,
      imageUrl: formImage || undefined,
    } as any;
    createCustomer({ data: body });
  };

  const filtered = useCallback(() => {
    if (!customers) return [];
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.note ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalDebt = (customers ?? []).reduce((s, c) => s + c.totalDebt, 0);
  const debtorsCount = (customers ?? []).filter((c) => c.totalDebt > 0).length;

  const list = filtered();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebRefreshBar refreshing={isRefetching} onRefresh={refetch} />
      {/* Stats row */}
      {(customers?.length ?? 0) > 0 && (
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.cardForeground }]}>{customers?.length ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Jami mijozlar</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: debtorsCount > 0 ? "#D97706" : colors.cardForeground }]}>
              {debtorsCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Qarzdorlar</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: totalDebt > 0 ? "#DC2626" : colors.cardForeground }]}>
              {formatMoney(totalDebt)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Jami qarz</Text>
          </View>
        </View>
      )}

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: search ? colors.primary : colors.border }]}>
          <MaterialIcons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.cardForeground }]}
            placeholder="Ism yoki telefon bo'yicha..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialIcons name="clear" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => { resetForm(); setAddOpen(true); }}
          activeOpacity={0.85}
        >
          <MaterialIcons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </ScrollView>
      ) : list.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          <MaterialIcons name="people" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {search ? "Topilmadi" : "Mijozlar yo'q"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {search ? "Boshqa so'z kiriting" : "+ tugmasi bilan mijoz qo'shing"}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 80 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              colors={colors}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/customer-detail", params: { id: item.id } });
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Add customer modal */}
      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => !creating && setAddOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => !creating && setAddOpen(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={styles.modalSheetWrap}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <View style={styles.modalHeader}>
              <MaterialIcons name="person-add" size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.cardForeground }]}>Yangi mijoz</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 220 }}>
              {/* Profile Image Picker */}
              <View style={styles.photoPickerWrap}>
                <TouchableOpacity
                  style={[styles.photoPicker, { borderColor: colors.primary }]}
                  onPress={showImagePicker}
                  activeOpacity={0.8}
                  disabled={imageUploading}
                >
                  {formImage ? (
                    <Image source={{ uri: formImage }} style={styles.photoPickerImage} />
                  ) : (
                    <View style={[styles.photoPickerPlaceholder, { backgroundColor: colors.muted }]}>
                      {imageUploading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <MaterialIcons name="photo-camera" size={26} color={colors.primary} />
                          <Text style={[styles.photoPickerText, { color: colors.mutedForeground }]}>
                            Rasmga olish
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                  {formImage && !imageUploading && (
                    <TouchableOpacity
                      style={[styles.removePhotoBtn, { backgroundColor: colors.destructive }]}
                      onPress={() => setFormImage(null)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>To'liq ism *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.cardForeground }]}
                placeholder="Ism va familiya"
                placeholderTextColor={colors.mutedForeground}
                value={formName}
                onChangeText={setFormName}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Telefon raqami *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.cardForeground }]}
                placeholder="998xx xxx xx xx"
                placeholderTextColor={colors.mutedForeground}
                value={formPhone}
                onChangeText={(v) => setFormPhone(formatCustomerPhone(v))}
                maxLength={16}
                keyboardType="phone-pad"
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Yashash joyi</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.cardForeground }]}
                placeholder="Shahar, ko'cha, uy"
                placeholderTextColor={colors.mutedForeground}
                value={formAddress}
                onChangeText={setFormAddress}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Qarz limiti (UZS)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.cardForeground }]}
                placeholder="0 = cheksiz"
                placeholderTextColor={colors.mutedForeground}
                value={formLimit}
                onChangeText={setFormLimit}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Izoh</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.cardForeground }]}
                placeholder="Ixtiyoriy"
                placeholderTextColor={colors.mutedForeground}
                value={formNote}
                onChangeText={setFormNote}
              />

              {formError && (
                <View style={[styles.formError, { backgroundColor: "#FEE2E2", borderColor: "#F87171" }]}>
                  <MaterialIcons name="error-outline" size={15} color="#DC2626" />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              )}

              <View style={styles.formBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  onPress={() => { setAddOpen(false); resetForm(); }}
                  disabled={creating}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Bekor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: creating ? colors.mutedForeground : colors.primary }]}
                  onPress={handleAdd}
                  disabled={creating}
                  activeOpacity={0.85}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Saqlash</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 16 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    padding: 0,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardAvatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: { fontFamily: "Inter_700Bold", fontSize: 18 },
  instagramAvatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    padding: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  instagramAvatar: {
    width: "100%",
    height: "100%",
  },
  photoPickerWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  photoPicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  photoPickerPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 46,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  photoPickerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    textAlign: "center",
  },
  photoPickerImage: {
    width: "100%",
    height: "100%",
    borderRadius: 46,
  },
  removePhotoBtn: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  cardPhoneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardPhone: { fontFamily: "Inter_400Regular", fontSize: 12 },
  cardNote: { fontFamily: "Inter_400Regular", fontSize: 12, fontStyle: "italic" },
  cardDebt: { alignItems: "flex-end", gap: 4, minWidth: 90 },
  debtBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  debtBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  debtAmount: { fontFamily: "Inter_700Bold", fontSize: 13, textAlign: "right" },
  debtLimit: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" },

  // Modal styles
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheetWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    marginBottom: 14,
  },
  formError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  formErrorText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, color: "#DC2626" },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  saveBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});

export default function CustomersScreen() {
  const { subscriptionActive } = useAuth();
  if (!subscriptionActive) return <SubscriptionLockScreen screenName="Mijozlar" />;
  return <CustomersScreenInner />;
}
