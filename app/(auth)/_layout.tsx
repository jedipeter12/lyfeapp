import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { AppScreen } from "@/components/ui/AppScreen";
import { FeedbackState } from "@/components/ui/FeedbackState";

export default function AuthLayout() {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <AppScreen centered>
        <FeedbackState kind="loading" title="Loading account…" />
      </AppScreen>
    );
  if (session) return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
