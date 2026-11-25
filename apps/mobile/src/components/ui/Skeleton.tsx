import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { COLORS, RADII, SPACING } from "../../theme/tokens";

export function SkeletonBox({
  width = "100%",
  height = 16,
  radius = RADII.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: COLORS.stoneBeige,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBox height={160} radius={RADII.sm} />
      <SkeletonBox width="75%" height={18} style={{ marginTop: 12 }} />
      <SkeletonBox width="50%" height={14} style={{ marginTop: 8 }} />
      <SkeletonBox width="40%" height={16} style={{ marginTop: 12 }} />
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={styles.listWrap}>
      <View style={[styles.card, { backgroundColor: COLORS.deepGreen, borderColor: COLORS.deepGreen }]}>
        <SkeletonBox width="45%" height={12} style={{ opacity: 0.25 }} />
        <SkeletonBox width="70%" height={26} style={{ marginTop: 10, opacity: 0.3 }} />
        <SkeletonBox width="55%" height={14} style={{ marginTop: 8, opacity: 0.2 }} />
      </View>
      <View style={styles.rowPair}>
        <View style={[styles.card, { flex: 1 }]}>
          <SkeletonBox width="50%" height={12} />
          <SkeletonBox width="40%" height={28} style={{ marginTop: 8 }} />
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <SkeletonBox width="50%" height={12} />
          <SkeletonBox width="40%" height={28} style={{ marginTop: 8 }} />
        </View>
      </View>
      <ListScreenSkeleton count={3} />
    </View>
  );
}

export function ListScreenSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.listWrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBox width="60%" height={18} />
          <SkeletonBox width="90%" height={14} style={{ marginTop: 8 }} />
          <SkeletonBox width="45%" height={14} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  rowPair: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
});
