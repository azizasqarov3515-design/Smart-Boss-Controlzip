import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from "@/contexts/AuthContext";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface FormState {
  fullName: string;
  address: string;
  phone: string;
  email: string;
  storeName: string;
  storeAddress: string;
  storeId: string;
  login: string;
  password: string;
}

const EMPTY: FormState = {
  fullName: "",
  address: "",
  phone: "",
  email: "",
  storeName: "",
  storeAddress: "",
  storeId: "",
  login: "",
  password: "",
};

function validateLogin(v: string) {
  return /^[A-Z0-9]{8}$/.test(v);
}

function validatePassword(v: string) {
  return /^\d{6}$/.test(v);
}

function validateStoreId(v: string) {
  return /^[A-Z]{2}\d{8}$/.test(v);
}

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isFormValid(f: FormState) {
  return (
    f.fullName.trim().length >= 2 &&
    f.address.trim().length >= 2 &&
    f.phone.trim().length >= 7 &&
    validateEmail(f.email) &&
    f.storeName.trim().length >= 2 &&
    f.storeAddress.trim().length >= 2 &&
    validateStoreId(f.storeId) &&
    validateLogin(f.login) &&
    validatePassword(f.password)
  );
}

type FieldKey = keyof FormState;

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  placeholder: string;
  icon: string;
  keyboardType?: "default" | "phone-pad" | "numeric";
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  maxLength?: number;
  hint?: string;
  secure?: boolean;
}> = [
  { key: "fullName", label: "Ism Familiya", placeholder: "To'liq ism familiyangiz", icon: "person", autoCapitalize: "words" },
  { key: "address", label: "Yashash joyi", placeholder: "Shahar, ko'cha, uy raqami", icon: "home", autoCapitalize: "words" },
  { key: "phone", label: "Telefon raqami", placeholder: "+998 90 123 45 67", icon: "phone", keyboardType: "phone-pad" },
  {
    key: "email",
    label: "Email manzil *",
    placeholder: "example@gmail.com",
    icon: "email",
    keyboardType: "email-address" as const,
    autoCapitalize: "none" as const,
    hint: "Parolni unutsangiz ushbu emailga yuboriladi",
  },
  { key: "storeName", label: "Do'kon nomi", placeholder: "Do'koningiz nomi", icon: "store", autoCapitalize: "words" },
  { key: "storeAddress", label: "Do'kon manzili", placeholder: "Do'kon joylashgan manzil", icon: "location-on", autoCapitalize: "words" },
  {
    key: "storeId",
    label: "Do'kon uchun ID raqam",
    placeholder: "AB12345678",
    icon: "tag",
    autoCapitalize: "characters",
    maxLength: 10,
    hint: "Format: 2 ta katta harf + 8 ta raqam   Namuna: AB12345678",
  },
  {
    key: "login",
    label: "Login",
    placeholder: "AB12CD34",
    icon: "badge",
    autoCapitalize: "characters",
    maxLength: 8,
    hint: "8 ta: katta harf (A-Z) va raqam (0-9)",
  },
  {
    key: "password",
    label: "Parol",
    placeholder: "123456",
    icon: "lock",
    keyboardType: "numeric",
    maxLength: 6,
    hint: "Faqat 6 ta raqam",
    secure: true,
  },
];

export default function ManagerRegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const set = useCallback((key: FieldKey, value: string) => {
    setForm((f) => ({ ...f, [key]: key === "login" ? value.toUpperCase() : value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setServerError(null);
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<FieldKey, string>> = {};
    if (form.fullName.trim().length < 2) newErrors.fullName = "Kamida 2 ta harf";
    if (form.address.trim().length < 2) newErrors.address = "Yashash joyi kiritilishi shart";
    if (form.phone.trim().length < 7) newErrors.phone = "Telefon raqami kiritilishi shart";
    if (!validateEmail(form.email)) newErrors.email = "To'g'ri email manzil kiriting (masalan: user@gmail.com)";
    if (form.storeName.trim().length < 2) newErrors.storeName = "Do'kon nomi kiritilishi shart";
    if (form.storeAddress.trim().length < 2) newErrors.storeAddress = "Do'kon manzili kiritilishi shart";
    if (!validateStoreId(form.storeId)) newErrors.storeId = "2 katta harf + 8 raqam (masalan: AB12345678)";
    if (!validateLogin(form.login)) newErrors.login = "8 ta katta harf va raqam (masalan: AB12CD34)";
    if (!validatePassword(form.password)) newErrors.password = "Faqat 6 ta raqam bo'lishi kerak";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/manager-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          storeName: form.storeName.trim(),
          storeAddress: form.storeAddress.trim(),
          storeId: form.storeId,
          login: form.login,
          password: form.password,
        }),
      });
      const data = (await res.json()) as {
        id?: number;
        storeName?: string;
        token?: string;
        name?: string;
        managerId?: number;
        storeAddress?: string;
        storeId?: string;
        error?: string;
      };
      if (!res.ok) {
        setServerError(data.error ?? "Ro'yxatdan o'tishda xato");
        return;
      }
      // Auto-login: API returns token directly after registration
      await login(form.login, form.password);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setServerError(msg || "Tarmoq xatosi. Internet aloqasini tekshiring.");
    } finally {
      setLoading(false);
    }
  };

  const formValid = isFormValid(form);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ro'yxatdan o'tish</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Do'kon egasi uchun</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {FIELDS.map((field) => {
            const fieldError = errors[field.key];
            const isLoginField = field.key === "login";
            const isStoreIdField = field.key === "storeId";
            const isPasswordField = field.key === "password";

            return (
              <View key={field.key} style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{field.label}</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: fieldError ? "#E53935" : colors.border,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={field.icon as keyof typeof MaterialIcons.glyphMap}
                    size={20}
                    color={fieldError ? "#E53935" : colors.mutedForeground}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={form[field.key]}
                    onChangeText={(v) => set(field.key, v)}
                    keyboardType={field.keyboardType ?? "default"}
                    autoCapitalize={field.autoCapitalize ?? "sentences"}
                    autoCorrect={false}
                    maxLength={field.maxLength}
                    secureTextEntry={isPasswordField && !showPassword}
                    returnKeyType="next"
                  />
                  {isStoreIdField && (
                    <View style={[styles.charBadge, { backgroundColor: validateStoreId(form.storeId) ? "#4CAF50" : colors.border }]}>
                      <Text style={[styles.charBadgeText, { color: validateStoreId(form.storeId) ? "#fff" : colors.mutedForeground }]}>
                        {form.storeId.length}/10
                      </Text>
                    </View>
                  )}
                  {isLoginField && (
                    <View style={[styles.charBadge, { backgroundColor: validateLogin(form.login) ? "#4CAF50" : colors.border }]}>
                      <Text style={[styles.charBadgeText, { color: validateLogin(form.login) ? "#fff" : colors.mutedForeground }]}>
                        {form.login.length}/8
                      </Text>
                    </View>
                  )}
                  {isPasswordField && (
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7} style={styles.eyeBtn}>
                      <MaterialIcons
                        name={showPassword ? "visibility-off" : "visibility"}
                        size={20}
                        color={colors.mutedForeground}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {field.hint && !fieldError && (
                  <Text style={[styles.hintText, { color: colors.mutedForeground }]}>{field.hint}</Text>
                )}
                {fieldError && (
                  <View style={styles.errorRow}>
                    <MaterialIcons name="error-outline" size={13} color="#E53935" />
                    <Text style={styles.errorText}>{fieldError}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {serverError && (
            <View style={[styles.serverErrorBox, { backgroundColor: "#FFEBEE" }]}>
              <MaterialIcons name="error" size={18} color="#E53935" />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.registerBtn,
              {
                backgroundColor: formValid ? colors.primary : colors.border,
                opacity: loading ? 0.75 : 1,
              },
            ]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={!formValid || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="how-to-reg" size={20} color={formValid ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.registerBtnText, { color: formValid ? "#fff" : colors.mutedForeground }]}>
                  Ro'yxatdan o'tish
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.securityInfo}>
          <MaterialIcons name="security" size={14} color={colors.mutedForeground} />
          <Text style={[styles.securityText, { color: colors.mutedForeground }]}>
            Har bir do'kon alohida himoyalangan hisob bilan ishlaydi
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  backBtn: { padding: 4 },
  headerTextWrap: {},
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  card: {
    borderRadius: 20, borderWidth: 1, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 4,
  },
  fieldWrap: { marginBottom: 14 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 6 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 0 },
  eyeBtn: { padding: 4 },
  charBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, marginLeft: 4,
  },
  charBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  hintText: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4, marginLeft: 2 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#E53935" },
  serverErrorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  serverErrorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#E53935", flex: 1 },
  registerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 54, marginTop: 8,
  },
  registerBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  securityInfo: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, marginTop: 20,
  },
  securityText: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
});
