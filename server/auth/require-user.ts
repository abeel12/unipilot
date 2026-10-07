import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { apiError } from "@/server/http/errors";

export interface Authed {
  user: User;
  client: SupabaseClient;
}

export async function requireUser(request: Request): Promise<{ auth: Authed } | { response: Response }> {
  const header = request.headers.get("authorization") ?? "";
  const token = /^bearer\s+/i.test(header) ? header.replace(/^bearer\s+/i, "").trim() : "";
  if (!token) {
    return { response: apiError(401, "AUTH_REQUIRED", "Sign in to continue.") };
  }

  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) {
    return { response: apiError(503, "SUPABASE_UNAVAILABLE", "Supabase is not configured on the server.") };
  }

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return { response: apiError(401, "AUTH_REQUIRED", "Sign in to continue.") };
  }
  return { auth: { user: data.user, client } };
}
