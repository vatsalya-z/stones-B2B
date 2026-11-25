import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING } from "../../src/theme/tokens";
import { FONTS } from "../../src/theme/typography";
import {
  Card,
  EmptyState,
  ErrorState,
  ListScreenSkeleton,
  ScreenHeader,
} from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import { fetchConversationsInbox } from "../../src/services/messaging.service";
import { formatDateShort } from "../../src/lib/domain-meta";

export default function SellerMessagesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const sellerProfile = useAuthStore((s) => s.sellerProfile);
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["messages", "seller", sellerProfile?.id],
    queryFn: () =>
      fetchConversationsInbox({
        userId: user!.id,
        role: "seller",
        sellerId: sellerProfile?.id,
      }),
    enabled: Boolean(user?.id && sellerProfile?.id),
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (q.data ?? []).filter((i) => {
      if (i.archived) return false;
      if (!query) return true;
      return (
        i.counterpartyName.toLowerCase().includes(query) ||
        i.subject.toLowerCase().includes(query)
      );
    });
  }, [q.data, search]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Buyer Messages" subtitle={sellerProfile?.business_name} />
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search buyer or enquiry subject..."
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
          />
        </View>
      </View>

      {q.isLoading ? (
        <ListScreenSkeleton />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No buyer messages"
              description="Open any buyer enquiry lead to message the buyer directly."
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/seller/chat/${item.id}`)}>
              <Card style={styles.card}>
                <View style={styles.top}>
                  <Text numberOfLines={1} style={styles.name}>{item.counterpartyName}</Text>
                  <Text style={styles.date}>{formatDateShort(item.lastMessageAt)}</Text>
                </View>
                <Text numberOfLines={1} style={styles.subj}>{item.subject}</Text>
                <View style={styles.bot}>
                  <Text numberOfLines={1} style={styles.preview}>
                    {item.lastMessagePreview || "Thread started"}
                  </Text>
                  {item.unreadCount > 0 ? (
                    <View style={styles.unread}>
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
  searchWrap: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    minHeight: 42,
  },
  searchInput: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 14, color: COLORS.textPrimary },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: { gap: 4 },
  top: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary },
  date: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.textSecondary },
  subj: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.primary },
  bot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  preview: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.textSecondary },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.deepGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.white },
});
