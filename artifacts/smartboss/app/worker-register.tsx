import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

function formatPhone(text: string): string {
  const digits = text.replace(/\D/g, "");
  let local = digits.startsWith("998") ? digits.slice(3) : digits;
  local = local.slice(0, 9);
  let result = "+998";
  if (local.length > 0) result += " " + local.slice(0, 2);
  if (local.length > 2) result += " " + local.slice(2, 5);
  if (local.length > 5) result += " " + local.slice(5, 7);
  if (local.length > 7) result += " " + local.slice(7, 9);
  return result;
}

export default function WorkerRegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginWorker } = useAuth();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const handlePhoneChange = (text: string) => {
    if (text.length < 5) { setPhone("+998 "); return; }
    setPhone(formatPhone(text));
    setErrors((e) => ({ ...e, phone: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) newErrors["name"] = "Ism familiyani kiriting";
    if (!address.trim() || address.trim().length < 2) newErrors["address"] = "Yashash manzilini kiriting";
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 12) newErrors["phone"] = "To'liq telefon raqam kiriting (+998 XX XXX XX XX)";
    if (!password || password.length < 4) newErrors["password"] = "Parol kamida 4 ta belgi bo'lishi kerak";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/worker-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), address: address.trim(), phone, password }),
      });
      const data = (await res.json()) as { id?: number; name?: string; status?: string; error?: string; code?: string };
      if (!res.ok) {
        if (data.code === "PENDING") {
          // Already registered — just login to get a token and go to pending screen
          await loginWorker(phone, password);
          router.replace("/worker-pending");
        } else {
          setApiError(data.error ?? "Ro'yxatdan o'tishda xato");
        }
        return;
      }
      // Registration successful — auto-login to get token, then go to pending screen
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loginWorker(phone, password);
      router.replace("/worker-pending");
    } catch {
      setApiError("Server bilan bog'lanishda xato");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key: string) => errors[key] ? (
    <View style={styles.fieldErrorRow}>
      <MaterialIcons name="error-outline" size={13} color="#E53935" />
      <Text style={styles.fieldErrorText}>{errors[key]}</Text>
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.logoWrap}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "18" }]}>
            <MaterialIcons name="person-add" size={38} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Ro'yxatdan o'tish</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>Ma'lumotlarni to'ldiring va rahbarga jo'nating</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              <Text style={{ color: "#DC2626" }}>* </Text>Ism familiyasi
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: errors["name"] ? "#E53935" : colors.border }]}>
              <MaterialIcons name="person" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="To'liq ism familiyangiz"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: "" })); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            {fieldError("name")}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              <Text style={{ color: "#DC2626" }}>* </Text>Yashash manzili
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: errors["address"] ? "#E53935" : colors.border }]}>
              <MaterialIcons name="location-on" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Shahar, tuman, ko'cha..."
                placeholderTextColor={colors.mutedForeground}
                value={address}
                onChangeText={(t) => { setAddress(t); setErrors((e) => ({ ...e, address: "" })); }}
                returnKeyType="next"
              />
            </View>
            {fieldError("address")}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              <Text style={{ color: "#DC2626" }}>* </Text>Telefon raqam
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: errors["phone"] ? "#E53935" : colors.border }]}>
              <MaterialIcons name="phone" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="+998 XX XXX XX XX"
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>
            {fieldError("phone")}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              <Text style={{ color: "#DC2626" }}>* </Text>Parol
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: errors["password"] ? "#E53935" : colors.border }]}>
              <MaterialIcons name="lock" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Kamida 4 ta belgi"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: "" })); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7} style={styles.eyeBtn}>
                <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {fieldError("password")}
          </View>

          {apiError && (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={15} color="#E53935" />
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Rahbarga jo'natish</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Ariza rahbarga yuboriladi. Rahbar tasdig'idan so'ng siz ilovaga kira olasiz.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingHorizontal: 24 },
  backBtn: { padding: 4, alignSelf: "flex-start", marginBottom: 16 },
  logoWrap: { alignItems: "center", marginBottom: 28 },
  iconCircle: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, marginBottom: 6 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", paddingHorizontal: 20 },
  card: {
    borderRadius: 20, borderWidth: 1, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    marginBottom: 20,
  },
  fieldWrap: { marginBottom: 16 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 6 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 0 },
  eyeBtn: { padding: 4 },
  fieldErrorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  fieldErrorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#E53935" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12, marginTop: -4 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#E53935", flex: 1 },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 52, marginTop: 8,
  },
  submitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
});
