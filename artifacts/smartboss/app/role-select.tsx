import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

export default function RoleSelectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
          <MaterialIcons name="business" size={44} color="#fff" />
        </View>
        <Text style={[styles.appName, { color: colors.foreground }]}>SMARTBOSScontrol</Text>
        <Text style={[styles.appSub, { color: colors.mutedForeground }]}>Boshqaruv tizimi</Text>
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MaterialIcons name="info-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Do'kon egasi uchun{" "}
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>"Rahbar"</Text>
          {" "}bo'limi,{"\n"}Ishchilar uchun{" "}
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>"Sotuvchi ishchi"</Text>
          {" "}bo'limi
        </Text>
      </View>

      <Text style={[styles.question, { color: colors.foreground }]}>Bo'limni tanlang</Text>

      <View style={styles.cards}>
        <View style={[styles.card, { backgroundColor: colors.primary }]}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/login"); }}
            activeOpacity={0.85}
            style={styles.cardTouchable}
          >
            <View style={styles.cardIcon}>
              <MaterialIcons name="admin-panel-settings" size={40} color="#fff" />
            </View>
            <Text style={styles.cardTitle}>Rahbar</Text>
            <Text style={styles.cardSub}>To'liq boshqaruv huquqi</Text>
            <View style={styles.cardArrow}>
              <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
          </TouchableOpacity>
          <View style={[styles.registerRow, { borderTopColor: "rgba(255,255,255,0.2)" }]}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/manager-register"); }}
              activeOpacity={0.7}
              style={styles.registerBtn}
            >
              <MaterialIcons name="person-add" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.registerBtnText}>Birinchi marta? Ro'yxatdan o'ting</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1.5 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/worker-login"); }}
          activeOpacity={0.85}
        >
          <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18", borderRadius: 16 }]}>
            <MaterialIcons name="badge" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Sotuvchi ishchi</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Sotuvchi bo'limi</Text>
          <View style={styles.cardArrow}>
            <MaterialIcons name="arrow-forward" size={20} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 20, marginTop: 10 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#1565C0", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  appName: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 4 },
  appSub: { fontFamily: "Inter_400Regular", fontSize: 13 },
  infoBox: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 20,
  },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 20 },
  question: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 16, textAlign: "center" },
  cards: { gap: 16 },
  card: {
    borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    overflow: "hidden",
  },
  cardTouchable: { padding: 24, position: "relative" },
  cardIcon: { marginBottom: 14, alignSelf: "flex-start", padding: 4 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", marginBottom: 4 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.85)" },
  cardArrow: { position: "absolute", right: 20, bottom: 24 },
  registerRow: {
    borderTopWidth: 1,
    paddingVertical: 10, paddingHorizontal: 24,
  },
  registerBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    justifyContent: "center",
  },
  registerBtnText: {
    fontFamily: "Inter_500Medium", fontSize: 13, color: "rgba(255,255,255,0.85)",
  },
});
