import { recordAgentEvent, bearer } from "@/server/agent/store";
import { apiError } from "@/server/http/errors";
import { getServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  event: z.enum([
    "UNIVERSITY_BROWSER_OPENED",
    "UNIVERSITY_LOGIN_DETECTED",
    "UNIVERSITY_CONNECTED",
    "UNIVERSITY_SESSION_VERIFIED",
    "UNIVERSITY_SESSION_EXPIRED",
    "UNIVERSITY_DISCONNECTED",
    "COURSES_READ",
    "ASSESSMENTS_READ",
  ]),
  adapterKey: z.string().min(1).max(40),
  accountName: z.string().max(120).optional(),
  courseCount: z.number().int().min(0).max(500).optional(),
  universityName: z.string().min(1).max(80).optional(),
  portalHost: z.string().regex(/^[a-z0-9.-]+$/i).max(120).optional(),
}).strict();

export async function POST(request: Request) {
  const secret = bearer(request);
  if (!secret) return apiError(401, "AGENT_NOT_PAIRED", "This agent is not paired.");
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return apiError(400, "AUTOMATION_FAILED", "The agent report was rejected.");
  try {
    const result = await recordAgentEvent(getServerClient(), secret, parsed.data);
    if ("response" in result) return result.response;
    return Response.json(result.body);
  } catch {
    return apiError(503, "SUPABASE_UNAVAILABLE", "Supabase is not configured on the server.");
  }
}
