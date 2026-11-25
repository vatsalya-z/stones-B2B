import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { COLORS, SPACING } from "../../src/theme/tokens";
import {
  EmptyState,
  ErrorState,
  ListScreenSkeleton,
  ScreenHeader,
} from "../../src/components/ui";
import { StoneProductCard } from "../../src/components/stone";
import { useAuthStore } from "../../src/store/auth-store";
import {
  fetchBuyerFavourites,
  toggleBuyerFavourite,
} from "../../src/services/buyer.service";

export default function BuyerFavouritesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const q = useQuery({
    queryKey: ["buyer", "favourites", user?.id],
    queryFn: () => fetchBuyerFavourites(user!.id),
    enabled: Boolean(user?.id),
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Saved Stone Lots" subtitle="Your architectural shortlist" />
      {q.isLoading ? (
        <ListScreenSkeleton />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={q.data?.products ?? []}
          keyExtractor={(item) => item.id}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="No saved stone lots"
              description="Tap the heart icon on any marble, granite, or sandstone listing to shortlist it here."
              actionLabel="Explore Catalogue"
              onAction={() => router.push("/buyer/(tabs)/explore")}
            />
          }
          renderItem={({ item }) => (
            <StoneProductCard
              item={item}
              isFavourite
              onToggleFavourite={async () => {
                if (!user?.id) return;
                await toggleBuyerFavourite(user.id, item.id);
                qc.invalidateQueries({ queryKey: ["buyer", "favourites", user.id] });
              }}
              onPress={() => router.push(`/buyer/products/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
});
