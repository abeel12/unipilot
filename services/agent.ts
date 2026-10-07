import { getBrowserClient } from "@/lib/supabase/browser";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://127.0.0.1:47321";

export interface AgentCourse {
  portalId: string;
  code: string;
  name: string;
  semester: string;
  section: string;
}

export interface AgentSnapshot {
  phase: "idle" | "BROWSER_OPENING" | "LMS_OPENED" | "WAITING_FOR_LOGIN" | "AUTHENTICATED" | "READING" | "SESSION_EXPIRED" | "FAILED";
  message: string;
  accountName: string | null;
  courses: AgentCourse[] | null;
  errorCode: string | null;
  viewToken?: string | null;
  pageLabel?: string | null;
}

async function authHeader() {
  const { data } = await getBrowserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to continue.");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function appPost(path: string, body: unknown) {
  const response = await fetch(path, { method: "POST", headers: await authHeader(), body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string }; code?: string; ticket?: string } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? "UniPilot could not authorize the university request.");
  return payload ?? {};
}

async function agentPost(path: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(`${AGENT_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("UniPilot Agent is not running.");
  }
  const payload = (await response.json().catch(() => null)) as (AgentSnapshot & { error?: { message?: string; code?: string }; assessments?: { name: string }[] }) | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? "The university request failed.");
  return payload;
}

export async function readAgentHealth() {
  try {
    const response = await fetch(`${AGENT_URL}/health`, { cache: "no-store" });
    if (!response.ok) return { running: false, paired: false };
    const body = (await response.json()) as { paired?: boolean };
    return { running: true, paired: Boolean(body.paired) };
  } catch {
    return { running: false, paired: false };
  }
}

export async function readAgentStatus() {
  const response = await fetch(`${AGENT_URL}/connection/status`, { cache: "no-store" });
  if (!response.ok) throw new Error("UniPilot Agent did not report a status.");
  return (await response.json()) as AgentSnapshot;
}

export async function pairAgent() {
  const pairing = (await appPost("/api/agent/pairing", {})) as { code?: string };
  if (!pairing.code) throw new Error("The pairing code was not created.");
  await agentPost("/pair", { code: pairing.code });
}

export async function startUniversityConnection() {
  const ticket = await appPost("/api/agent/tickets", { action: "START_CONNECTION", adapterKey: "mock" });
  return agentPost("/connection/start", { ticket: ticket.ticket });
}

export async function openUniversityPortal() {
  const ticket = await appPost("/api/agent/tickets", { action: "OPEN_PORTAL", adapterKey: "mock" });
  return agentPost("/connection/open", { ticket: ticket.ticket });
}

export async function verifyUniversitySession() {
  const ticket = await appPost("/api/agent/tickets", { action: "VERIFY_SESSION", adapterKey: "mock" });
  return agentPost("/connection/verify", { ticket: ticket.ticket });
}

export async function disconnectUniversityAgent() {
  const ticket = await appPost("/api/agent/tickets", { action: "DISCONNECT", adapterKey: "mock" });
  return agentPost("/connection/disconnect", { ticket: ticket.ticket });
}

export async function readUniversityCourses() {
  const ticket = await appPost("/api/agent/tickets", { action: "READ_COURSES", adapterKey: "mock" });
  return agentPost("/portal/courses/read", { ticket: ticket.ticket });
}

export async function fetchPortalFrame(viewToken: string) {
  const response = await fetch(`${AGENT_URL}/browser/frame`, {
    cache: "no-store",
    headers: { "x-unipilot-view": viewToken },
  });
  if (!response.ok) throw new Error("The university panel is not available.");
  return {
    blob: await response.blob(),
    scrollY: Number(response.headers.get("x-unipilot-scroll-y")) || 0,
    scrollHeight: Number(response.headers.get("x-unipilot-scroll-height")) || 0,
    clientHeight: Number(response.headers.get("x-unipilot-client-height")) || 0,
  };
}

export async function sendPortalInput(viewToken: string, body: { kind: "open" | "click" | "type" | "press" | "prompt" | "scroll"; address?: string; prompt?: string; text?: string; key?: string; x?: number; y?: number }) {
  let response: Response;
  try {
    response = await fetch(`${AGENT_URL}/browser/input`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-unipilot-view": viewToken },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("UniPilot Agent is not running.");
  }
  const payload = (await response.json().catch(() => null)) as { message?: string; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? "The university panel could not do that.");
  return payload?.message ?? "Done.";
}
