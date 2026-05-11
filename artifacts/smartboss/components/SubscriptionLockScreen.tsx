import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

interface Props {
  screenName?: string;
}

export function SubscriptionLockScreen({ screenName }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleBuySubscription = async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/contact`);
      if (res.ok) {
        const data = (await res.json()) as { adminPhone?: string };
        setPhone(data.adminPhone ?? null);
      }
    } catch {
      setPhone(null);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const handleCall = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconBg, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
          <MaterialIcons name="lock" size={56} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {screenName ? `"${screenName}" bo'limi` : "Bu bo'lim"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          faqat faol obuna bilan ishlaydi
        </Text>

        <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Avval obuna paketini sotib oling, so'ng admin tomonidan faollashtiriladi
          </Text>
        </View>

        {!fetched ? (
          <TouchableOpacity
            style={[styles.buyBtn, { backgroundColor: colors.primary }]}
            onPress={handleBuySubscription}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="shopping-cart" size={20} color="#fff" />
            )}
            <Text style={styles.buyBtnText}>
              {loading ? "Yuklanmoqda…" : "Obuna sotib olish"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.phoneSection}>
            {phone ? (
              <>
                <Text style={[styles.phoneLabel, { color: colors.mutedForeground }]}>
                  Admin telefon raqami:
                </Text>
                <TouchableOpacity
                  style={[styles.phoneBtn, { backgroundColor: "#16a34a22", borderColor: "#16a34a" }]}
                  onPress={handleCall}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="phone" size={22} color="#16a34a" />
                  <Text style={[styles.phoneBtnText, { color: "#16a34a" }]}>{phone}</Text>
                </TouchableOpacity>
                <Text style={[styles.phoneHint, { color: colors.mutedForeground }]}>
                  To'lovni amalga oshiring, admin obunangizni faollashtiradi
                </Text>
              </>
            ) : (
              <View style={[styles.noPhoneBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <MaterialIcons name="phone-disabled" size={20} color={colors.mutedForeground} />
                <Text style={[styles.noPhoneText, { color: colors.mutedForeground }]}>
                  Admin telefon raqami hali kiritilmagan.{"\n"}Keyinroq urinib ko'ring.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.border }]}
              onPress={() => { setFetched(false); setPhone(null); }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={16} color={colors.mutedForeground} />
              <Text style={[styles.retryText, { color: colors.mutedForeground }]}>Qayta urinish</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    maxWidth: 380,
    width: "100%",
  },
  iconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 24,
    width: "100%",
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  buyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    justifyContent: "center",
  },
  buyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  phoneSection: {
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  phoneLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  phoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    width: "100%",
    justifyContent: "center",
  },
  phoneBtnText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  phoneHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  noPhoneBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    width: "100%",
  },
  noPhoneText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  retryText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
