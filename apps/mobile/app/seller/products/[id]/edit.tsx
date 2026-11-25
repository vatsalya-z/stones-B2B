import React from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { COLORS } from "../../../../src/theme/tokens";
import { ErrorState, ListScreenSkeleton, ScreenHeader } from "../../../../src/components/ui";
import { SellerProductForm } from "../../../../src/components/stone/SellerProductForm";
import { fetchSellerProductForEdit } from "../../../../src/services/seller.service";
import { useAuthStore } from "../../../../src/store/auth-store";
import type { PriceType } from "@stone/types";
import type { CatalogUnit, StockStatus } from "@stone/validation";

export default function EditSellerProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sellerProfile = useAuthStore((s) => s.sellerProfile);

  const q = useQuery({
    queryKey: ["seller", "product", id],
    queryFn: () => fetchSellerProductForEdit(sellerProfile!.id, id!),
    enabled: Boolean(sellerProfile?.id && id),
  });

  if (q.isLoading || !sellerProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <ScreenHeader title="Edit Stone Listing" />
        <ListScreenSkeleton />
      </View>
    );
  }

  if (q.isError || !q.data) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <ScreenHeader title="Edit Stone Listing" />
        <ErrorState onRetry={() => q.refetch()} />
      </View>
    );
  }

  const p = q.data;
  return (
    <SellerProductForm
      seller={sellerProfile}
      initialProduct={{
        id: p.id,
        name: p.name,
        sku: p.sku,
        category_id: p.category_id,
        material_type: p.material_type,
        colour: p.colour,
        finish: p.finish,
        stone_origin: p.stone_origin,
        thickness: p.thickness,
        length: p.length,
        width: p.width,
        price_type: p.price_type as PriceType,
        price: p.price,
        unit: p.unit as CatalogUnit,
        minimum_order_quantity: p.minimum_order_quantity,
        stock_status: p.stock_status as StockStatus,
        lead_time: p.lead_time,
        description: p.description,
        images: p.images,
      }}
    />
  );
}
