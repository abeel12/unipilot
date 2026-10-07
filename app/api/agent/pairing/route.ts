import { requireUser } from "@/server/auth/require-user";
import { createPairingCode } from "@/server/agent/store";
import { apiError } from "@/server/http/errors";
import { getServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireUser(request);
  if ("response" in gate) return gate.response;
  try {
    const result = await createPairingCode(getServerClient(), gate.auth.user.id);
    if ("response" in result) return result.response;
    return Response.json(result.body);
  } catch {
    return apiError(503, "SUPABASE_UNAVAILABLE", "Supabase is not configured on the server.");
  }
}
