import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export { isSupabaseConfigured };

let client: SupabaseClient | null = null;

export function getBrowserClient() {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) throw new Error("Supabase is not configured");
  client ??= createBrowserClient(url, key);
  return client;
}
