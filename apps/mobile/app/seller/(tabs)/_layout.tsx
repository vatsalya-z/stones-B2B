import React from "react";
import { Tabs } from "expo-router";
import {
  LuxuryTabBar,
  type LuxuryTabItemConfig,
} from "../../../src/components/ui";

const SELLER_TAB_ITEMS: Record<string, LuxuryTabItemConfig> = {
  index: {
    label: "Dashboard",
    activeIcon: "grid",
    inactiveIcon: "grid-outline",
  },
  products: {
    label: "Products",
    activeIcon: "layers",
    inactiveIcon: "layers-outline",
  },
  leads: {
    label: "Leads",
    activeIcon: "flash",
    inactiveIcon: "flash-outline",
    isFeatured: true,
  },
  orders: {
    label: "Orders",
    activeIcon: "cube",
    inactiveIcon: "cube-outline",
  },
  account: {
    label: "Account",
    activeIcon: "storefront",
    inactiveIcon: "storefront-outline",
  },
};

export default function SellerTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <LuxuryTabBar {...props} variant="seller" items={SELLER_TAB_ITEMS} />
      )}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="products" options={{ title: "Products" }} />
      <Tabs.Screen name="leads" options={{ title: "Leads" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
