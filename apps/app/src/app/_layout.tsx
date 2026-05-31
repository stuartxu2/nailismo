import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Fredoka_600SemiBold, Fredoka_700Bold } from "@expo-google-fonts/fredoka";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";

import { useCart } from "@/store/cart";
import { useFit } from "@/store/fit";

export default function RootLayout() {
  const hydrateCart = useCart((s) => s.hydrate);
  const hydrateFit = useFit((s) => s.hydrate);

  const [fontsLoaded] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    hydrateCart();
    hydrateFit();
  }, [hydrateCart, hydrateFit]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[handle]" options={{ presentation: "card" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
