import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { AppScreen } from "@/components/ui/AppScreen";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { useAppTheme } from "@/theme";

export default function TabLayout() {
  const { session, loading, configured } = useAuth();
  const { colors } = useAppTheme();
  if (loading)
    return (
      <AppScreen centered>
        <FeedbackState kind="loading" title="Loading account…" />
      </AppScreen>
    );
  if (!configured) return <Redirect href="/" />;
  if (!session) return <Redirect href="/sign-in" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 56,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen name="pets" options={{ title: "Pets" }} />
      <Tabs.Screen name="vehicles" options={{ title: "Vehicles" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
