import { requireUser } from "@/server/auth/require-user";
import { apiError } from "@/server/http/errors";
import { portalWritesEnabled } from "@/server/flags";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireUser(request);
  if ("response" in gate) return gate.response;
  if (!portalWritesEnabled()) {
    return apiError(403, "REAL_PORTAL_WRITES_DISABLED", "University portal writes are turned off. This approval did not change any grades.");
  }
  return apiError(403, "REAL_PORTAL_WRITES_DISABLED", "The university worker is not enabled.");
}
