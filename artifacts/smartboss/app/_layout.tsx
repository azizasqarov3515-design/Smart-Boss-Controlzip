import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
});

const PUBLIC_SEGMENTS = ["role-select", "login", "worker-login", "worker-register", "worker-pending"];

function RootLayoutNav() {
  const { isAuthenticated, isLoading, role, workerStatus } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const currentSegment = segments[0] as string | undefined;
    const isPublic = PUBLIC_SEGMENTS.includes(currentSegment ?? "");

    if (!isAuthenticated) {
      if (!isPublic) router.replace("/role-select");
      return;
    }

    // Authenticated: check role-based routing
    if (role === "worker") {
      if (workerStatus === "pending") {
        if (currentSegment !== "worker-pending") router.replace("/worker-pending");
        return;
      }
      if (workerStatus === "rejected") {
        // Stay on worker-pending so it can show the rejection message inline.
        // Only redirect if the user is on some other non-public screen.
        if (currentSegment !== "worker-pending" && currentSegment !== "worker-login" && currentSegment !== "worker-register") {
          router.replace("/worker-pending");
        }
        return;
      }
      if (workerStatus === "approved") {
        // approved worker — send to tabs if on a public/auth screen
        if (isPublic) router.replace("/(tabs)");
        return;
      }
      // workerStatus is null (still loading) — stay put
      return;
    } else {
      // manager — send to tabs if on a public/auth screen
      if (isPublic) router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, role, workerStatus, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F4F6FB" }}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Orqaga" }}>
      <Stack.Screen name="role-select" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="worker-login" options={{ headerShown: false }} />
      <Stack.Screen name="worker-register" options={{ headerShown: false }} />
      <Stack.Screen name="worker-pending" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="product-form"
        options={{
          presentation: "modal",
          title: "Mahsulot",
          headerShown: true,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        (window as Window & { __hideSplash?: () => void }).__hideSplash?.();
      }
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="auto" translucent={false} />
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <AuthProvider queryClient={queryClient}>
                  <RootLayoutNav />
                </AuthProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
