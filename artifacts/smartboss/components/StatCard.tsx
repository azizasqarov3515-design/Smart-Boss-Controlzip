import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

type StatCardProps = {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  subtitle?: string;
  variant?: "default" | "primary" | "warning" | "success" | "danger";
};

export function StatCard({ label, value, icon, iconColor, subtitle, variant = "default" }: StatCardProps) {
  const colors = useColors();

  const getIconColor = () => {
    if (iconColor) return iconColor;
    switch (variant) {
      case "primary": return "#3b82f6"; // neon blue
      case "warning": return "#f97316"; // neon orange
      case "success": return "#10b981"; // neon green
      case "danger": return "#ef4444";
      default: return "#3b82f6";
    }
  };

  const iconHex = getIconColor();
  const iconBg = iconHex + "25"; // 15% opacity

  return (
    <View style={[styles.card, { backgroundColor: "rgba(17, 24, 39, 0.75)", borderColor: "rgba(255, 255, 255, 0.08)" }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <MaterialIcons name={icon} size={18} color={iconHex} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
  },
});
