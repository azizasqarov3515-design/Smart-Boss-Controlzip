import {
  useCreateProduct,
  useGetProducts,
  useUpdateProduct,
  getGetProductsQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type FieldKey = "name" | "brand" | "costPrice" | "salePrice" | "quantity";

type FormValues = {
  name: string;
  brand: string;
  costPrice: string;
  salePrice: string;
  quantity: string;
};

const INITIAL: FormValues = { name: "", brand: "", costPrice: "", salePrice: "", quantity: "" };

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  placeholder: string;
  keyboardType: "default" | "numeric";
  icon: keyof typeof MaterialIcons.glyphMap;
}> = [
  { key: "name", label: "Mahsulot nomi", placeholder: "Masalan: iPhone 15 Pro Max qopqoq", keyboardType: "default", icon: "label-outline" },
  { key: "brand", label: "Brend", placeholder: "Masalan: Apple, Samsung, Xiaomi", keyboardType: "default", icon: "store" },
  { key: "costPrice", label: "Tan narxi (UZS)", placeholder: "0", keyboardType: "numeric", icon: "account-balance-wallet" },
  { key: "salePrice", label: "Sotuv narxi (UZS)", placeholder: "0", keyboardType: "numeric", icon: "sell" },
  { key: "quantity", label: "Miqdori (dona)", placeholder: "0", keyboardType: "numeric", icon: "inventory" },
];

export default function ProductFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = params.id ? parseInt(params.id) : null;
  const isEdit = productId !== null;
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormValues>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormValues>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: products } = useGetProducts({ query: { enabled: isEdit } });

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? "Tahrirlash" : "Yangi mahsulot" });
  }, [navigation, isEdit]);

  useEffect(() => {
    if (isEdit && products) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setForm({
          name: product.name,
          brand: product.brand,
          costPrice: String(product.costPrice),
          salePrice: String(product.salePrice),
          quantity: String(product.quantity),
        });
      }
    }
  }, [isEdit, products, productId]);

  const { mutate: createProduct, isPending: creating } = useCreateProduct({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setSubmitted(true);
        setTimeout(() => router.back(), 200);
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  const { mutate: updateProduct, isPending: updating } = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        router.back();
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  const isPending = creating || updating;

  const validate = (): boolean => {
    const newErrors: Partial<FormValues> = {};
    if (!form.name.trim()) newErrors.name = "Nomi kiritilishi shart";
    if (!form.brand.trim()) newErrors.brand = "Brendi kiritilishi shart";
    const cost = parseFloat(form.costPrice);
    const sale = parseFloat(form.salePrice);
    const qty = parseInt(form.quantity);
    if (!form.costPrice || isNaN(cost) || cost < 0) newErrors.costPrice = "To'g'ri narx kiriting";
    if (!form.salePrice || isNaN(sale) || sale < 0) newErrors.salePrice = "To'g'ri narx kiriting";
    if (!form.quantity || isNaN(qty) || qty < 0) newErrors.quantity = "To'g'ri son kiriting";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      costPrice: parseFloat(form.costPrice),
      salePrice: parseFloat(form.salePrice),
      quantity: parseInt(form.quantity),
    };
    if (isEdit && productId) {
      updateProduct({ id: productId, data: payload });
    } else {
      createProduct({ data: payload });
    }
  };

  const setField = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const cost = parseFloat(form.costPrice) || 0;
  const sale = parseFloat(form.salePrice) || 0;
  const qty = parseInt(form.quantity) || 0;
  const profit = sale - cost;
  const profitPct = cost > 0 ? ((profit / cost) * 100).toFixed(1) : null;
  const showProfit = form.costPrice && form.salePrice;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40, paddingTop: isWeb ? 24 : 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isEdit && productId && (
          <View style={[styles.idRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
            <MaterialIcons name="tag" size={15} color={colors.mutedForeground} />
            <Text style={[styles.idLabel, { color: colors.mutedForeground }]}>
              Unikal ID: <Text style={[styles.idValue, { color: colors.primary }]}>#{productId}</Text>
            </Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {FIELDS.map((field) => (
            <View key={field.key} style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <MaterialIcons name={field.icon} size={14} color={colors.primary} />
                <Text style={[styles.label, { color: colors.foreground }]}>{field.label}</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: errors[field.key] ? colors.destructive : colors.border,
                    color: colors.foreground,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
                value={form[field.key]}
                onChangeText={(v) => setField(field.key, v)}
                placeholder={field.placeholder}
                placeholderTextColor={colors.mutedForeground}
                keyboardType={field.keyboardType}
                autoCapitalize={field.keyboardType === "default" ? "words" : "none"}
                returnKeyType="next"
              />
              {errors[field.key] ? (
                <View style={styles.errorRow}>
                  <MaterialIcons name="error-outline" size={12} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{errors[field.key]}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {showProfit && (
          <View
            style={[
              styles.profitCard,
              {
                backgroundColor: profit >= 0 ? "#E8F5E9" : "#FFEBEE",
                borderColor: profit >= 0 ? "#4CAF50" : "#F44336",
              },
            ]}
          >
            <View style={styles.profitRow}>
              <MaterialIcons
                name={profit >= 0 ? "trending-up" : "trending-down"}
                size={20}
                color={profit >= 0 ? "#2E7D32" : "#C62828"}
              />
              <Text style={[styles.profitLabel, { color: profit >= 0 ? "#2E7D32" : "#C62828" }]}>
                {profit >= 0 ? "Foyda" : "Zarar"}
              </Text>
            </View>
            <View style={styles.profitVals}>
              <Text style={[styles.profitVal, { color: profit >= 0 ? "#1B5E20" : "#B71C1C" }]}>
                {profit >= 0 ? "+" : ""}{profit.toLocaleString()} UZS
              </Text>
              {profitPct && (
                <Text style={[styles.profitPct, { color: profit >= 0 ? "#2E7D32" : "#C62828" }]}>
                  ({profitPct}%)
                </Text>
              )}
            </View>
            {qty > 0 && (
              <Text style={[styles.profitTotal, { color: profit >= 0 ? "#388E3C" : "#C62828" }]}>
                {qty} dona × {profit >= 0 ? "+" : ""}{profit.toLocaleString()} = {(profit * qty).toLocaleString()} UZS jami
              </Text>
            )}
            {form.quantity && parseInt(form.quantity) < 5 && parseInt(form.quantity) >= 0 && (
              <View style={styles.lowWarn}>
                <MaterialIcons name="warning" size={13} color="#E65100" />
                <Text style={[styles.lowWarnText, { color: "#E65100" }]}>
                  Diqqat: {parseInt(form.quantity)} dona — stok kam!
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: isPending || submitted ? colors.mutedForeground : colors.primary },
          ]}
          onPress={handleSubmit}
          disabled={isPending || submitted}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : submitted ? (
            <MaterialIcons name="check-circle" size={22} color="#fff" />
          ) : (
            <>
              <MaterialIcons name={isEdit ? "save" : "add-circle"} size={20} color="#fff" />
              <Text style={styles.submitText}>{isEdit ? "Saqlash" : "Qo'shish"}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: colors.border }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Bekor qilish</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16 },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  idLabel: { fontFamily: "Inter_400Regular", fontSize: 13 },
  idValue: { fontFamily: "Inter_700Bold", fontSize: 13 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    gap: 4,
  },
  fieldWrap: { marginBottom: 12 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  profitCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 14,
    gap: 6,
  },
  profitRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profitLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  profitVals: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  profitVal: { fontFamily: "Inter_700Bold", fontSize: 20 },
  profitPct: { fontFamily: "Inter_400Regular", fontSize: 13 },
  profitTotal: { fontFamily: "Inter_500Medium", fontSize: 12 },
  lowWarn: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  lowWarnText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
    shadowColor: "#1565C0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderWidth: 1,
  },
  cancelText: { fontFamily: "Inter_500Medium", fontSize: 14 },
});
