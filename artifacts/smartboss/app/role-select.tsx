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
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
          <MaterialIcons name="business" size={44} color="#fff" />
        </View>
        <Text style={[styles.appName, { color: colors.foreground }]}>SMARTBOSScontrol</Text>
        <Text style={[styles.appSub, { color: colors.mutedForeground }]}>Boshqaruv tizimi</Text>
      </View>

      <Text style={[styles.question, { color: colors.foreground }]}>Bo'limni tanlang</Text>

      <View style={styles.cards}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/login"); }}
          activeOpacity={0.85}
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

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Do'konda sotuvchilar bo'lmasa, "Rahbar" bo'limini tanlang
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 40, marginTop: 20 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#1565C0", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  appName: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 4 },
  appSub: { fontFamily: "Inter_400Regular", fontSize: 13 },
  question: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 20, textAlign: "center" },
  cards: { gap: 16 },
  card: {
    borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    position: "relative",
  },
  cardIcon: { marginBottom: 14, alignSelf: "flex-start", padding: 4 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", marginBottom: 4 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.85)" },
  cardArrow: { position: "absolute", right: 20, bottom: 24 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", marginTop: 28, paddingHorizontal: 20 },
});
