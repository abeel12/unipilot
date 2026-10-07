import { requireUser } from "@/server/auth/require-user";
import { approveUpload } from "@/server/uploads/decision";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireUser(request);
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const result = await approveUpload(gate.auth.client, gate.auth.user.id, id, body);
  return Response.json(result.body, { status: result.status });
}
