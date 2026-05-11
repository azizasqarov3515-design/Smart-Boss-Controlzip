import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" });
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { subscriptionExpired, subscriptionDaysLeft, subscriptionEnd, subscriptionActive, isAuthenticated, role, logout } = useAuth();

  if (!isAuthenticated) return <>{children}</>;

  // Show full block only if they had a subscription that is now expired/inactive
  // New managers with no subscription history (subscriptionEnd === null) are allowed through
  if (subscriptionEnd !== null && (subscriptionExpired || !subscriptionActive)) {
    const handleLogout = () => {
      Alert.alert("Chiqish", "Tizimdan chiqishni xohlaysizmi?", [
        { text: "Bekor", style: "cancel" },
        {
          text: "Chiqish",
          style: "destructive",
          onPress: async () => {
            await logout();
            // Navigation is handled automatically by RootLayoutNav
            // when isAuthenticated becomes false
          },
        },
      ]);
    };

    return (
      <View style={styles.blockContainer}>
        <View style={styles.blockCard}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="block" size={64} color="#EF4444" />
          </View>
          <Text style={styles.blockTitle}>Obuna muddati tugagan</Text>
          <Text style={styles.blockSubtitle}>
            Tizimdan foydalanish uchun obunangizni yangilang.
            {"\n"}Administrator bilan bog'laning.
          </Text>
          {subscriptionEnd && (
            <View style={styles.expiredBadge}>
              <MaterialIcons name="event-busy" size={16} color="#EF4444" />
              <Text style={styles.expiredText}>Tugagan: {formatDate(subscriptionEnd)}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <MaterialIcons name="logout" size={18} color="#fff" />
            <Text style={styles.logoutBtnText}>Chiqish</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Warning banner if 3 days or less left
  const showWarning = subscriptionActive && subscriptionDaysLeft !== null && subscriptionDaysLeft <= 3 && subscriptionDaysLeft > 0;

  return (
    <>
      {showWarning && (
        <View style={[
          styles.warningBanner,
          subscriptionDaysLeft === 1 ? styles.warningCritical : styles.warningOrange,
        ]}>
          <MaterialIcons name="warning" size={18} color="#fff" style={styles.warningIcon} />
          <Text style={styles.warningText}>
            {subscriptionDaysLeft === 1
              ? "⚠️ Obuna bugun tugaydi! Yangilang."
              : `⚠️ Obuna ${subscriptionDaysLeft} kun ichida tugaydi (${formatDate(subscriptionEnd)})`}
          </Text>
        </View>
      )}
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  blockContainer: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  blockCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3A1A1A",
    maxWidth: 360,
    width: "100%",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2D1A1A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#EF444433",
  },
  blockTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 12,
  },
  blockSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  expiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D1A1A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#EF444444",
  },
  expiredText: {
    color: "#EF4444",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#374151",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  logoutBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  warningOrange: {
    backgroundColor: "#F59E0B",
  },
  warningCritical: {
    backgroundColor: "#EF4444",
  },
  warningIcon: {
    marginRight: 8,
  },
  warningText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
});
