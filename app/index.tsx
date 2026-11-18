import { Redirect } from "expo-router";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { AppScreen } from "@/components/ui/AppScreen";
import { FeedbackState } from "@/components/ui/FeedbackState";

export default function Index() {
  const { session, loading, configured } = useAuth();
  if (loading)
    return (
      <AppScreen centered>
        <FeedbackState kind="loading" title="Loading account…" />
      </AppScreen>
    );
  if (!configured)
    return (
      <AppScreen centered>
        <FeedbackState
          kind="error"
          title="Account setup needed"
          description="Supabase is not configured. See docs/DEVELOPMENT.md."
        />
      </AppScreen>
    );
  return <Redirect href={session ? "/home" : "/sign-in"} />;
}
