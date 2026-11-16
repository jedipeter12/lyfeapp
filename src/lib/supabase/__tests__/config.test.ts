import { getSupabaseConfig } from "../config";

const original = {
  environment: process.env.EXPO_PUBLIC_APP_ENV,
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

afterEach(() => {
  if (original.environment === undefined)
    delete process.env.EXPO_PUBLIC_APP_ENV;
  else process.env.EXPO_PUBLIC_APP_ENV = original.environment;
  if (original.url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = original.url;
  if (original.key === undefined)
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = original.key;
});

test("requires an explicit environment and rejects an insecure production URL", () => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";
  delete process.env.EXPO_PUBLIC_APP_ENV;
  expect(getSupabaseConfig()).toBeNull();

  process.env.EXPO_PUBLIC_APP_ENV = "production";
  expect(getSupabaseConfig()).toBeNull();

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://production.example.test";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_example";
  expect(getSupabaseConfig()).toBeNull();

  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";
  expect(getSupabaseConfig()).toEqual({
    url: "https://production.example.test",
    publishableKey: "sb_publishable_example",
  });
});
