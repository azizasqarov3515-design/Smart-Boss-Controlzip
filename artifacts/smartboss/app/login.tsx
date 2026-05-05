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
import { useAuth } from "@/contexts/AuthContext";
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
  const { login } = useAuth();
  const router = useRouter();

  const [loginCode, setLoginCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("+998 ");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotStep, setForgotStep] = useState<"phone" | "sent">("phone");
  const [maskedPhone, setMaskedPhone] = useState("");

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
      const msg = e instanceof Error ? e.message : "Login amalga oshmadi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const phoneDigits = forgotPhone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 12;

  const handleForgotPhone = (text: string) => {
    if (text.length < 5) { setForgotPhone("+998 "); return; }
    setForgotPhone(formatPhone(text));
    setForgotError(null);
  };

  const handleSendSms = async () => {
    if (!phoneValid) { setForgotError("To'liq telefon raqam kiriting"); return; }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: forgotPhone }),
      });
      const data = (await res.json()) as { masked_phone?: string; storeName?: string; error?: string; code?: string };
      if (!res.ok) {
        if (data.code === "SMS_NOT_CONFIGURED") {
          setForgotError("SMS xizmati hozircha ulanmagan. Administrator bilan bog'laning.");
        } else {
          setForgotError(data.error ?? "Xato yuz berdi");
        }
        return;
      }
      setMaskedPhone(data.masked_phone ?? forgotPhone);
      setForgotStep("sent");
    } catch {
      setForgotError("Server bilan bog'lanishda xato");
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setForgotModal(false);
    setForgotPhone("+998 ");
    setForgotError(null);
    setForgotStep("phone");
    setMaskedPhone("");
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
                onPress={() => { setForgotModal(true); setForgotStep("phone"); }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="help-outline" size={14} color={colors.primary} />
                <Text style={[styles.forgotText, { color: colors.primary }]}>Login yoki parolni unutdingizmi?</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color="#fff" />
                <Text style={styles.loginBtnText}>Kirish</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Hali ro'yxatdan o'tmaganmisiz?
          </Text>
          <TouchableOpacity onPress={() => router.push("/manager-register")} activeOpacity={0.7}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Ro'yxatdan o'ting</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/role-select")}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={18} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Orqaga</Text>
        </TouchableOpacity>
      </View>

      {/* Forgot credentials modal */}
      <Modal
        visible={forgotModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeForgotModal}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.modalTitleRow}>
                  <MaterialIcons name="lock-reset" size={22} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    {forgotStep === "phone" ? "Parolni tiklash" : "SMS yuborildi"}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeForgotModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialIcons name="close" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {forgotStep === "phone" ? (
                  <>
                    <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
                      Ro'yxatdan o'tishda ishlatgan telefon raqamingizni kiriting. Tizim login va yangi vaqtinchalik parolni SMS orqali yuboradi.
                    </Text>

                    <View style={styles.fieldWrap}>
                      <Text style={[styles.label, { color: colors.mutedForeground }]}>Telefon raqamingiz</Text>
                      <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: forgotError ? "#E53935" : (phoneValid ? "#4CAF50" : colors.border) }]}>
                        <MaterialIcons name="phone" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, { color: colors.foreground }]}
                          placeholder="+998 XX XXX XX XX"
                          placeholderTextColor={colors.mutedForeground}
                          value={forgotPhone}
                          onChangeText={handleForgotPhone}
                          keyboardType="phone-pad"
                          returnKeyType="done"
                          autoFocus
                        />
                        {phoneValid && <MaterialIcons name="check-circle" size={18} color="#4CAF50" />}
                      </View>
                    </View>

                    {forgotError && (
                      <View style={styles.errorRow}>
                        <MaterialIcons name="error-outline" size={14} color="#E53935" />
                        <Text style={[styles.errorText, { flex: 1 }]}>{forgotError}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.smsBtn, { backgroundColor: phoneValid ? "#1565C0" : colors.border, opacity: forgotLoading ? 0.75 : 1 }]}
                      onPress={handleSendSms}
                      activeOpacity={0.85}
                      disabled={!phoneValid || forgotLoading}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialIcons name="sms" size={20} color={phoneValid ? "#fff" : colors.mutedForeground} />
                          <Text style={[styles.smsBtnText, { color: phoneValid ? "#fff" : colors.mutedForeground }]}>
                            SMS xabarnoma yuborish
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={[styles.sentBox, { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" }]}>
                      <View style={styles.sentIconRow}>
                        <MaterialIcons name="mark-chat-read" size={32} color="#2E7D32" />
                        <Text style={[styles.sentTitle, { color: "#2E7D32" }]}>SMS muvaffaqiyatli yuborildi!</Text>
                      </View>
                      <View style={[styles.sentDivider, { backgroundColor: "#A5D6A7" }]} />
                      <Text style={[styles.sentDesc, { color: "#388E3C" }]}>
                        <Text style={{ fontFamily: "Inter_700Bold" }}>{maskedPhone}</Text>
                        {"\n"}raqamiga login va vaqtinchalik parol SMS orqali yuborildi.
                      </Text>
                      <Text style={[styles.sentNote, { color: "#558B2F" }]}>
                        ⚠️ Kirganingizdan keyin yangi doimiy parol o'rnating
                      </Text>
                    </View>

                    <Text style={[styles.sentHint, { color: colors.mutedForeground }]}>
                      SMS kelmagan bo'lsa, bir necha daqiqadan keyin qayta urinib ko'ring yoki telefon raqamingizni tekshiring.
                    </Text>

                    <TouchableOpacity
                      style={[styles.closeBtn, { backgroundColor: colors.primary }]}
                      onPress={closeForgotModal}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons name="check" size={18} color="#fff" />
                      <Text style={styles.closeBtnText}>Tushunarli</Text>
                    </TouchableOpacity>
                  </>
                )}
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
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
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
  fieldWrap: { marginBottom: 16 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 6 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 0 },
  eyeBtn: { padding: 4 },
  errorBlock: { marginBottom: 12, marginTop: -4, gap: 8 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
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
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  modalBody: { padding: 20, gap: 16 },
  modalDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  smsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 52,
  },
  smsBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  // SMS sent screen
  sentBox: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10 },
  sentIconRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sentTitle: { fontFamily: "Inter_700Bold", fontSize: 15, flex: 1 },
  sentDivider: { height: 1, marginVertical: 2 },
  sentDesc: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  sentNote: { fontFamily: "Inter_500Medium", fontSize: 11 },
  sentHint: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, textAlign: "center" },
  closeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 50,
  },
  closeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
