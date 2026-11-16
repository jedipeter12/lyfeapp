import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

type AuthState = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
};
const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  configured: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let mounted = true;
    const { data: listener } = client.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (mounted) {
          setSession(nextSession);
          setLoading(false);
        }
      },
    );
    client.auth.getSession().then(
      ({ data, error }) => {
        if (mounted) {
          setSession(error ? null : data.session);
          setLoading(false);
        }
      },
      () => {
        if (mounted) setLoading(false);
      },
    );
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    if (AppState.currentState === "active") client.auth.startAutoRefresh();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      appState.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, loading, configured: Boolean(supabase) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
