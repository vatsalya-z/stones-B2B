import React, { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { COLORS } from "../src/theme/tokens";
import { getStatusBarStyleForPath } from "../src/theme/status-bar";
import { registerQueryCacheClearer, useAuthStore } from "../src/store/auth-store";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

registerQueryCacheClearer(() => {
  queryClient.clear();
});

export default function RootLayout() {
  const pathname = usePathname();
  const statusBarStyle = getStatusBarStyleForPath(pathname);
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const fontsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      StatusBar.setStyle(statusBarStyle, true);
    }
  }, [statusBarStyle]);

  useEffect(() => {
    if (fontsReady && initialized) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsReady, initialized]);

  if (!fontsReady || !initialized) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={statusBarStyle} animated />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="buyer" />
            <Stack.Screen name="seller" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
