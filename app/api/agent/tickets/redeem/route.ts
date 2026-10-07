import { redeemTicket, bearer } from "@/server/agent/store";
import { apiError } from "@/server/http/errors";
import { getServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  ticket: z.string().min(20).max(200),
}).strict();

export async function POST(request: Request) {
  const secret = bearer(request);
  if (!secret) return apiError(401, "AGENT_NOT_PAIRED", "This agent is not paired.");
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return apiError(401, "AGENT_NOT_PAIRED", "This university request is not valid.");
  try {
    const result = await redeemTicket(getServerClient(), secret, parsed.data.ticket);
    if ("response" in result) return result.response;
    return Response.json(result.body);
  } catch {
    return apiError(503, "SUPABASE_UNAVAILABLE", "Supabase is not configured on the server.");
  }
}
