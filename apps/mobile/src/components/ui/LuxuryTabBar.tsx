import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";

type ExpoTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const USE_NATIVE_DRIVER = Platform.OS !== "web";

export interface LuxuryTabItemConfig {
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  isFeatured?: boolean;
}

export type LuxuryTabBarProps = ExpoTabBarProps & {
  variant: "buyer" | "seller";
  items: Record<string, LuxuryTabItemConfig>;
};

interface TabButtonProps {
  config: LuxuryTabItemConfig;
  variant: "buyer" | "seller";
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
}

function triggerTabHaptic(featured: boolean) {
  if (Platform.OS === "web") return;
  if (featured) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
  } else {
    Haptics.selectionAsync().catch(() => undefined);
  }
}

function StandardTabButton({
  config,
  variant,
  isFocused,
  onPress,
  onLongPress,
  testID,
}: TabButtonProps) {
  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: USE_NATIVE_DRIVER,
      tension: 180,
      friction: 18,
    }).start();
  }, [focusAnim, isFocused]);

  const iconTranslateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  const iconFocusScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.07],
  });

  const isSeller = variant === "seller";
  const iconColor = isFocused
    ? isSeller
      ? COLORS.accent
      : COLORS.white
    : "rgba(200, 218, 214, 0.72)";

  const indicatorStyle = isSeller
    ? styles.topIndicatorSeller
    : styles.topIndicatorBuyer;

  const capsuleStyle = isFocused
    ? isSeller
      ? styles.iconCapsuleSellerActive
      : styles.iconCapsuleBuyerActive
    : undefined;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        Animated.spring(pressScale, {
          toValue: 0.93,
          useNativeDriver: USE_NATIVE_DRIVER,
          tension: 260,
          friction: 20,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(pressScale, {
          toValue: 1,
          useNativeDriver: USE_NATIVE_DRIVER,
          tension: 260,
          friction: 20,
        }).start();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={config.label}
      testID={testID}
      style={styles.standardTab}
    >
      <Animated.View
        style={[
          styles.standardInner,
          { transform: [{ scale: pressScale }] },
        ]}
      >
        {isFocused ? <View style={[styles.topIndicator, indicatorStyle]} /> : null}

        <Animated.View
          style={[
            styles.iconCapsule,
            capsuleStyle,
            {
              transform: [
                { translateY: iconTranslateY },
                { scale: iconFocusScale },
              ],
            },
          ]}
        >
          <Ionicons
            name={isFocused ? config.activeIcon : config.inactiveIcon}
            size={20}
            color={iconColor}
          />
        </Animated.View>

        <Text
          numberOfLines={1}
          style={[
            styles.standardLabel,
            isFocused ? styles.standardLabelActive : styles.standardLabelIdle,
          ]}
        >
          {config.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function FeaturedTabButton({
  config,
  variant,
  isFocused,
  onPress,
  onLongPress,
  testID,
}: TabButtonProps) {
  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: USE_NATIVE_DRIVER,
      tension: 180,
      friction: 16,
    }).start();
  }, [focusAnim, isFocused]);

  const medallionLift = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  const medallionScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const isSeller = variant === "seller";

  const squircleStyle = isSeller
    ? isFocused
      ? styles.medallionSellerFocused
      : styles.medallionSellerIdle
    : isFocused
      ? styles.medallionBuyerFocused
      : styles.medallionBuyerIdle;

  const iconColor = isSeller
    ? isFocused
      ? COLORS.accent
      : COLORS.deepGreen
    : isFocused
      ? COLORS.deepGreen
      : COLORS.white;

  const labelColor = isFocused
    ? COLORS.accent
    : isSeller
      ? "#F5DFB0"
      : "#E4EFEA";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        Animated.spring(pressScale, {
          toValue: 0.93,
          useNativeDriver: USE_NATIVE_DRIVER,
          tension: 260,
          friction: 20,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(pressScale, {
          toValue: 1,
          useNativeDriver: USE_NATIVE_DRIVER,
          tension: 260,
          friction: 20,
        }).start();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={config.label}
      testID={testID}
      style={styles.featuredTab}
    >
      <Animated.View
        style={[
          styles.featuredContent,
          {
            transform: [
              { translateY: medallionLift },
              { scale: Animated.multiply(pressScale, medallionScale) },
            ],
          },
        ]}
      >
        <View style={styles.medallionCradle}>
          <View style={[styles.medallionSquircle, squircleStyle]}>
            <Ionicons
              name={isFocused ? config.activeIcon : config.inactiveIcon}
              size={22}
              color={iconColor}
            />
          </View>
        </View>

        <Text numberOfLines={1} style={[styles.featuredLabel, { color: labelColor }]}>
          {config.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function LuxuryTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
  variant,
  items,
}: LuxuryTabBarProps) {
  const safeInsets = useSafeAreaInsets();
  const bottomInset = insets?.bottom ?? safeInsets.bottom;
  const visibleRoutes = state.routes.filter((route) => Boolean(items[route.name]));
  const isSeller = variant === "seller";

  return (
    <View
      style={[
        styles.outerTray,
        {
          paddingBottom: Math.max(bottomInset, 10),
        },
      ]}
    >
      <View
        style={[
          styles.dock,
          isSeller ? styles.dockSellerBorder : styles.dockBuyerBorder,
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.dockSheen,
            isSeller ? styles.dockSheenSeller : styles.dockSheenBuyer,
          ]}
        />

        {visibleRoutes.map((route) => {
          const config = items[route.name];
          if (!config) return null;

          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === routeIndex;
          const descriptor = descriptors[route.key];

          const handlePress = () => {
            triggerTabHaptic(Boolean(config.isFeatured));
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const handleLongPress = () => {
            emitter.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          if (config.isFeatured) {
            return (
              <FeaturedTabButton
                key={route.key}
                config={config}
                variant={variant}
                isFocused={isFocused}
                onPress={handlePress}
                onLongPress={handleLongPress}
                testID={descriptor?.options.tabBarButtonTestID}
              />
            );
          }

          return (
            <StandardTabButton
              key={route.key}
              config={config}
              variant={variant}
              isFocused={isFocused}
              onPress={handlePress}
              onLongPress={handleLongPress}
              testID={descriptor?.options.tabBarButtonTestID}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerTray: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingTop: 14,
    overflow: "visible",
  },
  dock: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    height: 66,
    borderRadius: 24,
    backgroundColor: COLORS.deepGreen,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    overflow: "visible",
    ...SHADOWS.command,
  },
  dockBuyerBorder: {
    borderColor: "rgba(31, 138, 103, 0.44)",
  },
  dockSellerBorder: {
    borderColor: "rgba(217, 163, 68, 0.36)",
  },
  dockSheen: {
    position: "absolute",
    top: 0,
    left: 28,
    right: 28,
    height: 1,
  },
  dockSheenBuyer: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  dockSheenSeller: {
    backgroundColor: "rgba(217, 163, 68, 0.34)",
  },
  standardTab: {
    flex: 1,
    minWidth: 0,
    minHeight: Math.max(TOUCH_TARGET_MIN, 54),
    alignItems: "center",
    justifyContent: "center",
  },
  standardInner: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  topIndicator: {
    position: "absolute",
    top: -6,
    width: 20,
    height: 2.5,
    borderRadius: 2,
  },
  topIndicatorBuyer: {
    backgroundColor: COLORS.secondary,
  },
  topIndicatorSeller: {
    backgroundColor: COLORS.accent,
  },
  iconCapsule: {
    width: 42,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCapsuleBuyerActive: {
    backgroundColor: "rgba(31, 138, 103, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(31, 138, 103, 0.56)",
  },
  iconCapsuleSellerActive: {
    backgroundColor: "rgba(217, 163, 68, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(217, 163, 68, 0.46)",
  },
  standardLabel: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.15,
    marginTop: 3,
    textAlign: "center",
  },
  standardLabelActive: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.white,
  },
  standardLabelIdle: {
    fontFamily: FONTS.bodyMedium,
    color: "rgba(200, 218, 214, 0.70)",
  },
  featuredTab: {
    flex: 1,
    minWidth: 0,
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: -22,
    paddingBottom: 2,
  },
  featuredContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  medallionCradle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  medallionSquircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.elevated,
  },
  medallionBuyerIdle: {
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  medallionBuyerFocused: {
    backgroundColor: COLORS.accent,
    borderWidth: 1.5,
    borderColor: "#FFF4D6",
  },
  medallionSellerIdle: {
    backgroundColor: COLORS.accent,
    borderWidth: 1.5,
    borderColor: "#F2CE85",
  },
  medallionSellerFocused: {
    backgroundColor: COLORS.deepGreenElevated,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  featuredLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.25,
    marginTop: 2,
    textAlign: "center",
  },
});
