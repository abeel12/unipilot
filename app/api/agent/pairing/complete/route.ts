import { completePairing } from "@/server/agent/store";
import { apiError } from "@/server/http/errors";
import { getServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().min(20).max(200),
  deviceName: z.string().min(1).max(80),
  devicePublicId: z.string().min(8).max(80),
}).strict();

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return apiError(400, "AGENT_NOT_PAIRED", "The pairing request is not valid.");
  try {
    const result = await completePairing(getServerClient(), parsed.data);
    if ("response" in result) return result.response;
    return Response.json(result.body);
  } catch {
    return apiError(503, "SUPABASE_UNAVAILABLE", "Supabase is not configured on the server.");
  }
}
