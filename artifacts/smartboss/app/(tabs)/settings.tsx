import * as Haptics from "expo-haptics";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useSettings, type Seller, type StoreSettings } from "@/hooks/useSettings";
import { useTheme } from "@/contexts/ThemeContext";

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function SectionCard({
  title,
  icon,
  children,
  colors,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.sectionIconWrap, { backgroundColor: colors.primary + "18" }]}>
          <MaterialIcons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad";
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, saveSettings, isLoading } = useSettings();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  const [storeName, setStoreName] = useState("");
  const [storeSubtitle, setStoreSubtitle] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [sellerModal, setSellerModal] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [deleteSellerConfirm, setDeleteSellerConfirm] = useState<Seller | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setStoreName(settings.storeName);
      setStoreSubtitle(settings.storeSubtitle);
      setStoreAddress(settings.storeAddress);
      setSellers(settings.sellers);
    }
  }, [isLoading, settings]);

  const handleSave = async () => {
    if (!storeName.trim()) return;
    setSaving(true);
    const next: StoreSettings = {
      storeName: storeName.trim(),
      storeSubtitle: storeSubtitle.trim(),
      storeAddress: storeAddress.trim(),
      sellers,
    };
    await saveSettings(next);
    setSaving(false);
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setSaved(false), 2000);
  };

  const openAddSeller = () => {
    setEditingSeller(null);
    setSellerName("");
    setSellerPhone("");
    setSellerError(null);
    setSellerModal(true);
  };

  const openEditSeller = (s: Seller) => {
    setEditingSeller(s);
    setSellerName(s.name);
    setSellerPhone(s.phone);
    setSellerError(null);
    setSellerModal(true);
  };

  const handleSaveSeller = () => {
    if (!sellerName.trim()) { setSellerError("Ism kiritilishi shart"); return; }
    if (!sellerPhone.trim()) { setSellerError("Telefon kiritilishi shart"); return; }
    if (editingSeller) {
      setSellers((prev) => prev.map((s) => s.id === editingSeller.id
        ? { ...s, name: sellerName.trim(), phone: sellerPhone.trim() }
        : s
      ));
    } else {
      setSellers((prev) => [...prev, { id: uuid(), name: sellerName.trim(), phone: sellerPhone.trim() }]);
    }
    setSellerModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDeleteSeller = (s: Seller) => {
    setDeleteSellerConfirm(s);
  };

  const confirmDeleteSeller = () => {
    if (!deleteSellerConfirm) return;
    setSellers((prev) => prev.filter((s) => s.id !== deleteSellerConfirm.id));
    setDeleteSellerConfirm(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Store info */}
          <SectionCard title="Do'kon ma'lumotlari" icon="store" colors={colors}>
            <Field
              label="Do'kon nomi *"
              value={storeName}
              onChangeText={setStoreName}
              placeholder="SMARTBOSS"
              colors={colors}
            />
            <Field
              label="Tavsif (kichik yozuv)"
              value={storeSubtitle}
              onChangeText={setStoreSubtitle}
              placeholder="Android mobil aksessuarlar do'koni"
              colors={colors}
            />
            <Field
              label="Do'kon manzili"
              value={storeAddress}
              onChangeText={setStoreAddress}
              placeholder="Shahar, ko'cha, bino..."
              colors={colors}
            />
          </SectionCard>

          {/* Sellers */}
          <SectionCard title="Sotuvchilar" icon="badge" colors={colors}>
            {sellers.length === 0 && (
              <View style={styles.emptyRow}>
                <MaterialIcons name="person-off" size={32} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Sotuvchi yo'q
                </Text>
              </View>
            )}
            {sellers.map((s, idx) => (
              <View
                key={s.id}
                style={[
                  styles.sellerRow,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    borderTopWidth: idx === 0 ? 0 : 1,
                  },
                ]}
              >
                <View style={[styles.sellerAvatar, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.sellerAvatarText, { color: colors.primary }]}>
                    {s.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.sellerInfo}>
                  <Text style={[styles.sellerName, { color: colors.foreground }]}>{s.name}</Text>
                  <Text style={[styles.sellerPhone, { color: colors.mutedForeground }]}>{s.phone}</Text>
                </View>
                <View style={styles.sellerActions}>
                  <TouchableOpacity
                    style={[styles.sellerActionBtn, { backgroundColor: colors.primary + "18" }]}
                    onPress={() => openEditSeller(s)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="edit" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sellerActionBtn, { backgroundColor: "#FEE2E2" }]}
                    onPress={() => handleDeleteSeller(s)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="delete" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addSellerBtn, { borderColor: colors.primary }]}
              onPress={openAddSeller}
              activeOpacity={0.85}
            >
              <MaterialIcons name="person-add" size={18} color={colors.primary} />
              <Text style={[styles.addSellerText, { color: colors.primary }]}>
                Yangi sotuvchi qo'shish
              </Text>
            </TouchableOpacity>
          </SectionCard>

          {/* Theme */}
          <SectionCard title="Ko'rinish (Mavzu)" icon="palette" colors={colors}>
            {(
              [
                { value: "light", label: "Kunduzgi", icon: "light-mode" },
                { value: "dark",  label: "Tungi",    icon: "dark-mode"  },
                { value: "system",label: "Tizim",    icon: "brightness-auto" },
              ] as { value: "light" | "dark" | "system"; label: string; icon: keyof typeof MaterialIcons.glyphMap }[]
            ).map((opt) => {
              const active = themeMode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.themeRow,
                    {
                      backgroundColor: active ? colors.primary + "18" : colors.muted,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => { setThemeMode(opt.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name={opt.icon} size={22} color={active ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.themeLabel, { color: active ? colors.primary : colors.foreground, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {opt.label}
                  </Text>
                  {active && <MaterialIcons name="check-circle" size={18} color={colors.primary} style={{ marginLeft: "auto" }} />}
                </TouchableOpacity>
              );
            })}
          </SectionCard>

          {/* Hint */}
          <View style={[styles.hintBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Birinchi sotuvchi faktura, chek va yuk xatida asosiy sotuvchi sifatida ko'rsatiladi.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save button */}
      <View style={[styles.saveBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? colors.success : saving ? colors.mutedForeground : colors.primary }]}
          onPress={handleSave}
          disabled={saving || !storeName.trim()}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : saved ? (
            <>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Saqlandi!</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Sozlamalarni saqlash</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Seller add/edit modal */}
      <Modal
        visible={sellerModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSellerModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editingSeller ? "Sotuvchini tahrirlash" : "Yangi sotuvchi"}
                </Text>
                <TouchableOpacity onPress={() => setSellerModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Field
                  label="Sotuvchi ismi *"
                  value={sellerName}
                  onChangeText={setSellerName}
                  placeholder="Azizbek"
                  colors={colors}
                />
                <Field
                  label="Telefon raqami *"
                  value={sellerPhone}
                  onChangeText={setSellerPhone}
                  placeholder="+998 93 483 12 89"
                  keyboardType="phone-pad"
                  colors={colors}
                />
                {sellerError && (
                  <View style={styles.errorBox}>
                    <MaterialIcons name="error-outline" size={14} color="#DC2626" />
                    <Text style={styles.errorText}>{sellerError}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveSeller}
                  activeOpacity={0.88}
                >
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={styles.modalSaveBtnText}>
                    {editingSeller ? "Saqlash" : "Qo'shish"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete seller confirm modal */}
      <Modal
        visible={!!deleteSellerConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDeleteSellerConfirm(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#FEE2E2" }]}>
              <MaterialIcons name="person-remove" size={28} color="#DC2626" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
              Sotuvchini o'chirish
            </Text>
            <Text style={[styles.confirmMsg, { color: colors.mutedForeground }]}>
              <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>
                {deleteSellerConfirm?.name}
              </Text>
              {" "}ni ro'yxatdan o'chirasizmi?
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => setDeleteSellerConfirm(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmCancelText, { color: colors.mutedForeground }]}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, { backgroundColor: "#DC2626" }]}
                onPress={confirmDeleteSeller}
                activeOpacity={0.85}
              >
                <MaterialIcons name="delete" size={16} color="#fff" />
                <Text style={styles.confirmDeleteText}>O'chirish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  sectionBody: { padding: 16, gap: 12 },

  field: { gap: 5 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },

  emptyRow: { alignItems: "center", paddingVertical: 16, gap: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13 },

  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
    marginBottom: 6,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  sellerInfo: { flex: 1 },
  sellerName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  sellerPhone: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  sellerActions: { flexDirection: "row", gap: 6 },
  sellerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  addSellerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 12,
    marginTop: 4,
  },
  addSellerText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },

  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  hintText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },

  saveBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },

  // Seller modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  modalBody: { padding: 20, gap: 14 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#DC2626" },
  modalSaveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  modalSaveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },

  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  themeLabel: { fontSize: 15 },

  // Delete confirm modal
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmSheet: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    gap: 10,
  },
  confirmIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  confirmMsg: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  confirmBtns: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  confirmCancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  confirmDeleteBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmDeleteText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});
