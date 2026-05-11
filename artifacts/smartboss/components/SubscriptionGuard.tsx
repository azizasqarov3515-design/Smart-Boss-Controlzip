import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
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
  const { subscriptionExpired, subscriptionDaysLeft, subscriptionEnd, subscriptionActive, isAuthenticated, role, logout, blocked, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  if (!isAuthenticated) return <>{children}</>;

  // Show BLOCKED screen
  if (blocked) {
    const handleDeleteProfile = () => {
      Alert.alert(
        "Profilni yo'q qilish",
        "Barcha ma'lumotlaringiz — login, parol, do'kon ID, sotuvchilar — butunlay o'chiriladi. Bu amal qaytarib bo'lmaydi!",
        [
          { text: "Bekor qilish", style: "cancel" },
          {
            text: "O'chirish",
            style: "destructive",
            onPress: async () => {
              setDeleting(true);
              try {
                await deleteAccount();
              } catch {
                Alert.alert("Xato", "Profilni o'chirishda xato yuz berdi. Qayta urinib ko'ring.");
              } finally {
                setDeleting(false);
              }
            },
          },
        ]
      );
    };

    return (
      <View style={styles.blockContainer}>
        <View style={styles.blockCard}>
          <View style={[styles.iconContainer, styles.blockedIconBg]}>
            <MaterialIcons name="gpp-bad" size={64} color="#EF4444" />
          </View>
          <Text style={styles.blockTitle}>Siz tizim tomonidan{"\n"}to'liq bloklandingiz</Text>
          <Text style={styles.blockSubtitle}>
            Barcha imkoniyatlar cheklangan.{"\n"}
            Faqat profilingizni butunlay o'chirishingiz mumkin.
          </Text>
          <View style={styles.blockedBadge}>
            <MaterialIcons name="block" size={16} color="#EF4444" />
            <Text style={styles.blockedBadgeText}>Administrator tomonidan bloklangan</Text>
          </View>
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
            onPress={handleDeleteProfile}
            activeOpacity={0.8}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="delete-forever" size={20} color="#fff" />
            )}
            <Text style={styles.deleteBtnText}>
              {deleting ? "O'chirilmoqda…" : "Profilni yo'q qilish"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show subscription expired screen
  if (subscriptionEnd !== null && (subscriptionExpired || !subscriptionActive)) {
    const handleLogout = () => {
      Alert.alert("Chiqish", "Tizimdan chiqishni xohlaysizmi?", [
        { text: "Bekor", style: "cancel" },
        {
          text: "Chiqish",
          style: "destructive",
          onPress: async () => {
            await logout();
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
  blockedIconBg: {
    backgroundColor: "#2A0A0A",
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  blockTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 28,
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
  blockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A0A0A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  blockedBadgeText: {
    color: "#EF4444",
    fontSize: 12,
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
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7F1D1D",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#EF4444",
    width: "100%",
    justifyContent: "center",
  },
  deleteBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
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
