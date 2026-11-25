import React from "react";
import { SellerProductForm } from "../../../src/components/stone/SellerProductForm";
import { EmptyState, ScreenHeader } from "../../../src/components/ui";
import { useAuthStore } from "../../../src/store/auth-store";
import { useRouter } from "expo-router";

export default function NewSellerProductScreen() {
  const router = useRouter();
  const sellerProfile = useAuthStore((s) => s.sellerProfile);

  if (!sellerProfile) {
    return (
      <>
        <ScreenHeader title="Add Stone Listing" />
        <EmptyState
          icon="storefront-outline"
          title="Storefront Profile Missing"
          description="Create your business profile before adding stone products."
          actionLabel="Set Up Business Profile"
          onAction={() => router.replace("/seller/storefront")}
        />
      </>
    );
  }

  return <SellerProductForm seller={sellerProfile} />;
}
