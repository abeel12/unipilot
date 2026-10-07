import { featureFlags } from "@/server/flags";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

export async function GET() {
  const flags = featureFlags();
  return Response.json({
    application: "ok",
    database: isSupabaseConfigured() ? "configured" : "missing",
    redis: "not_enabled",
    portalWrites: flags.realPortalWrites,
    readOnlyMode: flags.readOnlyMode,
    dryRun: flags.dryRun,
  });
}
