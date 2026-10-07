import { bearer, latestApprovedMarks } from "@/server/agent/store";
import { apiError } from "@/server/http/errors";
import { getServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = bearer(request);
  if (!secret) return apiError(401, "AGENT_NOT_PAIRED", "This agent is not paired.");
  try {
    const result = await latestApprovedMarks(getServerClient(), secret);
    if ("response" in result) return result.response;
    return Response.json(result.body);
  } catch {
    return apiError(503, "SUPABASE_UNAVAILABLE", "Supabase is not configured on the server.");
  }
}
