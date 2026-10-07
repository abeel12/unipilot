import { requireUser } from "@/server/auth/require-user";
import { ingestUpload } from "@/server/uploads/ingest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireUser(request);
  if ("response" in gate) return gate.response;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: { code: "UPLOAD_FAILED", message: "Attach a marks file." } }, { status: 400 });
  }
  const result = await ingestUpload(gate.auth.client, gate.auth.user.id, file);
  return Response.json(result.body, { status: result.status });
}
