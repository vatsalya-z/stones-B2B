import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING } from "../../../src/theme/tokens";
import { TYPOGRAPHY } from "../../../src/theme/typography";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  ListScreenSkeleton,
  ScreenHeader,
  SectionHeader,
} from "../../../src/components/ui";
import { StoneProductCard } from "../../../src/components/stone";
import { fetchSupplierStorefront } from "../../../src/services/catalog.service";
import { startOrOpenConversation } from "../../../src/services/messaging.service";
import { useAuthStore } from "../../../src/store/auth-store";
import { BUSINESS_TYPE_LABELS } from "../../../src/lib/domain-meta";
import type { BusinessType } from "@stone/types";

export default function BuyerSupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [msgPending, setMsgPending] = useState(false);

  const storefrontQ = useQuery({
    queryKey: ["catalog", "supplier", id],
    queryFn: () => fetchSupplierStorefront(id!),
    enabled: Boolean(id),
  });

  if (storefrontQ.isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Supplier Profile" />
        <ListScreenSkeleton />
      </View>
    );
  }

  const sup = storefrontQ.data;
  if (!sup) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Supplier Profile" />
        <ErrorState title="Supplier not found" onRetry={() => storefrontQ.refetch()} />
      </View>
    );
  }

  const handleMessage = async () => {
    if (!user?.id) return;
    setMsgPending(true);
    try {
      const convId = await startOrOpenConversation({
        sellerId: sup.id,
        subject: `Sourcing Inquiry — ${sup.businessName}`,
        callerRole: "buyer",
        userId: user.id,
      });
      router.push(`/buyer/chat/${convId}`);
    } finally {
      setMsgPending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={sup.businessName} subtitle={[sup.city, sup.state].filter(Boolean).join(", ")} />
      <ScrollView contentContainerStyle={styles.content}>
        {sup.coverUrl ? (
          <Image source={{ uri: sup.coverUrl }} contentFit="cover" style={styles.cover} />
        ) : null}

        <Card>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={TYPOGRAPHY.sectionTitle}>{sup.businessName}</Text>
              <Text style={TYPOGRAPHY.caption}>
                {BUSINESS_TYPE_LABELS[sup.businessType as BusinessType] ?? sup.businessType}
              </Text>
              <Text style={TYPOGRAPHY.caption}>
                {[sup.city, sup.state, sup.country].filter(Boolean).join(", ")}
                {sup.yearsInBusiness ? ` · ${sup.yearsInBusiness}+ years` : ""}
              </Text>
            </View>
            {sup.verified ? (
              <Badge
                label="Verified"
                tone="primary"
                icon={<Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />}
              />
            ) : null}
          </View>

          {sup.meta.cleanDescription ? (
            <Text style={[TYPOGRAPHY.body, { marginTop: SPACING.sm }]}>
              {sup.meta.cleanDescription}
            </Text>
          ) : null}

          <View style={styles.capsRow}>
            {sup.meta.hasQuarry ? <Badge label="Direct Quarry Owner" tone="copper" /> : null}
            {sup.meta.hasManufacturing ? <Badge label="Processing Mill" tone="neutral" /> : null}
            {sup.meta.hasExport ? <Badge label="Global Export" tone="info" /> : null}
          </View>

          <View style={styles.actions}>
            <Button
              title="Message Supplier"
              variant="outline"
              loading={msgPending}
              onPress={handleMessage}
              style={{ flex: 1 }}
            />
            <Button
              title="Send RFQ"
              onPress={() =>
                router.push({
                  pathname: "/buyer/(tabs)/rfq",
                  params: { sellerId: sup.id, sellerName: sup.businessName },
                })
              }
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        <SectionHeader title={`Published Stone Catalogue (${sup.products.length})`} />
        <View style={{ gap: SPACING.md }}>
          {sup.products.map((item) => (
            <StoneProductCard
              key={item.id}
              item={item}
              onPress={() => router.push(`/buyer/products/${item.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  cover: { width: "100%", height: 170, borderRadius: RADII.md, backgroundColor: COLORS.stoneBeige },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: SPACING.sm },
  capsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: SPACING.sm },
  actions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
});
