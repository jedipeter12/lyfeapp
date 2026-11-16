export type SupabaseConfig = { url: string; publishableKey: string };

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const environment = process.env.EXPO_PUBLIC_APP_ENV;

  if (
    !url ||
    !publishableKey ||
    !publishableKey.startsWith("sb_publishable_") ||
    (environment !== "development" && environment !== "production")
  ) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" &&
      !(environment === "development" && parsed.hostname === "127.0.0.1")
    ) {
      return null;
    }
    return { url: parsed.toString().replace(/\/$/, ""), publishableKey };
  } catch {
    return null;
  }
}
