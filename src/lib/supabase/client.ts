import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
import { secureAuthStorage } from "./secureStorage";

const config = getSupabaseConfig();

export const supabase = config
  ? createClient(config.url, config.publishableKey, {
      auth: {
        storage: secureAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;
