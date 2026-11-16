import { Redirect, Tabs } from "expo-router";
import { Text, View, type ColorValue } from "react-native";
import { useAuth } from "@/lib/supabase/AuthProvider";

function tabIcon(label: string) {
  return function TabBarIcon({ color }: { color: ColorValue | null }) {
    return (
      <Text
        style={{ color: color ?? undefined, fontSize: 20, fontWeight: "700" }}
      >
        {label}
      </Text>
    );
  };
}

export default function TabLayout() {
  const { session, loading, configured } = useAuth();
  if (loading)
    return (
      <View>
        <Text>Loading account…</Text>
      </View>
    );
  if (!configured) return <Redirect href="/" />;
  if (!session) return <Redirect href="/sign-in" />;
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: tabIcon("H") }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: "Tasks", tabBarIcon: tabIcon("T") }}
      />
      <Tabs.Screen
        name="pets"
        options={{ title: "Pets", tabBarIcon: tabIcon("P") }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{ title: "Vehicles", tabBarIcon: tabIcon("V") }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Account", tabBarIcon: tabIcon("A") }}
      />
    </Tabs>
  );
}
