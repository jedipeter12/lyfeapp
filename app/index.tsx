import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/supabase/AuthProvider";

export default function Index() {
  const { session, loading, configured } = useAuth();
  if (loading)
    return (
      <View>
        <Text>Loading account…</Text>
      </View>
    );
  if (!configured)
    return (
      <View>
        <Text>Supabase is not configured. See docs/DEVELOPMENT.md.</Text>
      </View>
    );
  return <Redirect href={session ? "/home" : "/sign-in"} />;
}
