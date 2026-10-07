import { requireUser } from "@/server/auth/require-user";
import { classifyAction } from "@/server/agent/actions";
import { issueTicket } from "@/server/agent/store";
import { apiError } from "@/server/http/errors";
import { getServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.string().min(1).max(80),
  adapterKey: z.string().min(1).max(40).default("mock"),
}).strict();

export async function POST(request: Request) {
  const gate = await requireUser(request);
  if ("response" in gate) return gate.response;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return apiError(400, "UNKNOWN_ACTION", "That university action is not available.");
  const classified = classifyAction(parsed.data.action);
  if (!classified.ok) return apiError(403, classified.code, classified.message);
  try {
    const result = await issueTicket(getServerClient(), gate.auth.user.id, classified.action, parsed.data.adapterKey);
    if ("response" in result) return result.response;
    return Response.json(result.body);
  } catch {
    return apiError(503, "SUPABASE_UNAVAILABLE", "Supabase is not configured on the server.");
  }
}
