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

  const getBg = () => {
    switch (variant) {
      case "primary": return colors.primary;
      case "warning": return colors.warning;
      case "success": return colors.success;
      case "danger": return colors.destructive;
      default: return colors.card;
    }
  };

  const getTextColor = () => {
    if (variant === "default") return colors.foreground;
    return "#FFFFFF";
  };

  const getSubtextColor = () => {
    if (variant === "default") return colors.mutedForeground;
    return "rgba(255,255,255,0.8)";
  };

  const bg = getBg();
  const textColor = getTextColor();
  const subtextColor = getSubtextColor();
  const resolvedIconColor = iconColor ?? (variant === "default" ? colors.primary : "#FFFFFF");

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: variant === "default" ? colors.border : "transparent" }]}>
      <View style={[styles.iconWrap, { backgroundColor: variant === "default" ? colors.secondary : "rgba(255,255,255,0.2)" }]}>
        <MaterialIcons name={icon} size={22} color={resolvedIconColor} />
      </View>
      <Text style={[styles.value, { color: textColor }]}>{value}</Text>
      <Text style={[styles.label, { color: subtextColor }]}>{label}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: subtextColor }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    marginBottom: 2,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
});
