import { Stack } from "expo-router";
import { ThemeProvider } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/supabase/AuthProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { navigationTheme, useAppTheme } from "@/theme";

export default function RootLayout() {
  const { scheme } = useAppTheme();
  return (
    <AuthProvider>
      <QueryProvider>
        <ThemeProvider value={navigationTheme(scheme)}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        </ThemeProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
