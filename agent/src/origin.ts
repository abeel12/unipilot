const DEFAULT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

export function allowedOrigins() {
  const extra = (process.env.UNIPILOT_WEB_ORIGIN ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.startsWith("http://") || item.startsWith("https://"));
  return [...DEFAULT_ORIGINS, ...extra];
}

export function checkOrigin(origin: string | undefined): { ok: true; origin: string | null } | { ok: false } {
  if (!origin) return { ok: true, origin: null };
  if (allowedOrigins().includes(origin)) return { ok: true, origin };
  return { ok: false };
}

export function isLoopback(address: string | undefined) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}
