import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/env";

/**
 * Server-only client. Uses SUPABASE_SECRET_KEY (the dashboard secret key, or the legacy service_role key).
 * This key bypasses Row Level Security. Never import this file from a client component, and never prefix the env var with NEXT_PUBLIC_.
 * Login, courses, and marks use the browser client instead.
 */
export function getServerClient() {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key || /your-secret/i.test(key)) {
    throw new Error("SUPABASE_SECRET_KEY is missing. Add it to .env.local and keep it off the client.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
