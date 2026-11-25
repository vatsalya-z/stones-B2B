import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { COLORS, SPACING } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import {
  Badge,
  Card,
  EmptyState,
  ListScreenSkeleton,
  ScreenHeader,
} from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import {
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../src/services/buyer.service";
import { resolveNotificationTargetRoute } from "../../src/lib/notifications";
import { formatDateShort } from "../../src/lib/domain-meta";

export default function BuyerNotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const q = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetchUserNotifications(user!.id),
    enabled: Boolean(user?.id),
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Notifications"
        rightSlot={
          <Pressable
            onPress={async () => {
              if (!user?.id) return;
              await markAllNotificationsRead(user.id);
              qc.invalidateQueries({ queryKey: ["notifications", user.id] });
            }}
          >
            <Text style={styles.markAll}>Mark All Read</Text>
          </Pressable>
        }
      />
      {q.isLoading ? (
        <ListScreenSkeleton />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(i) => i.id}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title="All caught up"
              description="Quotation updates, supplier responses, and order milestones will appear here."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={async () => {
                if (!user?.id) return;
                if (!item.is_read) {
                  await markNotificationRead(user.id, item.id);
                  qc.invalidateQueries({ queryKey: ["notifications", user.id] });
                }
                const target = resolveNotificationTargetRoute(
                  item.notification_type,
                  item.reference_id,
                  "buyer",
                );
                router.push(target as never);
              }}
            >
              <Card style={[styles.card, !item.is_read && styles.unreadCard]}>
                <View style={styles.top}>
                  <Text style={styles.title}>{item.title}</Text>
                  {!item.is_read ? <Badge label="New" tone="primary" /> : null}
                </View>
                <Text style={TYPOGRAPHY.caption}>{item.message}</Text>
                <Text style={styles.date}>{formatDateShort(item.created_at)}</Text>
              </Card>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.xs }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  markAll: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.primary },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: { gap: 4 },
  unreadCard: { borderColor: COLORS.primary, backgroundColor: "#F6FBF8" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary },
  date: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.textSecondary },
});
