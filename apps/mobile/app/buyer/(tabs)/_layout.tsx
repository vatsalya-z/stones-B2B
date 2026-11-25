import React from "react";
import { Tabs } from "expo-router";
import {
  LuxuryTabBar,
  type LuxuryTabItemConfig,
} from "../../../src/components/ui";

const BUYER_TAB_ITEMS: Record<string, LuxuryTabItemConfig> = {
  index: {
    label: "Home",
    activeIcon: "home",
    inactiveIcon: "home-outline",
  },
  explore: {
    label: "Explore",
    activeIcon: "compass",
    inactiveIcon: "compass-outline",
  },
  rfq: {
    label: "RFQ",
    activeIcon: "document-text",
    inactiveIcon: "document-text-outline",
    isFeatured: true,
  },
  messages: {
    label: "Messages",
    activeIcon: "chatbubbles",
    inactiveIcon: "chatbubbles-outline",
  },
  account: {
    label: "Account",
    activeIcon: "person",
    inactiveIcon: "person-outline",
  },
};

export default function BuyerTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <LuxuryTabBar {...props} variant="buyer" items={BUYER_TAB_ITEMS} />
      )}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="rfq" options={{ title: "RFQ" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
