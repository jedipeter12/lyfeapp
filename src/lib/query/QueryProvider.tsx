import NetInfo from "@react-native-community/netinfo";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/lib/supabase/AuthProvider";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1 },
    mutations: { retry: false, networkMode: "always" },
  },
});

function QueryLifecycle() {
  const { session, loading } = useAuth();
  const userId = session?.user.id;
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) =>
        setOnline(
          state.isConnected === true && state.isInternetReachable !== false,
        ),
      ),
    );
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    focusManager.setFocused(AppState.currentState === "active");
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (loading) return;
    const nextUserId = userId ?? null;
    if (
      previousUserId.current !== undefined &&
      previousUserId.current !== nextUserId
    ) {
      queryClient.clear();
    }
    previousUserId.current = nextUserId;
  }, [userId, loading]);

  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryLifecycle />
      {children}
    </QueryClientProvider>
  );
}
