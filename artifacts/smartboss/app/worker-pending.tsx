import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import * as Haptics from "expo-haptics";

export default function WorkerPendingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, refreshWorkerStatus, workerName, workerStatus } = useAuth();
  const [checking, setChecking] = useState(false);

  // On mount — immediately check status
  useEffect(() => {
    refreshWorkerStatus();
  }, [refreshWorkerStatus]);

  // Auto-poll every 5 seconds — _layout.tsx routes to tabs when approved
  useEffect(() => {
    // Stop polling if rejected (no point continuing)
    if (workerStatus === "rejected") return;

    const interval = setInterval(async () => {
      await refreshWorkerStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshWorkerStatus, workerStatus]);

  const handleCheck = async () => {
    setChecking(true);
    Haptics.selectionAsync();
    await refreshWorkerStatus();
    setChecking(false);
  };

  const handleLogout = async () => {
    Haptics.selectionAsync();
    await logout();
    router.replace("/role-select");
  };

  const handleRetry = async () => {
    Haptics.selectionAsync();
    await logout();
    router.replace("/worker-register");
  };

  // ── REJECTED STATE ──────────────────────────────────────────────────────────
  if (workerStatus === "rejected") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: "#FEE2E2" }]}>
            <MaterialIcons name="cancel" size={56} color="#DC2626" />
          </View>

          <Text style={[styles.title, { color: "#DC2626" }]}>Rad etildi</Text>

          {workerName && (
            <View style={[styles.nameBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <MaterialIcons name="person" size={16} color={colors.mutedForeground} />
              <Text style={[styles.nameBadgeText, { color: colors.foreground }]}>{workerName}</Text>
            </View>
          )}

          <View style={[styles.rejectedCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <MaterialIcons name="error-outline" size={22} color="#DC2626" />
            <Text style={[styles.rejectedMsg, { color: "#DC2626" }]}>
              Rahbar sizga rad javobini berdi
            </Text>
          </View>

          <Text style={[styles.desc, { color: colors.mutedForeground }]}>
            Arizangiz rahbar tomonidan rad etildi.{"\n"}
            Qayta ro'yxatdan o'tishingiz yoki{"\n"}
            boshqa telefon raqami bilan urinib ko'ring.
          </Text>

          <TouchableOpacity
            style={[styles.checkBtn, { backgroundColor: colors.primary }]}
            onPress={handleRetry}
            activeOpacity={0.85}
          >
            <MaterialIcons name="person-add" size={20} color="#fff" />
            <Text style={styles.checkBtnText}>Qayta ro'yxatdan o'tish</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.border }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialIcons name="logout" size={18} color={colors.mutedForeground} />
            <Text style={[styles.logoutBtnText, { color: colors.mutedForeground }]}>Chiqish</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── PENDING STATE ───────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: "#FEF3C7" }]}>
          <MaterialIcons name="hourglass-empty" size={56} color="#D97706" />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Kutilmoqda...</Text>

        {workerName && (
          <View style={[styles.nameBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <MaterialIcons name="person" size={16} color={colors.mutedForeground} />
            <Text style={[styles.nameBadgeText, { color: colors.foreground }]}>{workerName}</Text>
          </View>
        )}

        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Sizning arizangiz rahbarga yuborildi.{"\n"}
          Rahbar ariza ko'rib chiqib, tasdiqlasa siz ilovaga kira olasiz.
        </Text>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <MaterialIcons name="info-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Har 5 soniyada avtomatik tekshiriladi
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.checkBtn, { backgroundColor: colors.primary, opacity: checking ? 0.75 : 1 }]}
          onPress={handleCheck}
          activeOpacity={0.85}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.checkBtnText}>Holatni tekshirish</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.border }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialIcons name="logout" size={18} color={colors.mutedForeground} />
          <Text style={[styles.logoutBtnText, { color: colors.mutedForeground }]}>Chiqish</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconWrap: {
    width: 100, height: 100, borderRadius: 28,
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 14 },
  nameBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8,
    marginBottom: 18,
  },
  nameBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  rejectedCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    width: "100%", borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 18,
  },
  rejectedMsg: {
    fontFamily: "Inter_700Bold", fontSize: 15, flex: 1,
  },
  desc: {
    fontFamily: "Inter_400Regular", fontSize: 14,
    textAlign: "center", lineHeight: 22, marginBottom: 24,
  },
  infoCard: {
    width: "100%", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 28,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  checkBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 52, width: "100%", marginBottom: 12,
  },
  checkBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 48, width: "100%", borderWidth: 1,
  },
  logoutBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
