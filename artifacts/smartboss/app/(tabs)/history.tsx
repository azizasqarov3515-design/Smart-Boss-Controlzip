import {
  useGetSales,
  useGetCustomers,
  useDeleteSale,
  useBulkDeleteSales,
  useCreateDeleteRequest,
  getGetSalesQueryKey,
  getGetDashboardStatsQueryKey,
  getGetCustomersQueryKey,
  type SaleWithItems,
  type Customer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState, useCallback } from "react";
import { useSettings, type StoreSettings } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import type { PdfCustomer } from "@/utils/pdfTemplates";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  buildInvoiceHtml,
  buildReceiptHtml,
  buildWaybillHtml,
} from "@/utils/pdfTemplates";
import { generateAndSharePdf, type DocType } from "@/utils/generatePdf";

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

const DOC_ACTIONS: Array<{
  type: DocType;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
  bg: string;
}> = [
  { type: "invoice", icon: "receipt", label: "Faktura", color: "#1565C0", bg: "#EFF6FF" },
  { type: "receipt", icon: "point-of-sale", label: "Chek", color: "#065F46", bg: "#D1FAE5" },
  { type: "waybill", icon: "local-shipping", label: "Yuk xat", color: "#7C3AED", bg: "#EDE9FE" },
];

function getHtml(
  sale: SaleWithItems,
  docType: DocType,
  settings: StoreSettings,
  customer?: PdfCustomer | null
): string {
  if (docType === "invoice") return buildInvoiceHtml(sale, settings, customer);
  if (docType === "receipt") return buildReceiptHtml(sale, settings, customer);
  return buildWaybillHtml(sale, settings, customer);
}

function SaleCard({
  sale,
  colors,
  selectionMode,
  selected,
  onSelect,
  onLongPress,
  settings,
  customers,
}: {
  sale: SaleWithItems;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  selectionMode: boolean;
  selected: boolean;
  onSelect: (id: number) => void;
  onLongPress: (id: number) => void;
  settings: StoreSettings;
  customers?: Customer[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState<DocType | null>(null);

  const pdfCustomer: PdfCustomer | null = sale.customerId
    ? (() => {
        const found = customers?.find((c) => c.id === sale.customerId);
        if (!found) return null;
        return { id: found.id, name: found.name, phone: found.phone ?? "" };
      })()
    : null;

  const handleDoc = async (type: DocType) => {
    setLoadingDoc(type);
    try {
      await generateAndSharePdf(getHtml(sale, type, settings, pdfCustomer), sale.id, type);
    } finally {
      setLoadingDoc(null);
    }
  };

  const payTypeLabel: Record<string, string> = { cash: "Naqd", card: "Karta", debt: "Nasiya" };
  const payTypeBg: Record<string, string> = { cash: "#D1FAE5", card: "#DBEAFE", debt: "#FEF3C7" };
  const payTypeColor: Record<string, string> = { cash: "#065F46", card: "#1E40AF", debt: "#92400E" };

  return (
    <TouchableOpacity
      style={[
        styles.saleCard,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={() => selectionMode ? onSelect(sale.id) : setExpanded((v) => !v)}
      onLongPress={() => { Haptics.selectionAsync(); onLongPress(sale.id); }}
      activeOpacity={0.82}
    >
      <View style={styles.saleHeader}>
        {selectionMode && (
          <View style={[styles.checkbox, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>
            {selected && <MaterialIcons name="check" size={14} color="#fff" />}
          </View>
        )}
        <View style={[styles.saleIdBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.saleIdText}>#{sale.id}</Text>
        </View>
        <View style={styles.saleInfo}>
          <Text style={[styles.saleDate, { color: colors.mutedForeground }]}>{formatDate(sale.createdAt)}</Text>
          <Text style={[styles.saleTotal, { color: colors.success }]}>{formatMoney(sale.totalAmount)}</Text>
          {sale.customerName && (
            <Text style={[styles.customerLabel, { color: colors.mutedForeground }]}>
              <MaterialIcons name="person" size={11} /> {sale.customerName}
            </Text>
          )}
        </View>
        <View style={styles.saleRight}>
          <View style={[styles.itemCountBadge, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialIcons name="shopping-cart" size={12} color={colors.mutedForeground} />
            <Text style={[styles.itemCountText, { color: colors.mutedForeground }]}>{sale.itemCount} dona</Text>
          </View>
          {sale.paymentType && (
            <View style={[styles.payTypeBadge, { backgroundColor: payTypeBg[sale.paymentType] ?? "#F3F4F6" }]}>
              <Text style={[styles.payTypeText, { color: payTypeColor[sale.paymentType] ?? "#374151" }]}>
                {payTypeLabel[sale.paymentType] ?? sale.paymentType}
              </Text>
            </View>
          )}
        </View>
      </View>

      {expanded && (
        <>
          <View style={[styles.docRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.docRowLabel, { color: colors.mutedForeground }]}>Hujjat:</Text>
            {DOC_ACTIONS.map((d) => (
              <TouchableOpacity
                key={d.type}
                style={[styles.docBtn, { backgroundColor: d.bg, borderColor: d.color + "30" }]}
                onPress={() => handleDoc(d.type)}
                disabled={loadingDoc !== null}
                activeOpacity={0.8}
              >
                {loadingDoc === d.type ? (
                  <ActivityIndicator size="small" color={d.color} />
                ) : (
                  <MaterialIcons name={d.icon} size={14} color={d.color} />
                )}
                <Text style={[styles.docBtnText, { color: d.color }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.itemsList}>
            {sale.items.map((item, i) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  {
                    backgroundColor: i % 2 === 0 ? colors.muted : colors.card,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.itemLeft}>
                  {item.productId != null && (
                    <View style={[styles.itemIdBadge, { backgroundColor: colors.surfaceVariant }]}>
                      <Text style={[styles.itemIdText, { color: colors.mutedForeground }]}>#{item.productId}</Text>
                    </View>
                  )}
                  <View style={styles.itemNames}>
                    <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{item.productName}</Text>
                    <Text style={[styles.itemBrand, { color: colors.mutedForeground }]}>{item.brand}</Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>{item.quantity} × {item.unitPrice.toLocaleString()}</Text>
                  <Text style={[styles.itemTotal, { color: colors.primary }]}>{formatMoney(item.totalPrice)}</Text>
                </View>
              </View>
            ))}
          </View>

          {sale.note ? (
            <View style={[styles.noteRow, { borderTopColor: colors.border }]}>
              <MaterialIcons name="notes" size={14} color={colors.mutedForeground} />
              <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{sale.note}</Text>
            </View>
          ) : null}

          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Jami to'lov:</Text>
            <Text style={[styles.totalVal, { color: colors.success }]}>{formatMoney(sale.totalAmount)}</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

type ConfirmType = "selected" | "all" | null;

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();
  const { role, workerName } = useAuth();
  const isWorker = role === "worker";

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmType, setConfirmType] = useState<ConfirmType>(null);
  const [workerRequestModal, setWorkerRequestModal] = useState<"selected" | "all" | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const { data: sales, isLoading, refetch, isRefetching } = useGetSales();
  const { data: customers } = useGetCustomers();
  const { settings } = useSettings();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
  }, [queryClient]);

  const { mutate: bulkDelete, isPending: bulkDeleting } = useBulkDeleteSales({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        invalidateAll();
        setSelectedIds(new Set());
        setSelectionMode(false);
        setConfirmType(null);
      },
    },
  });

  const { mutate: createDeleteRequest, isPending: sendingRequest } = useCreateDeleteRequest({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setRequestSuccess(true);
        setSelectedIds(new Set());
        setSelectionMode(false);
        setTimeout(() => {
          setWorkerRequestModal(null);
          setRequestSuccess(false);
        }, 2000);
      },
      onError: () => {
        setRequestError("So'rov yuborishda xato. Qayta urinib ko'ring.");
      },
    },
  });

  const totalRevenue = (sales ?? []).reduce((s, sale) => s + sale.totalAmount, 0);
  const todaySales = (sales ?? []).filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.totalAmount, 0);

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLongPress = useCallback((id: number) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const handleSelectAll = () => {
    if (!sales) return;
    if (selectedIds.size === sales.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sales.map((s) => s.id)));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleConfirmDelete = () => {
    if (confirmType === "all") {
      bulkDelete({ data: { deleteAll: true } });
    } else if (confirmType === "selected") {
      bulkDelete({ data: { ids: Array.from(selectedIds) } });
    }
  };

  const handleSendWorkerRequest = () => {
    setRequestError(null);
    let ids: number[] = [];
    if (workerRequestModal === "all") {
      ids = (sales ?? []).map((s) => s.id);
    } else {
      ids = Array.from(selectedIds);
    }
    if (ids.length === 0) return;
    createDeleteRequest({ data: { saleIds: ids } });
  };

  const allSelected = (sales?.length ?? 0) > 0 && selectedIds.size === (sales?.length ?? 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Selection action bar */}
      {selectionMode ? (
        <View style={[styles.selectionBar, { backgroundColor: colors.primary, paddingTop: isWeb ? 16 : 10 }]}>
          <TouchableOpacity style={styles.selBarBtn} onPress={exitSelectionMode} activeOpacity={0.8}>
            <MaterialIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.selBarTitle}>{selectedIds.size} ta tanlandi</Text>
          <TouchableOpacity style={styles.selBarBtn} onPress={handleSelectAll} activeOpacity={0.8}>
            <MaterialIcons name={allSelected ? "deselect" : "select-all"} size={22} color="#fff" />
            <Text style={styles.selBarBtnText}>{allSelected ? "Barchani bekor" : "Barchasi"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.summaryBar, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: isWeb ? 16 : 12 }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Jami savdolar</Text>
            <Text style={[styles.summaryVal, { color: colors.foreground }]}>{sales?.length ?? 0} ta</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Bugungi tushum</Text>
            <Text style={[styles.summaryVal, { color: colors.success }]}>{formatMoney(todayRevenue)}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Jami tushum</Text>
            <Text style={[styles.summaryVal, { color: colors.primary }]}>{formatMoney(totalRevenue)}</Text>
          </View>
        </View>
      )}

      {/* Action toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {selectionMode ? (
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: isWorker ? "#FEF3C7" : colors.muted, borderColor: isWorker ? "#FCD34D" : colors.border, opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
            disabled={selectedIds.size === 0 || bulkDeleting || sendingRequest}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (isWorker) { setRequestError(null); setRequestSuccess(false); setWorkerRequestModal("selected"); }
              else setConfirmType("selected");
            }}
            activeOpacity={0.8}
          >
            {(bulkDeleting || sendingRequest) ? (
              <ActivityIndicator size="small" color={isWorker ? "#92400E" : "#DC2626"} />
            ) : (
              <MaterialIcons name={isWorker ? "send" : "delete-sweep"} size={18} color={isWorker ? "#92400E" : "#DC2626"} />
            )}
            <Text style={[styles.toolBtnText, { color: isWorker ? "#92400E" : "#DC2626" }]}>
              {isWorker ? `So'rov (${selectedIds.size})` : `O'chirish (${selectedIds.size})`}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text style={[styles.legendHint, { color: colors.mutedForeground }]}>
                <MaterialIcons name="touch-app" size={12} color={colors.mutedForeground} /> Uzoq bosish → tanlash
              </Text>
            </View>
            {isWorker ? (
              <TouchableOpacity
                style={[styles.toolBtn, { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setRequestError(null); setRequestSuccess(false); setWorkerRequestModal("all"); }}
                disabled={!sales || sales.length === 0}
                activeOpacity={0.8}
              >
                <MaterialIcons name="send" size={18} color="#92400E" />
                <Text style={[styles.toolBtnText, { color: "#92400E" }]}>Hammasini so'rash</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.toolBtn, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setConfirmType("all"); }}
                disabled={!sales || sales.length === 0}
                activeOpacity={0.8}
              >
                <MaterialIcons name="delete-forever" size={18} color="#DC2626" />
                <Text style={[styles.toolBtnText, { color: "#DC2626" }]}>Hammasini o'chirish</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectionMode(true); }}
              disabled={!sales || sales.length === 0}
              activeOpacity={0.8}
            >
              <MaterialIcons name="checklist" size={18} color={colors.primary} />
              <Text style={[styles.toolBtnText, { color: colors.primary }]}>Tanlash</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Yuklanmoqda...</Text>
        </View>
      ) : (sales?.length ?? 0) === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt-long" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Tranzaksiyalar yo'q</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Kassa bo'limidan birinchi sotuvni amalga oshiring</Text>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SaleCard
              sale={item}
              colors={colors}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onSelect={handleToggleSelect}
              onLongPress={handleLongPress}
              settings={settings}
              customers={customers}
            />
          )}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Manager: Delete confirmation modal */}
      <Modal
        visible={confirmType !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !bulkDeleting && setConfirmType(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="delete-forever" size={36} color="#DC2626" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {confirmType === "all" ? "Barchasini o'chirish" : `${selectedIds.size} ta sotuvni o'chirish`}
            </Text>
            <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
              {confirmType === "all"
                ? `Barcha ${sales?.length ?? 0} ta savdo tarixi o'chiriladi. Mahsulot stoki tiklanadi.`
                : `Tanlangan ${selectedIds.size} ta savdo o'chiriladi. Mahsulot stoki tiklanadi.`}
              {"\n"}
              <Text style={{ color: "#DC2626", fontFamily: "Inter_600SemiBold" }}>Bu amalni qaytarib bo'lmaydi!</Text>
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => setConfirmType(null)}
                disabled={bulkDeleting}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteBtn, { backgroundColor: bulkDeleting ? "#FECACA" : "#DC2626" }]}
                onPress={handleConfirmDelete}
                disabled={bulkDeleting}
                activeOpacity={0.85}
              >
                {bulkDeleting ? <ActivityIndicator size="small" color="#DC2626" /> : (
                  <><MaterialIcons name="delete" size={18} color="#fff" /><Text style={styles.modalDeleteText}>O'chirish</Text></>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Worker: Delete request modal */}
      <Modal
        visible={workerRequestModal !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !sendingRequest && !requestSuccess && setWorkerRequestModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            {requestSuccess ? (
              <>
                <View style={[styles.modalIconWrap, { backgroundColor: "#D1FAE5" }]}>
                  <MaterialIcons name="check-circle" size={40} color="#059669" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>So'rov yuborildi!</Text>
                <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
                  Rahbar so'rovni ko'rib chiqib, tasdiqlasa ma'lumotlar o'chiriladi.
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.modalIconWrap, { backgroundColor: "#FEF3C7" }]}>
                  <MaterialIcons name="send" size={36} color="#D97706" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>O'chirish so'rovi</Text>
                <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
                  {workerRequestModal === "all"
                    ? `Barcha ${sales?.length ?? 0} ta savdo uchun rahbarga o'chirish so'rovi yuboriladi.`
                    : `Tanlangan ${selectedIds.size} ta savdo uchun rahbarga o'chirish so'rovi yuboriladi.`}
                  {"\n"}
                  <Text style={{ color: "#92400E", fontFamily: "Inter_600SemiBold" }}>
                    Rahbar tasdig'idan keyingina o'chiriladi.
                  </Text>
                </Text>
                {workerRequestModal !== null && (
                  <View style={[styles.workerInfoRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <MaterialIcons name="badge" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.workerInfoText, { color: colors.mutedForeground }]}>{workerName}</Text>
                  </View>
                )}
                {requestError && (
                  <View style={styles.reqErrorRow}>
                    <MaterialIcons name="error-outline" size={15} color="#DC2626" />
                    <Text style={styles.reqErrorText}>{requestError}</Text>
                  </View>
                )}
                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    onPress={() => setWorkerRequestModal(null)}
                    disabled={sendingRequest}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Bekor</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalDeleteBtn, { backgroundColor: sendingRequest ? "#FDE68A" : "#D97706" }]}
                    onPress={handleSendWorkerRequest}
                    disabled={sendingRequest}
                    activeOpacity={0.85}
                  >
                    {sendingRequest ? <ActivityIndicator size="small" color="#92400E" /> : (
                      <><MaterialIcons name="send" size={18} color="#fff" /><Text style={styles.modalDeleteText}>Yuborish</Text></>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  selectionBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  selBarBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
  selBarBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  selBarTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff", textAlign: "center" },
  summaryBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 2, textAlign: "center" },
  summaryVal: { fontFamily: "Inter_700Bold", fontSize: 13, textAlign: "center" },
  summaryDivider: { width: 1, height: 36 },
  toolbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  legendHint: { fontFamily: "Inter_400Regular", fontSize: 11 },
  toolBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  toolBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 8 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  saleCard: { borderRadius: 14, marginBottom: 10, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  saleHeader: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  saleIdBadge: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  saleIdText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
  saleInfo: { flex: 1 },
  saleDate: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 1 },
  saleTotal: { fontFamily: "Inter_700Bold", fontSize: 16 },
  customerLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  saleRight: { alignItems: "flex-end", gap: 4 },
  itemCountBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  itemCountText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  payTypeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  payTypeText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  docRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, gap: 6, flexWrap: "wrap" },
  docRowLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginRight: 2 },
  docBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, borderWidth: 1, minWidth: 82, justifyContent: "center" },
  docBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  itemsList: { borderTopWidth: 1 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1 },
  itemLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 8 },
  itemIdBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  itemIdText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  itemNames: { flex: 1 },
  itemName: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  itemBrand: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  itemRight: { alignItems: "flex-end" },
  itemQty: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 2 },
  itemTotal: { fontFamily: "Inter_700Bold", fontSize: 13 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
  noteText: { fontFamily: "Inter_400Regular", fontSize: 12, fontStyle: "italic" },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  totalLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  totalVal: { fontFamily: "Inter_700Bold", fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalSheet: { borderRadius: 20, padding: 24, alignItems: "center", width: "100%", maxWidth: 360, gap: 12 },
  modalIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" },
  modalMsg: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 21 },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  modalCancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 13, alignItems: "center" },
  modalCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  modalDeleteBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  modalDeleteText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  workerInfoRow: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  workerInfoText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  reqErrorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  reqErrorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#DC2626", flex: 1 },
});
