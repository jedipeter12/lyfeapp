import { Stack } from "expo-router";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { AuthProvider } from "@/lib/supabase/AuthProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";

export default function RootLayout() {
  const dark = useColorScheme() === "dark";
  return (
    <AuthProvider>
      <QueryProvider>
        <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
