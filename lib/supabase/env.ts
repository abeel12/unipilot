function present(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/your-project|your-anon|your-publishable|your-secret/i.test(trimmed)) return undefined;
  return trimmed;
}

/** Project URL from Supabase → Project Settings → API. */
export function supabaseUrl() {
  return present(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/**
 * Browser key. In the dashboard this is the publishable key, or the legacy anon key.
 * It is safe to expose because Row Level Security limits each teacher to their own rows.
 */
export function supabasePublishableKey() {
  return present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}
