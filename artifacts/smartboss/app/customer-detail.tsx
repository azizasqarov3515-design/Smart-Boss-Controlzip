import {
  useGetCustomer,
  useGetCustomerPayments,
  useGetCustomerStatement,
  useCreateCustomerPayment,
  useUpdateCustomer,
  useDeleteCustomer,
  getGetCustomersQueryKey,
  getGetCustomerQueryKey,
  getGetCustomerPaymentsQueryKey,
  getGetCustomerStatementQueryKey,
  getGetDashboardStatsQueryKey,
  type Customer,
  type CustomerStatement,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Print from "expo-print";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/hooks/useSettings";

function formatMoney(n: number) {
  return n.toLocaleString("uz-UZ") + " UZS";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildStatementHtml(stmt: CustomerStatement, storeName = "SMARTBOSScontrol", sellerName = "", sellerPhone = "", storeAddress = ""): string {
  const { customer, sales, payments } = stmt;
  const debtSales = sales.filter((s) => s.paymentType === "debt");

  const salesRows = debtSales
    .map(
      (s) => `
      <tr>
        <td>${formatDate(s.createdAt)}</td>
        <td>${s.itemCount} dona</td>
        <td style="color:#DC2626">+${formatMoney(s.debtAmount ?? s.totalAmount)}</td>
        <td>${formatMoney(s.paidAmount ?? 0)}</td>
      </tr>`
    )
    .join("");

  const paymentRows = payments
    .map(
      (p) => `
      <tr>
        <td>${formatDate(p.createdAt)}</td>
        <td>${p.note || "—"}</td>
        <td style="color:#16a34a">-${formatMoney(p.amount)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Qarz ko'chirmasi — ${customer.name}</title>
  <style>
    body { font-family: sans-serif; font-size: 13px; padding: 30px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
    .info-box { background: #F3F4F6; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .info-label { color: #666; }
    .info-val { font-weight: bold; }
    .debt-total { font-size: 22px; font-weight: bold; color: #DC2626; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #F3F4F6; padding: 8px 10px; text-align: left; font-size: 11px; color: #555; }
    td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; }
    h2 { font-size: 14px; margin-bottom: 8px; color: #374151; }
    .footer { margin-top: 30px; color: #9CA3AF; font-size: 11px; text-align: center; }
  </style>
  </head><body>
  <h1>Qarz ko'chirmasi</h1>
  <p class="subtitle">Sana: ${new Date().toLocaleDateString("uz-UZ")}</p>

  <div class="info-box">
    <div class="info-row"><span class="info-label">Mijoz:</span><span class="info-val">${customer.name}</span></div>
    <div class="info-row"><span class="info-label">Telefon:</span><span class="info-val">${customer.phone}</span></div>
    ${customer.debtLimit > 0 ? `<div class="info-row"><span class="info-label">Qarz limiti:</span><span class="info-val">${formatMoney(customer.debtLimit)}</span></div>` : ""}
    <div class="info-row"><span class="info-label">Joriy qarz:</span><span class="debt-total">${formatMoney(customer.totalDebt)}</span></div>
  </div>

  ${debtSales.length > 0 ? `<h2>Qarzga olingan tovarlar</h2>
  <table>
    <thead><tr><th>Sana</th><th>Miqdor</th><th>Qarz</th><th>To'langan</th></tr></thead>
    <tbody>${salesRows}</tbody>
  </table>` : ""}

  ${paymentRows ? `<h2>To'lovlar tarixi</h2>
  <table>
    <thead><tr><th>Sana</th><th>Izoh</th><th>Summa</th></tr></thead>
    <tbody>${paymentRows}</tbody>
  </table>` : ""}

  ${storeAddress ? `<div style="font-size:11px;color:#9CA3AF;margin-bottom:4px">📍 ${storeAddress}</div>` : ""}
  ${sellerName ? `<div style="font-size:11px;color:#9CA3AF;margin-bottom:4px">Sotuvchi: ${sellerName}${sellerPhone ? ` · ${sellerPhone}` : ""}</div>` : ""}
  <div class="footer">${storeName} &mdash; avtomatik hujjat</div>
  </body></html>`;
}

export default function CustomerDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const params = useLocalSearchParams<{ id: string }>();
  const customerId = parseInt(params.id ?? "0", 10);

  const [activeTab, setActiveTab] = useState<"sales" | "payments">("sales");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: customer, isLoading: loadingCustomer, refetch } = useGetCustomer(customerId);

  const { data: statement, refetch: refetchStatement } = useGetCustomerStatement(customerId);

  const { data: payments, refetch: refetchPayments } = useGetCustomerPayments(customerId);

  const { mutate: createPayment, isPending: payingDebt } = useCreateCustomerPayment({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) });
        queryClient.invalidateQueries({ queryKey: getGetCustomerPaymentsQueryKey(customerId) });
        queryClient.invalidateQueries({ queryKey: getGetCustomerStatementQueryKey(customerId) });
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setPaymentOpen(false);
        setPayAmount("");
        setPayNote("");
        setPayError(null);
      },
      onError: (err: Error) => {
        setPayError(err.message || "To'lovni saqlashda xatolik");
      },
    },
  });

  const { mutate: updateCustomer, isPending: updating } = useUpdateCustomer({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) });
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        setEditOpen(false);
        setEditError(null);
      },
      onError: (err: Error) => {
        setEditError(err.message || "Yangilashda xatolik");
      },
    },
  });

  const { mutate: deleteCustomer, isPending: deleting } = useDeleteCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        router.back();
      },
    },
  });

  const handlePayment = () => {
    setPayError(null);
    const amount = parseFloat(payAmount.replace(/\s/g, ""));
    if (isNaN(amount) || amount <= 0) {
      setPayError("To'g'ri summa kiriting");
      return;
    }
    createPayment({
      id: customerId,
      data: { amount, note: payNote.trim() || undefined },
    });
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const handleEdit = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditAddress(customer.address ?? "");
    setEditLimit(customer.debtLimit > 0 ? String(customer.debtLimit) : "");
    setEditNote(customer.note ?? "");
    setEditError(null);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) { setEditError("Ism kiritilishi shart"); return; }
    if (!editPhone.trim()) { setEditError("Telefon kiritilishi shart"); return; }
    const limit = editLimit ? parseFloat(editLimit.replace(/\s/g, "")) : 0;
    updateCustomer({
      id: customerId,
      data: {
        name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim() || undefined,
        debtLimit: isNaN(limit) ? 0 : limit,
        note: editNote.trim() || undefined,
      },
    });
  };

  const handlePdf = async () => {
    if (!statement) return;
    try {
      setPdfLoading(true);
      const primarySeller = settings.sellers[0];
      const html = buildStatementHtml(
        statement,
        settings.storeName,
        primarySeller?.name ?? "",
        primarySeller?.phone ?? "",
        settings.storeAddress
      );
      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
          win.print();
        }
      } else {
        await Print.printAsync({ html });
      }
    } finally {
      setPdfLoading(false);
    }
  };

  if (loadingCustomer || !customer) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  const debtSales = (statement?.sales ?? []).filter((s) => s.paymentType === "debt");
  const isOverLimit = customer.debtLimit > 0 && customer.totalDebt >= customer.debtLimit;
  const isNearLimit = customer.debtLimit > 0 && customer.totalDebt >= customer.debtLimit * 0.8;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
            {customer.name}
          </Text>
          <Text style={[styles.headerPhone, { color: colors.mutedForeground }]}>{customer.phone}</Text>
          {customer.address ? (
            <View style={styles.headerAddressRow}>
              <MaterialIcons name="location-on" size={12} color={colors.mutedForeground} />
              <Text style={[styles.headerAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
                {customer.address}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="edit" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Debt summary card */}
      <View style={[styles.debtCard, {
        backgroundColor: isOverLimit ? "#FEF2F2" : isNearLimit ? "#FFFBEB" : colors.card,
        borderColor: isOverLimit ? "#FECACA" : isNearLimit ? "#FDE68A" : colors.border,
      }]}>
        <View style={styles.debtCardRow}>
          <View>
            <Text style={[styles.debtLabel, { color: isOverLimit ? "#991B1B" : isNearLimit ? "#92400E" : colors.mutedForeground }]}>
              {isOverLimit ? "⚠ Qarz limiti oshdi!" : isNearLimit ? "⚠ Qarz limitga yaqin" : "Joriy qarz"}
            </Text>
            <Text style={[styles.debtTotal, { color: isOverLimit ? "#DC2626" : isNearLimit ? "#D97706" : colors.foreground }]}>
              {formatMoney(customer.totalDebt)}
            </Text>
            {customer.debtLimit > 0 && (
              <Text style={[styles.debtLimitLabel, { color: colors.mutedForeground }]}>
                Limit: {formatMoney(customer.debtLimit)}
              </Text>
            )}
          </View>

          <View style={styles.debtActions}>
            {customer.totalDebt > 0 && (
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: colors.success }]}
                onPress={() => { setPayAmount(""); setPayNote(""); setPayError(null); setPaymentOpen(true); }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="payments" size={18} color="#fff" />
                <Text style={styles.payBtnText}>To'lov qabul qilish</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.pdfBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={handlePdf}
              disabled={pdfLoading}
              activeOpacity={0.8}
            >
              {pdfLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <MaterialIcons name="picture-as-pdf" size={16} color={colors.primary} />
                  <Text style={[styles.pdfBtnText, { color: colors.primary }]}>Ko'chirma</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["sales", "payments"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, activeTab === t && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={t === "sales" ? "shopping-bag" : "payments"}
              size={16}
              color={activeTab === t ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "sales" ? `Qarzga sotuvlar (${debtSales.length})` : `To'lovlar (${payments?.length ?? 0})`}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.tabItem, styles.newSaleTab, { borderBottomColor: colors.success }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
              pathname: "/(tabs)/pos",
              params: { preCustomerId: customer.id, preCustomerName: customer.name },
            });
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add-shopping-cart" size={16} color={colors.success} />
          <Text style={[styles.tabText, { color: colors.success }]}>Yangi savdo</Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { refetch(); refetchStatement(); refetchPayments(); }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {activeTab === "sales" ? (
          debtSales.length === 0 ? (
            <View style={styles.emptyTab}>
              <MaterialIcons name="shopping-bag" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>Qarzga sotuv yo'q</Text>
            </View>
          ) : (
            debtSales.map((s) => (
              <View key={s.id} style={[styles.rowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.rowCardLeft}>
                  <MaterialIcons name="shopping-bag" size={18} color="#DC2626" />
                  <View>
                    <Text style={[styles.rowCardDate, { color: colors.mutedForeground }]}>{formatDate(s.createdAt)}</Text>
                    <Text style={[styles.rowCardMain, { color: colors.foreground }]}>
                      {s.itemCount} dona mahsulot
                    </Text>
                    {s.paidAmount != null && s.paidAmount > 0 && (
                      <Text style={[styles.rowCardSub, { color: colors.success }]}>
                        To'langan: {formatMoney(s.paidAmount)}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.rowCardRight}>
                  <Text style={[styles.rowCardTotal, { color: "#DC2626" }]}>
                    +{formatMoney(s.debtAmount ?? s.totalAmount)}
                  </Text>
                  <Text style={[styles.rowCardSub2, { color: colors.mutedForeground }]}>qarz</Text>
                </View>
              </View>
            ))
          )
        ) : (
          (payments?.length ?? 0) === 0 ? (
            <View style={styles.emptyTab}>
              <MaterialIcons name="payments" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>To'lov yo'q</Text>
            </View>
          ) : (
            (payments ?? []).map((p) => (
              <View key={p.id} style={[styles.rowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.rowCardLeft}>
                  <MaterialIcons name="payments" size={18} color={colors.success} />
                  <View>
                    <Text style={[styles.rowCardDate, { color: colors.mutedForeground }]}>{formatDate(p.createdAt)}</Text>
                    <Text style={[styles.rowCardMain, { color: colors.foreground }]}>
                      {p.note || "Qarz to'lovi"}
                    </Text>
                  </View>
                </View>
                <View style={styles.rowCardRight}>
                  <Text style={[styles.rowCardTotal, { color: colors.success }]}>
                    -{formatMoney(p.amount)}
                  </Text>
                  <Text style={[styles.rowCardSub2, { color: colors.mutedForeground }]}>to'lov</Text>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Payment modal */}
      <Modal
        visible={paymentOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => !payingDebt && setPaymentOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => !payingDebt && setPaymentOpen(false)}
        />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <MaterialIcons name="payments" size={24} color={colors.success} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>To'lov qabul qilish</Text>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Joriy qarz: {formatMoney(customer.totalDebt)}
            </Text>

            <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Summa (UZS) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Masalan: 500000"
              placeholderTextColor={colors.mutedForeground}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Izoh</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ixtiyoriy"
              placeholderTextColor={colors.mutedForeground}
              value={payNote}
              onChangeText={setPayNote}
            />

            {payError && (
              <View style={[styles.formError, { backgroundColor: "#FEE2E2", borderColor: "#F87171" }]}>
                <MaterialIcons name="error-outline" size={15} color="#DC2626" />
                <Text style={styles.formErrorText}>{payError}</Text>
              </View>
            )}

            <View style={styles.formBtns}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => setPaymentOpen(false)}
                disabled={payingDebt}
              >
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: payingDebt ? colors.mutedForeground : colors.success }]}
                onPress={handlePayment}
                disabled={payingDebt}
              >
                {payingDebt ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Saqlash</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit modal */}
      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => !updating && setEditOpen(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => !updating && setEditOpen(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <MaterialIcons name="edit" size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mijozni tahrirlash</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>To'liq ism *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Ism va familiya"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Telefon *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Yashash joyi</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Shahar, ko'cha, uy"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Qarz limiti (UZS)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                value={editLimit}
                onChangeText={setEditLimit}
                keyboardType="numeric"
                placeholder="0 = cheksiz"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Izoh</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="Ixtiyoriy"
                placeholderTextColor={colors.mutedForeground}
              />
              {editError && (
                <View style={[styles.formError, { backgroundColor: "#FEE2E2", borderColor: "#F87171" }]}>
                  <MaterialIcons name="error-outline" size={15} color="#DC2626" />
                  <Text style={styles.formErrorText}>{editError}</Text>
                </View>
              )}
              <View style={styles.formBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  onPress={() => setEditOpen(false)}
                  disabled={updating}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Bekor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: updating ? colors.mutedForeground : colors.primary }]}
                  onPress={handleSaveEdit}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Saqlash</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        visible={deleteConfirmOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !deleting && setDeleteConfirmOpen(false)}
      >
        <View style={styles.deleteBackdrop}>
          <View style={[styles.deleteSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.deleteIconWrap, { backgroundColor: "#FEE2E2" }]}>
              <MaterialIcons name="delete-forever" size={32} color="#DC2626" />
            </View>
            <Text style={[styles.deleteTitle, { color: colors.foreground }]}>
              Mijozni o'chirish
            </Text>
            <Text style={[styles.deleteMsg, { color: colors.mutedForeground }]}>
              <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>
                {customer?.name}
              </Text>
              {" "}ni o'chirishni tasdiqlaysizmi?{"\n"}Bu amalni qaytarib bo'lmaydi.
            </Text>
            <View style={styles.deleteBtns}>
              <TouchableOpacity
                style={[styles.deleteCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                activeOpacity={0.8}
              >
                <Text style={[styles.deleteCancelText, { color: colors.mutedForeground }]}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, { backgroundColor: deleting ? colors.mutedForeground : "#DC2626" }]}
                onPress={() => { setDeleteConfirmOpen(false); deleteCustomer({ id: customerId }); }}
                disabled={deleting}
                activeOpacity={0.85}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="delete" size={18} color="#fff" />
                    <Text style={styles.deleteConfirmText}>O'chirish</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerName: { fontFamily: "Inter_700Bold", fontSize: 17 },
  headerPhone: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: { padding: 6 },

  debtCard: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  debtCardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  debtLabel: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 4 },
  debtTotal: { fontFamily: "Inter_700Bold", fontSize: 22 },
  debtLimitLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  debtActions: { gap: 8, alignItems: "flex-end" },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  payBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  pdfBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginTop: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  rowCardLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  rowCardDate: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 2 },
  rowCardMain: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowCardSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  rowCardRight: { alignItems: "flex-end" },
  rowCardTotal: { fontFamily: "Inter_700Bold", fontSize: 15 },
  rowCardSub2: { fontFamily: "Inter_400Regular", fontSize: 11 },

  emptyTab: { alignItems: "center", justifyContent: "center", paddingTop: 40, gap: 12 },
  emptyTabText: { fontFamily: "Inter_500Medium", fontSize: 15 },

  // Modal
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalWrap: { position: "absolute", bottom: 0, left: 0, right: 0 },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "90%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    marginBottom: 14,
  },
  formError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  formErrorText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, color: "#DC2626" },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  saveBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  headerAddressRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  headerAddress: { fontFamily: "Inter_400Regular", fontSize: 11, flex: 1 },
  newSaleTab: { borderBottomWidth: 2 },
  // Delete modal
  deleteBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  deleteSheet: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    gap: 12,
  },
  deleteIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  deleteTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  deleteMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  deleteBtns: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  deleteCancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: "center",
  },
  deleteCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  deleteConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteConfirmText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});
