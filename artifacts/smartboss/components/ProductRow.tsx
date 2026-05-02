import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import type { Product } from "@workspace/api-client-react";

type ProductRowProps = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  isEven: boolean;
};

export function ProductRow({ product, onEdit, onDelete, isEven }: ProductRowProps) {
  const colors = useColors();
  const profit = product.salePrice - product.costPrice;
  const profitPercent = product.costPrice > 0 ? ((profit / product.costPrice) * 100).toFixed(0) : "0";
  const isLowStock = product.quantity < 5;

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "O'chirish",
      `"${product.name}" mahsulotini o'chirmoqchimisiz?`,
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "O'chirish",
          style: "destructive",
          onPress: () => onDelete(product.id),
        },
      ]
    );
  };

  const handleEdit = () => {
    Haptics.selectionAsync();
    onEdit(product);
  };

  return (
    <View style={[styles.row, { backgroundColor: isEven ? colors.card : colors.muted, borderBottomColor: colors.border }]}>
      <View style={styles.nameCol}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text>
        <Text style={[styles.brand, { color: colors.mutedForeground }]} numberOfLines={1}>{product.brand}</Text>
      </View>
      <View style={styles.priceCol}>
        <Text style={[styles.price, { color: colors.mutedForeground }]}>{product.costPrice.toLocaleString()} UZS</Text>
        <Text style={[styles.price, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{product.salePrice.toLocaleString()} UZS</Text>
        <View style={[styles.profitBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.profitText, { color: colors.primaryLight }]}>+{profitPercent}%</Text>
        </View>
      </View>
      <View style={styles.qtyCol}>
        <View style={[styles.qtyBadge, { backgroundColor: isLowStock ? colors.destructive : colors.success }]}>
          <Text style={styles.qtyText}>{product.quantity}</Text>
        </View>
        {isLowStock && (
          <Text style={[styles.lowStock, { color: colors.destructive }]}>Kam</Text>
        )}
      </View>
      <View style={styles.actionsCol}>
        <TouchableOpacity onPress={handleEdit} style={[styles.actionBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.7}>
          <MaterialIcons name="edit" size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: "#FEECEC" }]} activeOpacity={0.7}>
          <MaterialIcons name="delete-outline" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  nameCol: { flex: 2.2, paddingRight: 8 },
  priceCol: { flex: 2.5, paddingRight: 4 },
  qtyCol: { flex: 0.8, alignItems: "center" },
  actionsCol: { flex: 0.8, flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  brand: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  price: { fontFamily: "Inter_400Regular", fontSize: 11 },
  profitBadge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 2,
  },
  profitText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  qtyBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  qtyText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#FFFFFF" },
  lowStock: { fontFamily: "Inter_500Medium", fontSize: 9, marginTop: 2 },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
});
