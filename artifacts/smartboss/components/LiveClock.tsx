import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

function getTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  } catch {
    return "";
  }
}

export function LiveClock() {
  const colors = useColors();
  const [now, setNow] = useState(() => new Date());
  const tzCity = getTimezone();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const dateStr = now.toLocaleDateString("uz-UZ", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return (
    <View style={[styles.container, { backgroundColor: "rgba(21,101,192,0.08)", borderColor: "rgba(21,101,192,0.15)" }]}>
      <MaterialIcons name="access-time" size={13} color={colors.primary} />
      <View style={styles.textBlock}>
        <Text style={[styles.time, { color: colors.foreground }]}>{timeStr}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {dateStr}{tzCity ? ` · ${tzCity}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  textBlock: { gap: 0 },
  time: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 18 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 9.5, lineHeight: 13 },
});
