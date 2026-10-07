export const READ_ACTIONS = ["START_CONNECTION", "VERIFY_SESSION", "OPEN_PORTAL", "READ_COURSES", "READ_ASSESSMENTS", "DISCONNECT"] as const;

export const WRITE_ACTIONS = ["CREATE_ASSESSMENT", "UPLOAD_MARKS", "VERIFY_MARKS"] as const;

export type AgentAction = (typeof READ_ACTIONS)[number];

/** Writes stay refused until a later milestone turns them on in code, not only in an env flag. */
export function classifyAction(action: string): { ok: true; action: AgentAction } | { ok: false; code: "WRITE_DISABLED" | "UNKNOWN_ACTION"; message: string } {
  if ((WRITE_ACTIONS as readonly string[]).includes(action)) {
    return {
      ok: false,
      code: "WRITE_DISABLED",
      message: "University writes are off. UniPilot can connect and read the portal only.",
    };
  }
  if ((action === "READ_COURSES" || action === "READ_ASSESSMENTS") && process.env.UNIVERSITY_READ_ENABLED === "false") {
    return { ok: false, code: "UNKNOWN_ACTION", message: "University reading is turned off." };
  }
  if (!(READ_ACTIONS as readonly string[]).includes(action)) {
    return { ok: false, code: "UNKNOWN_ACTION", message: "That university action is not available." };
  }
  return { ok: true, action: action as AgentAction };
}

export const ADAPTERS = {
  mock: {
    key: "mock",
    name: "UniPilot Test University",
    portalName: "Local Test Portal",
  },
} as const;

export type AdapterKey = keyof typeof ADAPTERS;

export function adapterFor(key: string) {
  if (key in ADAPTERS) return ADAPTERS[key as AdapterKey];
  return null;
}
