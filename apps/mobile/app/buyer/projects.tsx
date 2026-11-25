import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { COLORS, SPACING } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EnquiryStatusBadge,
  ListScreenSkeleton,
  ScreenHeader,
} from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import { fetchBuyerEnquiries } from "../../src/services/buyer.service";
import { formatUnitLabel } from "../../src/lib/domain-meta";

export default function BuyerProjectsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const q = useQuery({
    queryKey: ["buyer", "enquiries", user?.id],
    queryFn: () => fetchBuyerEnquiries(user!.id),
    enabled: Boolean(user?.id),
  });

  // Group real RFQs by project site / delivery location cleanly without fabricating project records
  const groupedBySite = useMemo(() => {
    const map = new Map<string, typeof q.data>();
    for (const enq of q.data ?? []) {
      const site = enq.delivery_location?.trim() || "Unspecified Project Site";
      const list = map.get(site) ?? [];
      list.push(enq);
      map.set(site, list);
    }
    return [...map.entries()];
  }, [q.data]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="My Projects"
        subtitle="RFQs organized by delivery site"
      />
      {q.isLoading ? (
        <ListScreenSkeleton />
      ) : groupedBySite.length === 0 ? (
        <EmptyState
          icon="business-outline"
          title="No project sites yet"
          description="Submit an architectural RFQ with your project city or site address to track sourcing packages here."
          actionLabel="Create Project RFQ"
          onAction={() => router.push("/buyer/(tabs)/rfq")}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {groupedBySite.map(([site, items]) => (
            <Card key={site} style={{ gap: SPACING.xs }}>
              <View style={styles.siteHeader}>
                <Text style={[TYPOGRAPHY.cardTitle, { flex: 1 }]}>{site}</Text>
                <Badge label={`${items?.length ?? 0} RFQs`} tone="primary" />
              </View>
              {(items ?? []).map((enq) => (
                <Pressable
                  key={enq.id}
                  onPress={() => router.push(`/buyer/enquiries/${enq.id}`)}
                  style={styles.itemRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={styles.itemTitle}>{enq.enquiry_title}</Text>
                    <Text style={TYPOGRAPHY.caption}>
                      {enq.quantity} {formatUnitLabel(enq.unit)}
                    </Text>
                  </View>
                  <EnquiryStatusBadge status={enq.status} />
                </Pressable>
              ))}
            </Card>
          ))}
          <Button
            title="New Project Requirement (RFQ)"
            onPress={() => router.push("/buyer/(tabs)/rfq")}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  siteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACING.xs },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.stoneBeige,
    gap: SPACING.xs,
  },
  itemTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.textPrimary },
});
