import React, { useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { COLORS, RADII, SPACING, TOUCH_TARGET_MIN } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import { STONE_ASSETS } from "../../src/theme/assets";
import { Button } from "../../src/components/ui/Button";
import { useAuthStore } from "../../src/store/auth-store";

const SLIDES = [
  {
    key: "sourcing",
    overline: "DIRECT QUARRY SOURCING",
    title: "Source Architectural Stone Direct From Quarries & Mills",
    body: "Explore verified Indian & imported marble, granite, sandstone, limestone, quartzite, travertine, and onyx slabs tailored for commercial projects.",
    image: STONE_ASSETS.hero.slabs,
  },
  {
    key: "rfq",
    overline: "PRECISION SPECIFICATIONS",
    title: "Technical RFQs, Cut-to-Size Lots & Structured Quotes",
    body: "Specify exact slab thickness, finish, dimensions, and delivery timelines. Compare supplier commercial terms side-by-side in seconds.",
    image: STONE_ASSETS.hero.quarry,
  },
  {
    key: "escrow",
    overline: "GOVERNED B2B TRADE",
    title: "Escrow-Protected Orders & Verified Quarry Trade",
    body: "Track orders transparently with Payment Model B escrow governance, verified KYC credentials, and direct buyer-supplier messaging.",
    image: STONE_ASSETS.hero.showroom,
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const imageHeight = Math.max(170, Math.min(290, Math.round(screenHeight * 0.34)));
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const flatListRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const finish = async (dest: "/(auth)/sign-in" | "/(auth)/sign-up") => {
    await completeOnboarding();
    router.replace(dest);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topRow, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.logoText}>StonesDekho</Text>
        <Pressable
          onPress={() => finish("/(auth)/sign-in")}
          style={styles.skipBtn}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(screenWidth, 1)));
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: screenWidth }]}>
            <View style={[styles.imageFrame, { height: imageHeight }]}>
              <Image source={item.image} contentFit="cover" style={styles.image} />
              <View style={styles.imageAccent} />
            </View>
            <View style={styles.copy}>
              <Text style={TYPOGRAPHY.overline}>{item.overline}</Text>
              <Text
                style={[
                  TYPOGRAPHY.heroTitle,
                  styles.title,
                  screenHeight < 700 && styles.titleCompact,
                ]}
              >
                {item.title}
              </Text>
              <Text style={[TYPOGRAPHY.body, styles.body]}>{item.body}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        {index < SLIDES.length - 1 ? (
          <Button
            title="Continue"
            fullWidth
            onPress={() => {
              const next = index + 1;
              flatListRef.current?.scrollToIndex({ index: next, animated: true });
              setIndex(next);
            }}
          />
        ) : (
          <View style={styles.ctaGroup}>
            <Button
              title="Sign In to Your Account"
              fullWidth
              onPress={() => finish("/(auth)/sign-in")}
            />
            <Button
              title="Register Buyer or Quarry Account"
              variant="outline"
              fullWidth
              onPress={() => finish("/(auth)/sign-up")}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  logoText: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.deepGreen,
  },
  skipBtn: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: "center",
    paddingHorizontal: SPACING.xs,
  },
  skipText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  slide: {
    paddingHorizontal: SPACING.md,
    justifyContent: "center",
  },
  imageFrame: {
    height: 290,
    borderRadius: RADII.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.accent,
  },
  copy: {
    marginTop: SPACING.md,
  },
  title: {
    marginTop: 6,
    fontSize: 26,
    lineHeight: 33,
  },
  titleCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.borderStrong,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  ctaGroup: {
    gap: SPACING.sm,
  },
});
