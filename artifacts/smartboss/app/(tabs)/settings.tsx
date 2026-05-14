import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useSettings, type Seller, type StoreSettings } from "@/hooks/useSettings";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { WebRefreshBar } from "@/components/WebRefreshBar";
import {
  useGetWorkers,
  useApproveWorker,
  useRejectWorker,
  useRemoveWorker,
  useGetDeleteRequests,
  useApproveDeleteRequest,
  useRejectDeleteRequest,
  getGetWorkersQueryKey,
  getGetDeleteRequestsQueryKey,
  getGetSalesQueryKey,
  getGetDashboardStatsQueryKey,
  getGetProductsQueryKey,
  type Worker,
  type DeleteRequest,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function SectionCard({
  title,
  icon,
  children,
  colors,
  badge,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  badge?: number;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.sectionIconWrap, { backgroundColor: colors.primary + "18" }]}>
          <MaterialIcons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {badge != null && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: "#DC2626" }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad";
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}

function WorkerStatusBadge({ status, colors }: { status: string; colors: ReturnType<typeof useColors> }) {
  const map = {
    pending: { bg: "#FEF3C7", text: "#92400E", label: "Kutmoqda" },
    approved: { bg: "#D1FAE5", text: "#065F46", label: "Tasdiqlangan" },
    rejected: { bg: "#FEE2E2", text: "#991B1B", label: "Rad etilgan" },
  };
  const s = map[status as keyof typeof map] ?? map.pending;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusBadgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

function WorkersSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workers, isLoading, refetch, isRefetching } = useGetWorkers({ query: { refetchInterval: 15000 } as any });
  const [removeConfirm, setRemoveConfirm] = useState<Worker | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetWorkersQueryKey() });
  };

  const { mutate: approve, isPending: approving } = useApproveWorker({
    mutation: { onSuccess: invalidate },
  });
  const { mutate: reject, isPending: rejecting } = useRejectWorker({
    mutation: { onSuccess: invalidate },
  });
  const { mutate: remove, isPending: removing } = useRemoveWorker({
    mutation: {
      onSuccess: () => {
        setRemoveConfirm(null);
        invalidate();
      },
    },
  });

  const pending = (workers ?? []).filter((w) => w.status === "pending");
  const others = (workers ?? []).filter((w) => w.status !== "pending");

  if (isLoading) return (
    <View style={styles.centerRow}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );

  return (
    <View style={{ gap: 12 }}>
      {pending.length > 0 && (
        <View>
          <Text style={[styles.subSectionLabel, { color: colors.mutedForeground }]}>Kutayotgan arizalar</Text>
          {pending.map((w) => (
            <View key={w.id} style={[styles.pendingWorkerCard, { backgroundColor: "#FFFBEB", borderColor: "#F59E0B" }]}>
              {/* Worker info */}
              <View style={styles.pendingWorkerTop}>
                <View style={[styles.workerAvatar, { backgroundColor: "#FDE68A" }]}>
                  <Text style={[styles.workerAvatarText, { color: "#92400E" }]}>{w.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.workerInfo}>
                  <Text style={[styles.workerName, { color: colors.foreground }]}>{w.name}</Text>
                  <Text style={[styles.workerPhone, { color: colors.mutedForeground }]}>{w.phone}</Text>
                  <Text style={[styles.workerAddress, { color: colors.mutedForeground }]} numberOfLines={1}>{w.address}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.pendingDeleteBtn, { backgroundColor: "#F3F4F6" }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setRemoveConfirm(w); }}
                  activeOpacity={0.8}
                  disabled={approving || rejecting || removing}
                >
                  <MaterialIcons name="delete-outline" size={19} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Approve / Reject action buttons */}
              <View style={styles.pendingWorkerBtns}>
                <TouchableOpacity
                  style={[styles.approveBtn, { opacity: (approving || rejecting || removing) ? 0.65 : 1 }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); approve({ id: w.id }); }}
                  activeOpacity={0.85}
                  disabled={approving || rejecting || removing}
                >
                  {approving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <MaterialIcons name="check-circle" size={24} color="#fff" />
                  }
                  <Text style={styles.approveBtnText}>Tasdiqlash</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rejectBtn, { opacity: (approving || rejecting || removing) ? 0.65 : 1 }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); reject({ id: w.id }); }}
                  activeOpacity={0.85}
                  disabled={approving || rejecting || removing}
                >
                  {rejecting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <MaterialIcons name="cancel" size={24} color="#fff" />
                  }
                  <Text style={styles.rejectBtnText}>Rad etish</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {others.length > 0 && (
        <View>
          <Text style={[styles.subSectionLabel, { color: colors.mutedForeground }]}>Barcha ishchilar</Text>
          {others.map((w) => {
            const isOnline = (w as any).isOnline === true;
            const lastSeen = (w as any).lastSeen as string | null;
            const lastSeenLabel = lastSeen
              ? new Date(lastSeen).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
              : null;
            return (
              <View key={w.id} style={[styles.workerRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={{ position: "relative" }}>
                  <View style={[styles.workerAvatar, { backgroundColor: colors.primary + "22" }]}>
                    <Text style={[styles.workerAvatarText, { color: colors.primary }]}>{w.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 11, height: 11, borderRadius: 6,
                    backgroundColor: isOnline ? "#22C55E" : "#EF4444",
                    borderWidth: 2, borderColor: colors.muted,
                  }} />
                </View>
                <View style={styles.workerInfo}>
                  <View style={styles.workerNameRow}>
                    <Text style={[styles.workerName, { color: colors.foreground }]}>{w.name}</Text>
                    <WorkerStatusBadge status={w.status} colors={colors} />
                  </View>
                  <Text style={[styles.workerPhone, { color: colors.mutedForeground }]}>{w.phone}</Text>
                  {!isOnline && lastSeenLabel && (
                    <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                      So'nggi: {lastSeenLabel}
                    </Text>
                  )}
                  {isOnline && (
                    <Text style={{ fontSize: 10, color: "#16A34A", fontFamily: "Inter_500Medium" }}>
                      Online
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setRemoveConfirm(w); }}
                  activeOpacity={0.8}
                  disabled={removing}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {(workers ?? []).length === 0 && (
        <View style={styles.emptyRow}>
          <MaterialIcons name="person-off" size={32} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Hali ishchi yo'q</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.refreshBtn, { borderColor: colors.border, opacity: isRefetching ? 0.6 : 1 }]}
        onPress={() => { Haptics.selectionAsync(); refetch(); }}
        activeOpacity={0.8}
        disabled={isRefetching}
      >
        {isRefetching
          ? <ActivityIndicator size="small" color={colors.mutedForeground} />
          : <MaterialIcons name="refresh" size={16} color={colors.mutedForeground} />
        }
        <Text style={[styles.refreshBtnText, { color: colors.mutedForeground }]}>
          {isRefetching ? "Yangilanmoqda..." : "Yangilash"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={!!removeConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setRemoveConfirm(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#FEE2E2" }]}>
              <MaterialIcons name="delete-forever" size={28} color="#DC2626" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Ishchini o'chirish</Text>
            <Text style={[styles.confirmMsg, { color: colors.mutedForeground }]}>
              <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>{removeConfirm?.name}</Text>
              {" "}ni tizimdan butunlay o'chirasizmi? Bu amalni qaytarib bo'lmaydi.
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => setRemoveConfirm(null)}
                activeOpacity={0.8}
                disabled={removing}
              >
                <Text style={[styles.confirmCancelText, { color: colors.mutedForeground }]}>Yo'q</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, { backgroundColor: "#DC2626" }]}
                onPress={() => removeConfirm && remove({ id: removeConfirm.id })}
                activeOpacity={0.85}
                disabled={removing}
              >
                {removing ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="delete-forever" size={16} color="#fff" />}
                <Text style={styles.confirmDeleteText}>Ha, o'chirish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DeleteRequestsSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requests, isLoading, refetch, isRefetching } = useGetDeleteRequests({ query: { refetchInterval: 10000 } as any });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetDeleteRequestsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
  };

  const { mutate: approve, isPending: approving } = useApproveDeleteRequest({
    mutation: { onSuccess: invalidate },
  });
  const { mutate: reject, isPending: rejecting } = useRejectDeleteRequest({
    mutation: { onSuccess: invalidate },
  });

  if (isLoading) return (
    <View style={styles.centerRow}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );

  if ((requests ?? []).length === 0) return (
    <View style={styles.emptyRow}>
      <MaterialIcons name="inbox" size={32} color={colors.border} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>O'chirish so'rovlari yo'q</Text>
    </View>
  );

  return (
    <View style={{ gap: 10 }}>
      {(requests ?? []).map((r: DeleteRequest) => {
        const isProduct = r.type === "product";
        const isCustomer = r.type === "customer";
        const productNames = (r as any).productNames as string[] | null;
        const customerNames = (r as any).customerNames as string[] | null;
        const saleIds = r.saleIds as number[];

        let bgColor = "#FFF7ED";
        let borderColor = "#FDBA74";
        let iconName: React.ComponentProps<typeof MaterialIcons>["name"] = "delete-sweep";
        let iconColor = "#EA580C";
        if (isProduct) { bgColor = "#F0FDF4"; borderColor = "#86EFAC"; iconName = "inventory-2"; iconColor = "#16A34A"; }
        if (isCustomer) { bgColor = "#EFF6FF"; borderColor = "#93C5FD"; iconName = "person-remove"; iconColor = "#1D4ED8"; }

        return (
          <View key={r.id} style={[
            styles.requestRow,
            { backgroundColor: bgColor, borderColor }
          ]}>
            <View style={styles.requestTop}>
              <MaterialIcons name={iconName} size={18} color={iconColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.requestWorker, { color: colors.foreground }]}>{r.workerName}</Text>
                {isProduct ? (
                  <Text style={[styles.requestSub, { color: colors.mutedForeground }]}>
                    Mahsulot o'chirish:{" "}
                    <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                      {productNames?.join(", ") ?? "Mahsulot"}
                    </Text>
                  </Text>
                ) : isCustomer ? (
                  <Text style={[styles.requestSub, { color: colors.mutedForeground }]}>
                    Mijoz o'chirish:{" "}
                    <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                      {customerNames?.join(", ") ?? "Mijoz"}
                    </Text>
                  </Text>
                ) : (
                  <Text style={[styles.requestSub, { color: colors.mutedForeground }]}>
                    {saleIds.length} ta savdo o'chirish so'rovi
                  </Text>
                )}
              </View>
              <Text style={[styles.requestDate, { color: colors.mutedForeground }]}>
                {new Date(r.createdAt).toLocaleDateString("uz-UZ")}
              </Text>
            </View>
            <View style={styles.requestBtns}>
              <TouchableOpacity
                style={[styles.reqBtn, { backgroundColor: "#D1FAE5", flex: 1 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); approve({ id: r.id }); }}
                disabled={approving || rejecting}
                activeOpacity={0.8}
              >
                {approving
                  ? <ActivityIndicator size="small" color="#065F46" />
                  : <MaterialIcons name="check" size={16} color="#065F46" />
                }
                <Text style={[styles.reqBtnText, { color: "#065F46" }]}>Ha</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reqBtn, { backgroundColor: "#FEE2E2", flex: 1 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); reject({ id: r.id }); }}
                disabled={approving || rejecting}
                activeOpacity={0.8}
              >
                {rejecting
                  ? <ActivityIndicator size="small" color="#DC2626" />
                  : <MaterialIcons name="close" size={16} color="#DC2626" />
                }
                <Text style={[styles.reqBtnText, { color: "#DC2626" }]}>Yo'q</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <TouchableOpacity
        style={[styles.refreshBtn, { borderColor: colors.border, opacity: isRefetching ? 0.6 : 1 }]}
        onPress={() => { Haptics.selectionAsync(); refetch(); }}
        activeOpacity={0.8}
        disabled={isRefetching}
      >
        {isRefetching
          ? <ActivityIndicator size="small" color={colors.mutedForeground} />
          : <MaterialIcons name="refresh" size={16} color={colors.mutedForeground} />
        }
        <Text style={[styles.refreshBtnText, { color: colors.mutedForeground }]}>
          {isRefetching ? "Yangilanmoqda..." : "Yangilash"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Subscription Info Card ───────────────────────────────────────────────────
function SubscriptionInfoCard({
  plan, active, daysLeft, endDate, colors,
}: {
  plan: string | null;
  active: boolean;
  daysLeft: number | null;
  endDate: Date | null;
  colors: ReturnType<typeof useColors>;
}) {
  const isUnlimited = plan === "unlimited";

  const planLabels: Record<string, string> = {
    "1m": "1 oylik obuna",
    "3m": "3 oylik obuna",
    "6m": "6 oylik obuna",
    "1y": "1 yillik obuna",
    unlimited: "Cheksiz obuna",
  };

  const planTotalDays: Record<string, number> = {
    "1m": 30, "3m": 90, "6m": 180, "1y": 365,
  };

  const planLabel = plan ? (planLabels[plan] ?? plan) : "Obuna yo'q";

  // Determine color scheme
  let accentColor = "#6B7280";
  let bgColor = "#F9FAFB";
  let iconName: React.ComponentProps<typeof MaterialIcons>["name"] = "info-outline";

  if (!plan || !active) {
    accentColor = "#DC2626"; bgColor = "#FEF2F2"; iconName = "block";
  } else if (isUnlimited) {
    accentColor = "#7C3AED"; bgColor = "#F5F3FF"; iconName = "all-inclusive";
  } else if (daysLeft !== null && daysLeft <= 0) {
    accentColor = "#DC2626"; bgColor = "#FEF2F2"; iconName = "event-busy";
  } else if (daysLeft !== null && daysLeft <= 3) {
    accentColor = "#EA580C"; bgColor = "#FFF7ED"; iconName = "schedule";
  } else if (daysLeft !== null && daysLeft <= 14) {
    accentColor = "#D97706"; bgColor = "#FFFBEB"; iconName = "timer";
  } else {
    accentColor = "#16A34A"; bgColor = "#F0FDF4"; iconName = "verified";
  }

  const totalDays = plan ? (planTotalDays[plan] ?? null) : null;
  const usedDays = (totalDays !== null && daysLeft !== null) ? Math.max(0, totalDays - daysLeft) : null;
  const progressRatio = (totalDays && usedDays !== null) ? Math.min(1, usedDays / totalDays) : null;

  const fmtDate = (d: Date | null) => {
    if (!d) return "—";
    return d.toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <View style={[subStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={[subStyles.cardHeader, { backgroundColor: accentColor + "18", borderBottomColor: colors.border }]}>
        <View style={[subStyles.headerIconWrap, { backgroundColor: accentColor + "22" }]}>
          <MaterialIcons name={iconName} size={20} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[subStyles.headerLabel, { color: colors.mutedForeground }]}>Obuna holati</Text>
          <Text style={[subStyles.headerTitle, { color: colors.foreground }]}>{planLabel}</Text>
        </View>
        <View style={[subStyles.statusPill, { backgroundColor: active ? accentColor + "22" : "#FEE2E2" }]}>
          <View style={[subStyles.statusDot, { backgroundColor: active ? accentColor : "#DC2626" }]} />
          <Text style={[subStyles.statusText, { color: active ? accentColor : "#DC2626" }]}>
            {active ? "Faol" : "Faol emas"}
          </Text>
        </View>
      </View>

      <View style={subStyles.cardBody}>
        {/* Days left big display */}
        {!isUnlimited && plan && (
          <View style={[subStyles.daysBlock, { backgroundColor: bgColor, borderColor: accentColor + "33" }]}>
            {daysLeft !== null && daysLeft > 0 ? (
              <>
                <Text style={[subStyles.daysNumber, { color: accentColor }]}>{daysLeft}</Text>
                <Text style={[subStyles.daysLabel, { color: accentColor }]}>kun qoldi</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="event-busy" size={32} color={accentColor} />
                <Text style={[subStyles.daysLabel, { color: accentColor, marginTop: 4 }]}>
                  {!active ? "Faolsizlantirilgan" : "Muddati tugagan"}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Unlimited big display */}
        {isUnlimited && (
          <View style={[subStyles.daysBlock, { backgroundColor: "#F5F3FF", borderColor: "#7C3AED33" }]}>
            <Text style={[subStyles.infinitySymbol, { color: "#7C3AED" }]}>∞</Text>
            <Text style={[subStyles.daysLabel, { color: "#7C3AED" }]}>Cheksiz foydalanish</Text>
          </View>
        )}

        {/* No plan */}
        {!plan && (
          <View style={[subStyles.daysBlock, { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }]}>
            <MaterialIcons name="subscriptions" size={32} color={colors.border} />
            <Text style={[subStyles.daysLabel, { color: colors.mutedForeground, marginTop: 4 }]}>Obuna ulanmagan</Text>
          </View>
        )}

        {/* Progress bar for timed plans */}
        {!isUnlimited && progressRatio !== null && daysLeft !== null && daysLeft > 0 && (
          <View style={subStyles.progressSection}>
            <View style={[subStyles.progressTrack, { backgroundColor: colors.muted }]}>
              <View style={[subStyles.progressFill, { width: `${progressRatio * 100}%` as any, backgroundColor: accentColor }]} />
            </View>
            <View style={subStyles.progressLabels}>
              <Text style={[subStyles.progressLabelText, { color: colors.mutedForeground }]}>
                {usedDays} kun ishlatildi
              </Text>
              <Text style={[subStyles.progressLabelText, { color: colors.mutedForeground }]}>
                {totalDays} kundan
              </Text>
            </View>
          </View>
        )}

        {/* Info rows */}
        <View style={[subStyles.infoGrid, { borderTopColor: colors.border }]}>
          <View style={subStyles.infoRow}>
            <MaterialIcons name="event" size={15} color={colors.mutedForeground} />
            <Text style={[subStyles.infoRowLabel, { color: colors.mutedForeground }]}>Tugash sanasi</Text>
            <Text style={[subStyles.infoRowValue, { color: colors.foreground }]}>
              {isUnlimited ? "Belgilanmagan" : fmtDate(endDate)}
            </Text>
          </View>
          <View style={[subStyles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <MaterialIcons name="workspace-premium" size={15} color={colors.mutedForeground} />
            <Text style={[subStyles.infoRowLabel, { color: colors.mutedForeground }]}>Tarif rejasi</Text>
            <Text style={[subStyles.infoRowValue, { color: accentColor, fontFamily: "Inter_700Bold" }]}>
              {plan ? planLabel.replace(" obuna", "") : "—"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const subStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  headerIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 1 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  cardBody: { padding: 14, gap: 12 },
  daysBlock: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: "center", justifyContent: "center", minHeight: 90 },
  daysNumber: { fontFamily: "Inter_700Bold", fontSize: 52, lineHeight: 60 },
  infinitySymbol: { fontFamily: "Inter_700Bold", fontSize: 56, lineHeight: 64 },
  daysLabel: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 2 },
  progressSection: { gap: 6 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressLabelText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  infoGrid: { borderTopWidth: 1, paddingTop: 12, gap: 0 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  infoRowLabel: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  infoRowValue: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { role, managerId, managerLogin, managerStoreId, deleteAccount, subscriptionPlan, subscriptionEnd, subscriptionDaysLeft, subscriptionActive } = useAuth();
  const { settings, saveSettings, isLoading } = useSettings(managerId);
  const queryClient = useQueryClient();

  const [storeName, setStoreName] = useState("");
  const [storeSubtitle, setStoreSubtitle] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [managerRefreshing, setManagerRefreshing] = useState(false);

  const [sellerModal, setSellerModal] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [deleteSellerConfirm, setDeleteSellerConfirm] = useState<Seller | null>(null);

  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const [showCredLogin, setShowCredLogin] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pendingWorkers } = useGetWorkers({ query: { enabled: role === "manager", refetchInterval: 15000, select: (d: Worker[]) => d.filter((w) => w.status === "pending") } as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pendingDeleteReqs } = useGetDeleteRequests({ query: { enabled: role === "manager", refetchInterval: 15000 } as any });

  const handleManagerRefresh = async () => {
    setManagerRefreshing(true);
    Haptics.selectionAsync();
    await Promise.all([
      queryClient.refetchQueries({ queryKey: getGetWorkersQueryKey() }),
      queryClient.refetchQueries({ queryKey: getGetDeleteRequestsQueryKey() }),
    ]);
    setManagerRefreshing(false);
  };

  useEffect(() => {
    if (!isLoading) {
      setStoreName(settings.storeName);
      setStoreSubtitle(settings.storeSubtitle);
      setStoreAddress(settings.storeAddress);
      setSellers(settings.sellers);
    }
  }, [isLoading, settings]);


  const handleSave = async () => {
    if (!storeName.trim()) return;
    setSaving(true);
    const next: StoreSettings = { storeName: storeName.trim(), storeSubtitle: storeSubtitle.trim(), storeAddress: storeAddress.trim(), sellers };
    await saveSettings(next);
    setSaving(false);
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setSaved(false), 2000);
  };

  const openAddSeller = () => { setEditingSeller(null); setSellerName(""); setSellerPhone(""); setSellerError(null); setSellerModal(true); };
  const openEditSeller = (s: Seller) => { setEditingSeller(s); setSellerName(s.name); setSellerPhone(s.phone); setSellerError(null); setSellerModal(true); };

  const handleSaveSeller = () => {
    if (!sellerName.trim()) { setSellerError("Ism kiritilishi shart"); return; }
    if (!sellerPhone.trim()) { setSellerError("Telefon kiritilishi shart"); return; }
    if (editingSeller) {
      setSellers((prev) => prev.map((s) => s.id === editingSeller.id ? { ...s, name: sellerName.trim(), phone: sellerPhone.trim() } : s));
    } else {
      setSellers((prev) => [...prev, { id: uuid(), name: sellerName.trim(), phone: sellerPhone.trim() }]);
    }
    setSellerModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const confirmDeleteSeller = () => {
    if (!deleteSellerConfirm) return;
    setSellers((prev) => prev.filter((s) => s.id !== deleteSellerConfirm.id));
    setDeleteSellerConfirm(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      await deleteAccount();
    } catch (e: unknown) {
      setDeleteAccountError(e instanceof Error ? e.message : "Xato yuz berdi");
      setDeletingAccount(false);
    }
  };

  if (isLoading) {
    return <View style={[styles.loader, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const themeSection = (
    <SectionCard title="Ko'rinish (Mavzu)" icon="palette" colors={colors}>
      {(
        [
          { value: "light", label: "Kunduzgi", icon: "light-mode" },
          { value: "dark", label: "Tungi", icon: "dark-mode" },
          { value: "system", label: "Tizim", icon: "brightness-auto" },
        ] as { value: "light" | "dark" | "system"; label: string; icon: keyof typeof MaterialIcons.glyphMap }[]
      ).map((opt) => {
        const active = themeMode === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.themeRow, { backgroundColor: active ? colors.primary + "18" : colors.muted, borderColor: active ? colors.primary : colors.border }]}
            onPress={() => { setThemeMode(opt.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            activeOpacity={0.8}
          >
            <MaterialIcons name={opt.icon} size={22} color={active ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.themeLabel, { color: active ? colors.primary : colors.foreground, fontFamily: active ? "Inter_700Bold" : "Inter_400Regular" }]}>
              {opt.label}
            </Text>
            {active && <MaterialIcons name="check-circle" size={18} color={colors.primary} style={{ marginLeft: "auto" }} />}
          </TouchableOpacity>
        );
      })}
    </SectionCard>
  );

  // Worker view — only theme
  if (role === "worker") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {themeSection}
          <View style={[styles.hintBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Sozlama bo'limida faqat mavzu o'zgartirishga ruxsat mavjud.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Manager view — full settings
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={managerRefreshing}
              onRefresh={handleManagerRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <WebRefreshBar refreshing={managerRefreshing} onRefresh={handleManagerRefresh} />
          {/* Workers management */}
          <SectionCard title="Ishchilar arizalari" icon="badge" colors={colors} badge={pendingWorkers?.length}>
            <WorkersSection colors={colors} />
          </SectionCard>

          {/* Delete requests */}
          <SectionCard title="O'chirish so'rovlari" icon="delete-sweep" colors={colors} badge={pendingDeleteReqs?.length}>
            <DeleteRequestsSection colors={colors} />
          </SectionCard>

          {/* Subscription Info */}
          <SubscriptionInfoCard
            plan={subscriptionPlan}
            active={subscriptionActive}
            daysLeft={subscriptionDaysLeft}
            endDate={subscriptionEnd}
            colors={colors}
          />

          {/* Store info */}
          <SectionCard title="Do'kon ma'lumotlari" icon="store" colors={colors}>
            <Field label="Do'kon nomi *" value={storeName} onChangeText={setStoreName} placeholder="SMARTBOSS" colors={colors} />
            <Field label="Tavsif (kichik yozuv)" value={storeSubtitle} onChangeText={setStoreSubtitle} placeholder="Android mobil aksessuarlar do'koni" colors={colors} />
            <Field label="Do'kon manzili" value={storeAddress} onChangeText={setStoreAddress} placeholder="Shahar, ko'cha, bino..." colors={colors} />

            {/* Credentials display */}
            {(managerLogin || managerStoreId) && (
              <View style={[styles.credentialsBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={styles.credentialsHeaderRow}>
                  <MaterialIcons name="admin-panel-settings" size={16} color={colors.primary} />
                  <Text style={[styles.credentialsTitle, { color: colors.foreground }]}>Kirish ma'lumotlari</Text>
                </View>
                {managerLogin && (
                  <View style={styles.credentialRow}>
                    <Text style={[styles.credentialLabel, { color: colors.mutedForeground }]}>Login</Text>
                    <View style={[styles.credentialValueWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <MaterialIcons name="person" size={14} color={colors.primary} />
                      <Text style={[styles.credentialValue, { color: colors.foreground, letterSpacing: showCredLogin ? 0 : 2 }]}>
                        {showCredLogin ? managerLogin : "•".repeat(managerLogin.length)}
                      </Text>
                      <TouchableOpacity onPress={() => setShowCredLogin(v => !v)} style={{ marginLeft: "auto", padding: 2 }}>
                        <MaterialIcons name={showCredLogin ? "visibility-off" : "visibility"} size={16} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <View style={styles.credentialRow}>
                  <Text style={[styles.credentialLabel, { color: colors.mutedForeground }]}>Parol</Text>
                  <View style={[styles.credentialValueWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <MaterialIcons name="lock" size={14} color={colors.primary} />
                    <Text style={[styles.credentialValue, { color: colors.mutedForeground, letterSpacing: 2 }]}>••••••</Text>
                  </View>
                </View>
                {managerStoreId && (
                  <View style={styles.credentialRow}>
                    <Text style={[styles.credentialLabel, { color: colors.mutedForeground }]}>Do'kon ID</Text>
                    <View style={[styles.credentialValueWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <MaterialIcons name="store" size={14} color={colors.primary} />
                      <Text style={[styles.credentialValue, { color: colors.foreground, letterSpacing: 1 }]}>{managerStoreId}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </SectionCard>

          {/* Sellers */}
          <SectionCard title="Sotuvchilar" icon="people" colors={colors}>
            {sellers.length === 0 && (
              <View style={styles.emptyRow}>
                <MaterialIcons name="person-off" size={32} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Sotuvchi yo'q</Text>
              </View>
            )}
            {sellers.map((s, idx) => (
              <View key={s.id} style={[styles.sellerRow, { backgroundColor: colors.muted, borderColor: colors.border, borderTopWidth: idx === 0 ? 0 : 1 }]}>
                <View style={[styles.sellerAvatar, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.sellerAvatarText, { color: colors.primary }]}>{s.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.sellerInfo}>
                  <Text style={[styles.sellerName, { color: colors.foreground }]}>{s.name}</Text>
                  <Text style={[styles.sellerPhone, { color: colors.mutedForeground }]}>{s.phone}</Text>
                </View>
                <View style={styles.sellerActions}>
                  <TouchableOpacity style={[styles.sellerActionBtn, { backgroundColor: colors.primary + "18" }]} onPress={() => openEditSeller(s)} activeOpacity={0.8}>
                    <MaterialIcons name="edit" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sellerActionBtn, { backgroundColor: "#FEE2E2" }]} onPress={() => setDeleteSellerConfirm(s)} activeOpacity={0.8}>
                    <MaterialIcons name="delete" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.addSellerBtn, { borderColor: colors.primary }]} onPress={openAddSeller} activeOpacity={0.85}>
              <MaterialIcons name="person-add" size={18} color={colors.primary} />
              <Text style={[styles.addSellerText, { color: colors.primary }]}>Yangi sotuvchi qo'shish</Text>
            </TouchableOpacity>
          </SectionCard>

          {themeSection}

          <View style={[styles.hintBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Birinchi sotuvchi faktura, chek va yuk xatida asosiy sotuvchi sifatida ko'rsatiladi.
            </Text>
          </View>

          {/* Delete account */}
          <SectionCard title="Xavfli zona" icon="warning" colors={colors}>
            <Text style={[styles.dangerDesc, { color: colors.mutedForeground }]}>
              Hisobingizni o'chirsangiz, barcha ma'lumotlar (mahsulotlar, sotuvlar, mijozlar, ishchilar) qaytarib bo'lmasdan o'chib ketadi.
            </Text>
            <TouchableOpacity
              style={styles.deleteAccountBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setDeleteAccountModal(true); setDeleteAccountError(null); }}
              activeOpacity={0.85}
            >
              <MaterialIcons name="delete-forever" size={20} color="#DC2626" />
              <Text style={styles.deleteAccountBtnText}>Profilni yo'q qilish</Text>
            </TouchableOpacity>
          </SectionCard>

          {/* Biz haqimizda */}
          <TouchableOpacity
            style={[styles.aboutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.selectionAsync();
              Alert.alert(
                "Biz haqimizda",
                "Admin: tel: +99894 689-35-15\n            +99893 483-12-89\nt.me/@smartboss_admin\n\nIshni bizga yuklang, siz esa dam oling!"
              );
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.aboutIconWrap, { backgroundColor: colors.primary + "18" }]}>
              <MaterialIcons name="info-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.aboutBtnText, { color: colors.foreground }]}>Biz haqimizda</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>

          {/* Version info box */}
          <View style={[styles.versionBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.versionLabel, { color: colors.mutedForeground }]}>Ilova haqida</Text>
            <Text style={[styles.versionValue, { color: colors.foreground }]}>Versiya: 1.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save button */}
      <View style={[styles.saveBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? colors.success : saving ? colors.mutedForeground : colors.primary }]}
          onPress={handleSave}
          disabled={saving || !storeName.trim()}
          activeOpacity={0.88}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : saved ? (
            <><MaterialIcons name="check-circle" size={20} color="#fff" /><Text style={styles.saveBtnText}>Saqlandi!</Text></>
          ) : (
            <><MaterialIcons name="save" size={20} color="#fff" /><Text style={styles.saveBtnText}>Sozlamalarni saqlash</Text></>
          )}
        </TouchableOpacity>
      </View>

      {/* Seller add/edit modal */}
      <Modal visible={sellerModal} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSellerModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingSeller ? "Sotuvchini tahrirlash" : "Yangi sotuvchi"}</Text>
                <TouchableOpacity onPress={() => setSellerModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Field label="Sotuvchi ismi *" value={sellerName} onChangeText={setSellerName} placeholder="Azizbek" colors={colors} />
                <Field label="Telefon raqami *" value={sellerPhone} onChangeText={setSellerPhone} placeholder="+998 93 483 12 89" keyboardType="phone-pad" colors={colors} />
                {sellerError && (
                  <View style={styles.errorBox}>
                    <MaterialIcons name="error-outline" size={14} color="#DC2626" />
                    <Text style={styles.errorText}>{sellerError}</Text>
                  </View>
                )}
                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveSeller} activeOpacity={0.88}>
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={styles.modalSaveBtnText}>{editingSeller ? "Saqlash" : "Qo'shish"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete seller confirm modal */}
      <Modal visible={!!deleteSellerConfirm} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setDeleteSellerConfirm(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#FEE2E2" }]}>
              <MaterialIcons name="person-remove" size={28} color="#DC2626" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Sotuvchini o'chirish</Text>
            <Text style={[styles.confirmMsg, { color: colors.mutedForeground }]}>
              <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>{deleteSellerConfirm?.name}</Text>
              {" "}ni ro'yxatdan o'chirasizmi?
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={[styles.confirmCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={() => setDeleteSellerConfirm(null)} activeOpacity={0.8}>
                <Text style={[styles.confirmCancelText, { color: colors.mutedForeground }]}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmDeleteBtn, { backgroundColor: "#DC2626" }]} onPress={confirmDeleteSeller} activeOpacity={0.85}>
                <MaterialIcons name="delete" size={16} color="#fff" />
                <Text style={styles.confirmDeleteText}>O'chirish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete account confirmation modal */}
      <Modal
        visible={deleteAccountModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => { if (!deletingAccount) setDeleteAccountModal(false); }}
      >
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#FEE2E2" }]}>
              <MaterialIcons name="delete-forever" size={32} color="#DC2626" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Profilni yo'q qilish</Text>
            <Text style={[styles.confirmMsg, { color: colors.mutedForeground }]}>
              Barcha{" "}
              <Text style={{ fontFamily: "Inter_700Bold", color: "#DC2626" }}>mahsulotlar, sotuvlar, mijozlar va ishchilar</Text>
              {" "}ma'lumotlari butunlay o'chib ketadi.{"\n"}Bu amalni qaytarib bo'lmaydi!
            </Text>

            {deleteAccountError && (
              <View style={[styles.errorBox, { marginBottom: 12, marginTop: -8 }]}>
                <MaterialIcons name="error-outline" size={14} color="#DC2626" />
                <Text style={[styles.errorText, { flex: 1 }]}>{deleteAccountError}</Text>
              </View>
            )}

            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => setDeleteAccountModal(false)}
                activeOpacity={0.8}
                disabled={deletingAccount}
              >
                <Text style={[styles.confirmCancelText, { color: colors.mutedForeground }]}>Yo'q</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, { backgroundColor: "#DC2626", opacity: deletingAccount ? 0.7 : 1 }]}
                onPress={handleDeleteAccount}
                activeOpacity={0.85}
                disabled={deletingAccount}
              >
                {deletingAccount
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <MaterialIcons name="delete-forever" size={18} color="#fff" />
                }
                <Text style={styles.confirmDeleteText}>Ha, o'chir</Text>
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
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, marginLeft: "auto" },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  sectionBody: { padding: 16, gap: 12 },
  subSectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  field: { gap: 5 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  fieldInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontFamily: "Inter_400Regular", fontSize: 14 },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 11 },
  themeLabel: { fontSize: 14 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 10 },
  sellerAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sellerAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  sellerInfo: { flex: 1 },
  sellerName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  sellerPhone: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  sellerActions: { flexDirection: "row", gap: 6 },
  sellerActionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  addSellerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", paddingVertical: 11 },
  addSellerText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyRow: { alignItems: "center", paddingVertical: 16, gap: 6 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  hintBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  hintText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
  saveBar: { borderTopWidth: 1, padding: 14 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, height: 50 },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottomWidth: 1, marginBottom: 14 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  modalBody: { gap: 12 },
  modalSaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, height: 48, marginTop: 4 },
  modalSaveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#DC2626" },
  confirmBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 28 },
  confirmSheet: { borderRadius: 24, padding: 24 },
  confirmIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14 },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center", marginBottom: 8 },
  confirmMsg: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  confirmBtns: { flexDirection: "row", gap: 10 },
  confirmCancelBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  confirmDeleteBtn: { flex: 1, height: 46, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  confirmDeleteText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  workerRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 6 },
  workerAvatar: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  workerAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  workerInfo: { flex: 1 },
  workerNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  workerName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  workerPhone: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  workerAddress: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  workerActions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  statusBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  pendingWorkerCard: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 8, gap: 12 },
  pendingWorkerTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  pendingDeleteBtn: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  pendingWorkerBtns: { flexDirection: "row", gap: 10 },
  approveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#059669", borderRadius: 12, height: 50,
  },
  approveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  rejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#DC2626", borderRadius: 12, height: 50,
  },
  rejectBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  requestRow: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  requestTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  requestWorker: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  requestSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  requestDate: { fontFamily: "Inter_400Regular", fontSize: 11 },
  requestBtns: { flexDirection: "row", gap: 8 },
  reqBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 9, paddingVertical: 8 },
  reqBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  refreshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingVertical: 9 },
  refreshBtnText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  centerRow: { alignItems: "center", paddingVertical: 12 },
  // Credentials display
  credentialsBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  credentialsHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  credentialsTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  credentialRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  credentialLabel: { fontFamily: "Inter_500Medium", fontSize: 12, width: 70 },
  credentialValueWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  credentialValue: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  // Danger zone
  dangerDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  deleteAccountBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, borderWidth: 1.5, borderColor: "#DC2626",
    paddingVertical: 13, marginTop: 4,
  },
  deleteAccountBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#DC2626" },
  // About button
  aboutBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  aboutIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  aboutBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  // Version box
  versionBox: {
    borderRadius: 14, borderWidth: 1, padding: 14,
    alignItems: "center", gap: 4,
  },
  versionLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  versionValue: { fontFamily: "Inter_700Bold", fontSize: 15 },
});
