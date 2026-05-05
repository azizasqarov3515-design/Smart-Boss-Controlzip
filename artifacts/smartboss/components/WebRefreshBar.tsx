import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface WebRefreshBarProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export function WebRefreshBar({ refreshing, onRefresh }: WebRefreshBarProps) {
  const colors = useColors();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const loop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (refreshing) {
      loop.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        })
      );
      loop.current.start();
    } else {
      loop.current?.stop();
      spinAnim.setValue(0);
    }
    return () => {
      loop.current?.stop();
    };
  }, [refreshing, spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (Platform.OS !== "web") return null;

  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.btn, { opacity: refreshing ? 0.6 : 1 }]}
        onPress={onRefresh}
        disabled={refreshing}
        activeOpacity={0.75}
      >
        {refreshing ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.label, { color: colors.primary }]}>Yangilanmoqda...</Text>
          </>
        ) : (
          <>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <MaterialIcons name="refresh" size={18} color={colors.primary} />
            </Animated.View>
            <Text style={[styles.label, { color: colors.primary }]}>Yangilash</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "flex-end",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
