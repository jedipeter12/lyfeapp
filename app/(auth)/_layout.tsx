import { Redirect, Stack } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/supabase/AuthProvider";

export default function AuthLayout() {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <View>
        <Text>Loading account…</Text>
      </View>
    );
  if (session) return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
