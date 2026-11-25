import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image, type ImageSource } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";

export function ImageGalleryModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: {
  visible: boolean;
  images: Array<{ uri?: string; local?: ImageSource | number }>;
  initialIndex?: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
          <Text style={styles.counter}>
            {Math.min(activeIndex + 1, Math.max(images.length, 1))} / {Math.max(images.length, 1)}
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close gallery">
            <Ionicons name="close" size={26} color={COLORS.white} />
          </Pressable>
        </View>

        <FlatList
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, Math.max(0, images.length - 1))}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          data={images}
          keyExtractor={(_, idx) => String(idx)}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / Math.max(screenWidth, 1));
            setActiveIndex(idx);
          }}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: screenWidth, height: screenHeight * 0.78 }]}>
              <Image
                source={item.uri ? { uri: item.uri } : item.local}
                contentFit="contain"
                style={[styles.fullImage, { width: screenWidth }]}
              />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepGreen,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  counter: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.white,
  },
  closeBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    height: "100%",
  },
});
