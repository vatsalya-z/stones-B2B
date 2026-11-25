import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING } from "../../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Card,
  EmptyState,
  ErrorState,
  ListScreenSkeleton,
} from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import { fetchConversationsInbox } from "../../../src/services/messaging.service";
import { formatDateShort } from "../../../src/lib/domain-meta";

export default function BuyerMessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<"active" | "unread" | "archived">("active");
  const [search, setSearch] = useState("");

  const inboxQ = useQuery({
    queryKey: ["messages", "buyer", user?.id],
    queryFn: () => fetchConversationsInbox({ userId: user!.id, role: "buyer" }),
    enabled: Boolean(user?.id),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (inboxQ.data ?? []).filter((item) => {
      if (tab === "archived" && !item.archived) return false;
      if (tab !== "archived" && item.archived) return false;
      if (tab === "unread" && item.unreadCount <= 0) return false;
      if (!q) return true;
      return (
        item.counterpartyName.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        (item.lastMessagePreview ?? "").toLowerCase().includes(q)
      );
    });
  }, [inboxQ.data, tab, search]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <Text style={TYPOGRAPHY.screenTitle}>Supplier Messages</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search supplier or subject..."
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.tabs}>
          {(["active", "unread", "archived"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {inboxQ.isLoading ? (
        <ListScreenSkeleton />
      ) : inboxQ.isError ? (
        <ErrorState
          message={inboxQ.error instanceof Error ? inboxQ.error.message : undefined}
          onRetry={() => inboxQ.refetch()}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshing={inboxQ.isRefetching}
          onRefresh={() => inboxQ.refetch()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No supplier conversations"
              description="Open any verified stone product or supplier profile and tap Contact Supplier to begin a thread."
              actionLabel="Browse Catalogue"
              onAction={() => router.push("/buyer/(tabs)/explore")}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/buyer/chat/${item.id}`)}>
              <Card style={styles.rowCard}>
                <View style={styles.rowTop}>
                  <Text numberOfLines={1} style={styles.name}>
                    {item.counterpartyName}
                  </Text>
                  <Text style={styles.date}>{formatDateShort(item.lastMessageAt)}</Text>
                </View>
                <Text numberOfLines={1} style={styles.subject}>
                  {item.subject}
                </Text>
                <View style={styles.previewRow}>
                  <Text numberOfLines={1} style={styles.preview}>
                    {item.lastMessagePreview || "Conversation opened"}
                  </Text>
                  {item.unreadCount > 0 ? (
                    <View style={styles.unreadPill}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
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
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    minHeight: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  tabs: { flexDirection: "row", gap: SPACING.xs },
  tab: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.stoneBeige,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  rowCard: { gap: 4 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: SPACING.xs },
  name: { flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary },
  date: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.textSecondary },
  subject: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.primary },
  previewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  preview: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.textSecondary },
  unreadPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.white },
});
