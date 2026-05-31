import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth, type ManagerLoginData } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, loginWithData } = useAuth();
  const router = useRouter();

  const [loginCode, setLoginCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot modal state
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("+998 ");
  const [forgotStoreId, setForgotStoreId] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!loginCode.trim() || !password.trim()) {
      setError("Login va parolni kiriting");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(loginCode.trim().toUpperCase(), password.trim());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login amalga oshmadi");
    } finally {
      setLoading(false);
    }
  };

  const phoneDigits = forgotPhone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 12;
  const storeIdValid = /^[A-Z]{2}\d{8}$/.test(forgotStoreId);
  const canRecover = phoneValid && storeIdValid;

  const handleForgotPhone = (text: string) => {
    if (text.length < 5) { setForgotPhone("+998 "); return; }
    setForgotPhone(formatPhone(text));
    setForgotError(null);
  };

  const handleForgotStoreId = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    setForgotStoreId(cleaned);
    setForgotError(null);
  };

  const handleRecover = async () => {
    if (!canRecover) return;
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: forgotPhone, storeId: forgotStoreId }),
      });
      const data = (await res.json()) as ManagerLoginData & { error?: string; code?: string };
      if (!res.ok) {
        setForgotError(data.error ?? "Ma'lumotlar topilmadi");
        return;
      }
      // Auto-login: apply the returned token and navigate
      await loginWithData(data);
      closeForgotModal();
      router.replace("/(tabs)");
    } catch {
      setForgotError("Server bilan bog'lanishda xato. Internet aloqasini tekshiring.");
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setForgotModal(false);
    setForgotPhone("+998 ");
    setForgotStoreId("");
    setForgotError(null);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="business" size={44} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>SMARTBOSScontrol</Text>
          <Text style={[styles.appSub, { color: colors.mutedForeground }]}>Rahbar tizimga kirish</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Tizimga kirish</Text>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Login (8 ta katta harf/raqam)</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: error ? "#E53935" : colors.border }]}>
              <MaterialIcons name="person" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Masalan: AB12CD34"
                placeholderTextColor={colors.mutedForeground}
                value={loginCode}
                onChangeText={(t) => { setLoginCode(t.toUpperCase()); setError(null); }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                returnKeyType="next"
                textContentType="username"
                autoComplete="username"
                importantForAutofill="yes"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Parol (6 ta raqam)</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: error ? "#E53935" : colors.border }]}>
              <MaterialIcons name="lock" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="6 xonali raqamli parol"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                secureTextEntry={!showPassword}
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                textContentType="password"
                autoComplete="password"
                importantForAutofill="yes"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7} style={styles.eyeBtn}>
                <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={styles.errorBlock}>
              <View style={styles.errorRow}>
                <MaterialIcons name="error-outline" size={15} color="#E53935" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => setForgotModal(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="help-outline" size={14} color={colors.primary} />
                <Text style={[styles.forgotText, { color: colors.primary }]}>Login yoki parolingizni unutdingizmi?</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : (
              <><MaterialIcons name="login" size={20} color="#fff" /><Text style={styles.loginBtnText}>Kirish</Text></>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Hali ro'yxatdan o'tmaganmisiz?</Text>
          <TouchableOpacity onPress={() => router.push("/manager-register")} activeOpacity={0.7}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Ro'yxatdan o'ting</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/role-select")} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={18} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Orqaga</Text>
        </TouchableOpacity>
      </View>

      {/* Forgot credentials modal */}
      <Modal visible={forgotModal} transparent animationType="slide" statusBarTranslucent onRequestClose={closeForgotModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.modalTitleRow}>
                  <MaterialIcons name="lock-reset" size={22} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>Login va parolni tiklash</Text>
                </View>
                <TouchableOpacity onPress={closeForgotModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialIcons name="close" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <MaterialIcons name="info-outline" size={16} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                    Ro'yxatdan o'tishda kiritgan telefon raqamingiz va Do'kon ID ni kiriting — avtomatik tizimga kirasiz.
                  </Text>
                </View>

                {/* Phone field */}
                <View style={styles.fieldWrap}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Telefon raqami</Text>
                  <View style={[
                    styles.inputRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: forgotError && !phoneValid ? "#E53935" : phoneValid ? "#4CAF50" : colors.border,
                    },
                  ]}>
                    <MaterialIcons name="phone" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      placeholder="+998 XX XXX XX XX"
                      placeholderTextColor={colors.mutedForeground}
                      value={forgotPhone}
                      onChangeText={handleForgotPhone}
                      keyboardType="phone-pad"
                      returnKeyType="next"
                    />
                    {phoneValid && <MaterialIcons name="check-circle" size={18} color="#4CAF50" />}
                  </View>
                </View>

                {/* Store ID field */}
                <View style={styles.fieldWrap}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Do'kon ID raqami</Text>
                  <View style={[
                    styles.inputRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: forgotError && !storeIdValid ? "#E53935" : storeIdValid ? "#4CAF50" : colors.border,
                    },
                  ]}>
                    <MaterialIcons name="store" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground, letterSpacing: 1 }]}
                      placeholder="AB12345678"
                      placeholderTextColor={colors.mutedForeground}
                      value={forgotStoreId}
                      onChangeText={handleForgotStoreId}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={10}
                      returnKeyType="done"
                      onSubmitEditing={handleRecover}
                    />
                    <View style={[styles.charBadge, { backgroundColor: storeIdValid ? "#4CAF50" : colors.border }]}>
                      <Text style={[styles.charBadgeText, { color: storeIdValid ? "#fff" : colors.mutedForeground }]}>
                        {forgotStoreId.length}/10
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.inputHint, { color: colors.mutedForeground }]}>
                    2 ta katta harf + 8 ta raqam (masalan: AB12345678)
                  </Text>
                </View>

                {forgotError && (
                  <View style={[styles.errorRowBox, { backgroundColor: "#FFEBEE" }]}>
                    <MaterialIcons name="error-outline" size={16} color="#E53935" />
                    <Text style={[styles.errorText, { flex: 1 }]}>{forgotError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.recoverBtn,
                    {
                      backgroundColor: canRecover ? colors.primary : colors.border,
                      opacity: forgotLoading ? 0.75 : 1,
                    },
                  ]}
                  onPress={handleRecover}
                  activeOpacity={0.85}
                  disabled={!canRecover || forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons
                        name="login"
                        size={20}
                        color={canRecover ? "#fff" : colors.mutedForeground}
                      />
                      <Text style={[styles.recoverBtnText, { color: canRecover ? "#fff" : colors.mutedForeground }]}>
                        Login va parolni tiklash
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  logoWrap: { alignItems: "center", marginBottom: 28 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    shadowColor: "#1565C0", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  appName: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 4 },
  appSub: { fontFamily: "Inter_400Regular", fontSize: 13 },
  card: {
    borderRadius: 20, borderWidth: 1, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 22, textAlign: "center" },
  fieldWrap: { marginBottom: 14 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 6 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 0 },
  inputHint: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 5 },
  eyeBtn: { padding: 4 },
  charBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, marginLeft: 4 },
  charBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  errorBlock: { marginBottom: 12, marginTop: -4, gap: 8 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  errorRowBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 10, padding: 10,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#E53935" },
  forgotBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  forgotText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  loginBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 52, marginTop: 8,
    shadowColor: "#1565C0", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  loginBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 20 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 12 },
  backText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 36 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  modalBody: { padding: 20, gap: 4 },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8,
  },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
  recoverBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 54, marginTop: 4,
    shadowColor: "#1565C0", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  recoverBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
});
