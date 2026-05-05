import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

  const handleLogin = async () => {
    if (!loginCode.trim() || !password.trim()) {
      setError("Login va parolni kiriting");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(loginCode.trim().toUpperCase(), password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login amalga oshmadi";
      setError(msg);
    } finally {
      setLoading(false);
    }
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
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={15} color="#E53935" />
              <Text style={styles.errorText}>{error}</Text>
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
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12, marginTop: -4 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#E53935", flex: 1 },
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
});
