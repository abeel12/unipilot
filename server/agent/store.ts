import type { SupabaseClient } from "@supabase/supabase-js";
import { adapterFor, classifyAction, type AgentAction } from "@/server/agent/actions";
import { hashesEqual, randomToken, sha256 } from "@/server/agent/tokens";
import { apiError } from "@/server/http/errors";

const MIGRATION = "Run supabase/migrations/20260930200000_local_agent.sql in the Supabase SQL editor, then try again.";

export function agentSchemaMissing(message: string | undefined) {
  return /unipilot_devices|agent_pairing_codes|agent_command_tickets|connection_method|schema cache|column/i.test(message ?? "");
}

function migrationError() {
  return apiError(503, "MIGRATION_REQUIRED", MIGRATION);
}

export async function createPairingCode(client: SupabaseClient, teacherId: string) {
  const code = randomToken(24);
  const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await client.from("agent_pairing_codes").delete().eq("teacher_id", teacherId).is("used_at", null);
  const { error } = await client.from("agent_pairing_codes").insert({
    teacher_id: teacherId,
    code_hash: sha256(code),
    expires_at: expires,
  });
  if (error) {
    if (agentSchemaMissing(error.message)) return { response: migrationError() };
    return { response: apiError(500, "PAIRING_FAILED", "The pairing code could not be created.") };
  }
  return { body: { code, expiresAt: expires } };
}

export async function completePairing(client: SupabaseClient, input: { code: string; deviceName: string; devicePublicId: string }) {
  const now = new Date().toISOString();
  const { data: row, error } = await client
    .from("agent_pairing_codes")
    .select("id, teacher_id, expires_at, used_at")
    .eq("code_hash", sha256(input.code))
    .maybeSingle();
  if (error) {
    if (agentSchemaMissing(error.message)) return { response: migrationError() };
    return { response: apiError(401, "AGENT_NOT_PAIRED", "The pairing code is not valid.") };
  }
  if (!row || row.used_at || String(row.expires_at) < now) {
    return { response: apiError(401, "AGENT_NOT_PAIRED", "The pairing code is not valid.") };
  }

  const secret = randomToken(32);
  const secretHash = sha256(secret);
  const { data: existing } = await client.from("unipilot_devices").select("id").eq("device_public_id", input.devicePublicId).maybeSingle();
  let deviceId = "";
  if (existing?.id) {
    await client.from("unipilot_devices").update({ status: "revoked" }).eq("teacher_id", row.teacher_id).eq("status", "paired").neq("id", existing.id);
    const { error: updateError } = await client
      .from("unipilot_devices")
      .update({
        teacher_id: row.teacher_id,
        device_name: input.deviceName.slice(0, 80),
        secret_hash: secretHash,
        status: "paired",
        paired_at: now,
        last_seen_at: now,
      })
      .eq("id", existing.id);
    if (updateError) return { response: apiError(500, "PAIRING_FAILED", "This computer could not be linked.") };
    deviceId = String(existing.id);
  } else {
    await client.from("unipilot_devices").update({ status: "revoked" }).eq("teacher_id", row.teacher_id).eq("status", "paired");
    const { data: device, error: deviceError } = await client
      .from("unipilot_devices")
      .insert({
        teacher_id: row.teacher_id,
        device_name: input.deviceName.slice(0, 80),
        device_public_id: input.devicePublicId,
        secret_hash: secretHash,
        status: "paired",
        paired_at: now,
        last_seen_at: now,
      })
      .select("id")
      .single();
    if (deviceError || !device) {
      if (agentSchemaMissing(deviceError?.message)) return { response: migrationError() };
      return { response: apiError(500, "PAIRING_FAILED", "This computer could not be linked.") };
    }
    deviceId = String(device.id);
  }
  await client.from("agent_pairing_codes").update({ used_at: now }).eq("id", row.id);
  await client.from("activity_logs").insert({
    teacher_id: row.teacher_id,
    course_code: "LMS",
    action: "AGENT_PAIRED",
    status: "Success",
    message: "UniPilot Agent was paired with this account. No university password was stored.",
  });
  return { body: { deviceId, deviceSecret: secret, teacherId: String(row.teacher_id) } };
}

async function deviceFromSecret(client: SupabaseClient, secret: string) {
  const { data, error } = await client
    .from("unipilot_devices")
    .select("id, teacher_id, secret_hash, status")
    .eq("secret_hash", sha256(secret))
    .eq("status", "paired")
    .maybeSingle();
  if (error || !data) return null;
  if (!hashesEqual(String(data.secret_hash), sha256(secret))) return null;
  return data;
}

export async function issueTicket(client: SupabaseClient, teacherId: string, action: AgentAction, adapterKey: string) {
  const adapter = adapterFor(adapterKey);
  if (!adapter) return { response: apiError(400, "UNIVERSITY_NOT_SUPPORTED", "That university is not available yet.") };
  const { data: device, error: deviceError } = await client
    .from("unipilot_devices")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("status", "paired")
    .order("paired_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (deviceError) {
    if (agentSchemaMissing(deviceError.message)) return { response: migrationError() };
    return { response: apiError(401, "AGENT_NOT_PAIRED", "Pair UniPilot Agent before connecting the university.") };
  }
  if (!device) return { response: apiError(401, "AGENT_NOT_PAIRED", "Pair UniPilot Agent before connecting the university.") };

  const ticket = randomToken(32);
  const expires = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  const { error } = await client.from("agent_command_tickets").insert({
    teacher_id: teacherId,
    device_id: device.id,
    action,
    adapter_key: adapter.key,
    ticket_hash: sha256(ticket),
    expires_at: expires,
  });
  if (error) {
    if (agentSchemaMissing(error.message)) return { response: migrationError() };
    return { response: apiError(500, "AGENT_NOT_PAIRED", "The university request could not be authorized.") };
  }
  return { body: { ticket, expiresAt: expires, action } };
}

export async function redeemTicket(client: SupabaseClient, secret: string, ticket: string) {
  const device = await deviceFromSecret(client, secret);
  if (!device) return { response: apiError(401, "AGENT_NOT_PAIRED", "This agent is not paired.") };
  const now = new Date().toISOString();
  const { data: row, error } = await client
    .from("agent_command_tickets")
    .select("id, teacher_id, device_id, action, adapter_key, expires_at, used_at")
    .eq("ticket_hash", sha256(ticket))
    .maybeSingle();
  if (error || !row || row.used_at || String(row.expires_at) < now || String(row.device_id) !== String(device.id)) {
    return { response: apiError(401, "AGENT_NOT_PAIRED", "This university request has expired. Try again from UniPilot.") };
  }
  const classified = classifyAction(String(row.action));
  if (!classified.ok) return { response: apiError(403, classified.code, classified.message) };
  const adapter = adapterFor(String(row.adapter_key));
  if (!adapter) return { response: apiError(400, "UNIVERSITY_NOT_SUPPORTED", "That university is not available yet.") };
  await client.from("agent_command_tickets").update({ used_at: now }).eq("id", row.id);
  await client.from("unipilot_devices").update({ last_seen_at: now }).eq("id", device.id);
  return {
    body: {
      action: classified.action,
      teacherId: String(row.teacher_id),
      adapterKey: adapter.key,
      deviceId: String(device.id),
    },
  };
}

type AgentEventName =
  | "UNIVERSITY_BROWSER_OPENED"
  | "UNIVERSITY_LOGIN_DETECTED"
  | "UNIVERSITY_CONNECTED"
  | "UNIVERSITY_SESSION_VERIFIED"
  | "UNIVERSITY_SESSION_EXPIRED"
  | "UNIVERSITY_DISCONNECTED"
  | "COURSES_READ"
  | "ASSESSMENTS_READ";

export async function recordAgentEvent(
  client: SupabaseClient,
  secret: string,
  input: {
    event: AgentEventName;
    adapterKey: string;
    accountName?: string;
    courseCount?: number;
    universityName?: string;
    portalHost?: string;
  },
) {
  const device = await deviceFromSecret(client, secret);
  if (!device) return { response: apiError(401, "AGENT_NOT_PAIRED", "This agent is not paired.") };
  const adapter = adapterFor(input.adapterKey);
  if (!adapter) return { response: apiError(400, "UNIVERSITY_NOT_SUPPORTED", "That university is not available yet.") };

  const now = new Date().toISOString();
  const account = (input.accountName ?? "").replace(/[\r\n]/g, " ").slice(0, 120);
  const changesStatus =
    input.event === "UNIVERSITY_CONNECTED" ||
    input.event === "UNIVERSITY_SESSION_VERIFIED" ||
    input.event === "UNIVERSITY_SESSION_EXPIRED" ||
    input.event === "UNIVERSITY_DISCONNECTED" ||
    input.event === "COURSES_READ";

  if (changesStatus) {
    let status: "Connected" | "Disconnected" | "Session Expired" = "Connected";
    let session: "Active" | "Inactive" | "Expired" = "Active";
    if (input.event === "UNIVERSITY_SESSION_EXPIRED") {
      status = "Session Expired";
      session = "Expired";
    } else if (input.event === "UNIVERSITY_DISCONNECTED") {
      status = "Disconnected";
      session = "Inactive";
    }
    const portalHost = input.portalHost && /^[a-z0-9.-]+$/i.test(input.portalHost) && !/^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0)/i.test(input.portalHost) ? input.portalHost : "";
    const universityName = (input.universityName || (portalHost ? portalHost : adapter.name)).replace(/[\r\n]/g, " ").slice(0, 80);
    const patch: Record<string, unknown> = {
      status,
      session,
      connection_method: "local_agent_browser",
      adapter_key: adapter.key,
      device_id: device.id,
      university: universityName,
      portal_name: portalHost ? `${universityName} Portal` : adapter.portalName,
      last_verified_at: status === "Disconnected" ? null : now,
    };
    if (portalHost) patch.portal_url = `https://${portalHost}/`;
    if (account) patch.account_name = account;
    if (status === "Connected") patch.last_authentication = now;

    let updated = await client.from("university_connections").update(patch).eq("teacher_id", device.teacher_id);
    if (updated.error && agentSchemaMissing(updated.error.message)) {
      const basic: Record<string, unknown> = { status, session, university: universityName, portal_name: portalHost ? `${universityName} Portal` : adapter.portalName };
      if (account) basic.account_name = account;
      if (status === "Connected") basic.last_authentication = now;
      updated = await client.from("university_connections").update(basic).eq("teacher_id", device.teacher_id);
    }
    if (updated.error) return { response: apiError(500, "AUTOMATION_FAILED", "The university connection could not be saved.") };
    if (status === "Connected" && universityName) {
      await client.from("profiles").update({ university: universityName }).eq("id", device.teacher_id);
    }
  }

  const message =
    input.event === "COURSES_READ"
      ? `Read ${input.courseCount ?? 0} courses from the university portal.`
      : input.event === "UNIVERSITY_DISCONNECTED"
        ? "The dedicated university browser profile was removed from this computer."
        : input.event === "UNIVERSITY_SESSION_EXPIRED"
          ? "The university session is no longer signed in."
          : "The university portal was reached through the local browser. No password was stored.";

  await client.from("activity_logs").insert({
    teacher_id: device.teacher_id,
    course_code: "LMS",
    action: input.event,
    status: input.event === "UNIVERSITY_SESSION_EXPIRED" ? "Warning" : "Success",
    message,
  });
  return { body: { ok: true } };
}

export async function latestApprovedMarks(client: SupabaseClient, secret: string) {
  const device = await deviceFromSecret(client, secret);
  if (!device) return { response: apiError(401, "AGENT_NOT_PAIRED", "This agent is not paired.") };
  const { data, error } = await client
    .from("upload_jobs")
    .select("course_code, course_name, file_name, confirmed_data, pipeline_status, approval_hash, detail, approved_at")
    .eq("teacher_id", device.teacher_id)
    .not("approval_hash", "is", null)
    .order("approved_at", { ascending: false })
    .limit(5);
  if (error) return { response: apiError(500, "UPLOAD_FAILED", "The approved marks file could not be read.") };
  const job = (data ?? []).find((row) => row.pipeline_status === "approved" || String(row.detail ?? "").startsWith("Approved by the teacher"));
  const payload = job?.confirmed_data as { students?: Array<{ studentId?: string; name?: string; marks?: Record<string, number | null> }> } | null;
  const students = Array.isArray(payload?.students) ? payload.students : [];
  const entries = students.slice(0, 60).map((student) => ({
    studentId: String(student.studentId ?? "").slice(0, 40),
    name: String(student.name ?? "").slice(0, 80),
    marks: Object.fromEntries(
      Object.entries(student.marks ?? {})
        .filter((entry): entry is [string, number] => typeof entry[1] === "number")
        .slice(0, 12)
        .map(([name, score]) => [name.slice(0, 80), score]),
    ),
  }));
  return {
    body: {
      courseCode: String(job?.course_code ?? "").slice(0, 40),
      courseName: String(job?.course_name ?? "").slice(0, 120),
      fileName: String(job?.file_name ?? "").slice(0, 120),
      students: entries.filter((student) => student.studentId || student.name),
    },
  };
}

export function bearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return /^bearer\s+/i.test(header) ? header.replace(/^bearer\s+/i, "").trim() : "";
}
