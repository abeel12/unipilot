import http from "node:http";
import { pathToFileURL } from "node:url";
import { PortalError } from "./adapter";
import { createConnectionManager } from "./connection-manager";
import { appOrigin, ensureDeviceIdentity, readDevice, writeDevice } from "./device-store";
import { startMockLms } from "./mock-lms";
import { checkOrigin, isLoopback } from "./origin";
import { loadOpenAiEnv } from "./prompt-agent";

const WRITE_PATHS = new Set(["/portal/assessments/create", "/portal/marks/upload", "/portal/marks/verify"]);

function send(res: http.ServerResponse, status: number, body: unknown, origin: string | null) {
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Unipilot-View");
  }
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function fail(res: http.ServerResponse, error: unknown, origin: string | null) {
  if (error instanceof PortalError) {
    send(res, error.code === "WRITE_DISABLED" ? 403 : 400, { error: { code: error.code, message: error.message } }, origin);
    return;
  }
  send(res, 500, { error: { code: "AUTOMATION_FAILED", message: "UniPilot Agent could not complete that request." } }, origin);
}

async function readJson(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 20000) throw new PortalError("UNKNOWN_ACTION", "The request is too large.");
    chunks.push(chunk as Buffer);
  }
  if (size === 0) return {} as Record<string, unknown>;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PortalError("UNKNOWN_ACTION", "The request is not valid.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new PortalError("UNKNOWN_ACTION", "The request is not valid.");
  const body = parsed as Record<string, unknown>;
  if ("javascript" in body || "selector" in body || "script" in body) {
    throw new PortalError("UNKNOWN_ACTION", "The agent accepts university actions, not page scripts.");
  }
  return body;
}

async function appJson(path: string, body: unknown, secret?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret) headers.authorization = `Bearer ${secret}`;
  const response = await fetch(new URL(path, appOrigin()), { method: "POST", headers, body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string }; deviceSecret?: string; teacherId?: string; action?: string } | null;
  if (!response.ok) {
    throw new PortalError(payload?.error?.code ?? "AUTOMATION_FAILED", payload?.error?.message ?? "UniPilot refused this request.");
  }
  return payload;
}

async function redeem(ticket: unknown) {
  if (typeof ticket !== "string" || ticket.length < 20) throw new PortalError("AGENT_NOT_PAIRED", "This university request is missing its approval.");
  const device = readDevice();
  if (!device?.deviceSecret) throw new PortalError("AGENT_NOT_PAIRED", "Pair UniPilot Agent with your account first.");
  const payload = await appJson("/api/agent/tickets/redeem", { ticket }, device.deviceSecret);
  if (!payload?.action || !payload.teacherId) throw new PortalError("AGENT_NOT_PAIRED", "This university request was refused.");
  return { action: payload.action, teacherId: payload.teacherId, adapterKey: "mock" };
}

export async function startAgent(options: { port?: number; mockPort?: number } = {}) {
  loadOpenAiEnv();
  const mock = await startMockLms(options.mockPort ?? Number(process.env.MOCK_LMS_PORT ?? 47322));
  const manager = createConnectionManager(mock.origin);
  ensureDeviceIdentity();

  const server = http.createServer(async (req, res) => {
    if (!isLoopback(req.socket.remoteAddress)) {
      send(res, 403, { error: { code: "AGENT_NOT_PAIRED", message: "UniPilot Agent only accepts this computer." } }, null);
      return;
    }
    const originHeader = req.headers.origin;
    const decision = checkOrigin(originHeader);
    const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    if (!decision.ok) {
      send(res, 403, { error: { code: "AGENT_NOT_PAIRED", message: "This site cannot use UniPilot Agent." } }, null);
      return;
    }
    if (req.method === "OPTIONS") {
      if (!decision.origin) {
        send(res, 403, { error: { code: "AGENT_NOT_PAIRED", message: "This site cannot use UniPilot Agent." } }, null);
        return;
      }
      send(res, 204, {}, decision.origin);
      return;
    }
    try {
      if (req.method === "GET" && path === "/health") {
        const body = decision.origin
          ? { ok: true, service: "unipilot-agent", paired: Boolean(readDevice()?.deviceSecret) }
          : { ok: true, service: "unipilot-agent" };
        send(res, 200, body, decision.origin);
        return;
      }
      if (!decision.origin) {
        send(res, 403, { error: { code: "AGENT_NOT_PAIRED", message: "Open UniPilot in the browser to use the agent." } }, null);
        return;
      }
      if (req.method === "GET" && path === "/connection/status") {
        send(res, 200, manager.snapshot(), decision.origin);
        return;
      }
      if (req.method === "GET" && path === "/browser/frame") {
        const header = req.headers["x-unipilot-view"];
        const viewToken = Array.isArray(header) ? header[0] : header;
        if (!manager.viewMatches(viewToken)) {
          send(res, 401, { error: { code: "AGENT_NOT_PAIRED", message: "Open the university panel from UniPilot." } }, decision.origin);
          return;
        }
        const frame = await manager.capture();
        res.writeHead(200, {
          "content-type": "image/jpeg",
          "cache-control": "no-store",
          "access-control-allow-origin": decision.origin,
          "access-control-expose-headers": "x-unipilot-scroll-y, x-unipilot-scroll-height, x-unipilot-client-height",
          "x-unipilot-scroll-y": String(frame.scrollY),
          "x-unipilot-scroll-height": String(frame.scrollHeight),
          "x-unipilot-client-height": String(frame.clientHeight),
          vary: "Origin",
        });
        res.end(frame.jpeg);
        return;
      }
      if (req.method !== "POST") {
        send(res, 404, { error: { code: "UNKNOWN_ACTION", message: "That agent request does not exist." } }, decision.origin);
        return;
      }
      if (WRITE_PATHS.has(path)) {
        send(res, 403, { error: { code: "WRITE_DISABLED", message: "University writes are off. UniPilot can connect and read the portal only." } }, decision.origin);
        return;
      }
      if (path === "/browser/input") {
        const header = req.headers["x-unipilot-view"];
        const viewToken = Array.isArray(header) ? header[0] : header;
        if (!manager.viewMatches(viewToken)) {
          send(res, 401, { error: { code: "AGENT_NOT_PAIRED", message: "Open the university panel from UniPilot." } }, decision.origin);
          return;
        }
        const body = await readJson(req);
        const result = await manager.interact(body);
        send(res, 200, result, decision.origin);
        return;
      }
      const commands: Record<string, string> = {
        "/connection/start": "START_CONNECTION",
        "/connection/open": "OPEN_PORTAL",
        "/connection/verify": "VERIFY_SESSION",
        "/connection/disconnect": "DISCONNECT",
        "/portal/courses/read": "READ_COURSES",
        "/portal/assessments/read": "READ_ASSESSMENTS",
      };
      if (path !== "/pair" && !commands[path]) {
        send(res, 404, { error: { code: "UNKNOWN_ACTION", message: "That agent request does not exist." } }, decision.origin);
        return;
      }
      const body = await readJson(req);
      if (path === "/pair") {
        if (typeof body.code !== "string") throw new PortalError("AGENT_NOT_PAIRED", "The pairing code is missing.");
        const identity = ensureDeviceIdentity();
        const paired = await appJson("/api/agent/pairing/complete", {
          code: body.code,
          deviceName: identity.deviceName,
          devicePublicId: identity.devicePublicId,
        });
        if (!paired?.deviceSecret || !paired.teacherId) throw new PortalError("AGENT_NOT_PAIRED", "Pairing did not finish.");
        writeDevice({ ...identity, deviceSecret: paired.deviceSecret, teacherId: paired.teacherId });
        send(res, 200, { paired: true }, decision.origin);
        return;
      }
      const granted = await redeem(body.ticket);
      if (granted.action !== commands[path]) throw new PortalError("UNKNOWN_ACTION", "That university action is not available.");
      if (path === "/connection/start" || path === "/connection/open") {
        if (manager.busy) {
          send(res, 200, manager.snapshot(), decision.origin);
          return;
        }
        void manager.start(granted.teacherId);
        send(res, 202, manager.snapshot(), decision.origin);
        return;
      }
      if (path === "/connection/verify" && granted.action === "VERIFY_SESSION") {
        send(res, 200, await manager.verify(granted.teacherId), decision.origin);
        return;
      }
      if (path === "/connection/disconnect" && granted.action === "DISCONNECT") {
        send(res, 200, await manager.disconnect(granted.teacherId), decision.origin);
        return;
      }
      if (path === "/portal/courses/read" && granted.action === "READ_COURSES") {
        send(res, 200, await manager.readCourses(granted.teacherId), decision.origin);
        return;
      }
      if (path === "/portal/assessments/read" && granted.action === "READ_ASSESSMENTS") {
        const portalId = typeof body.portalId === "string" ? body.portalId : "";
        const assessments = await manager.readAssessments(granted.teacherId, portalId);
        send(res, 200, { assessments }, decision.origin);
        return;
      }
      send(res, 404, { error: { code: "UNKNOWN_ACTION", message: "That agent request does not exist." } }, decision.origin);
    } catch (error) {
      fail(res, error, decision.ok ? decision.origin : null);
    }
  });

  await new Promise<void>((resolve) => server.listen(options.port ?? Number(process.env.AGENT_PORT ?? 47321), "127.0.0.1", () => resolve()));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 47321;
  return {
    port,
    mockPort: mock.port,
    close: async () => {
      await manager.stop();
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      await mock.close();
    },
  };
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry === import.meta.url) {
  startAgent()
    .then(({ port, mockPort }) => {
      console.log(`UniPilot Agent listening on http://127.0.0.1:${port}`);
      console.log(`Test university portal on http://127.0.0.1:${mockPort}`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "UniPilot Agent could not start.");
      process.exit(1);
    });
}
