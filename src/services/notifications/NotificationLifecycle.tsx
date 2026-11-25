import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { reconcileLocalReminders } from "./localNotifications";

export function NotificationLifecycle() {
  const { session, loading } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (loading) return;
    const sync = () => {
      void reconcileLocalReminders(userId).catch(() => {
        // The next foreground event retries after a network or device error.
      });
    };
    sync();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => subscription.remove();
  }, [userId, loading]);

  return null;
}
