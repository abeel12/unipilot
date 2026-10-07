const SENSITIVE = /authorization|cookie|api[_-]?key|secret|password|token|session/i;

export function logEvent(level: "info" | "error", event: string, fields: Record<string, unknown> = {}) {
  const safe: Record<string, unknown> = { level, event, at: new Date().toISOString() };
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE.test(key)) continue;
    safe[key] = value;
  }
  const line = JSON.stringify(safe);
  if (level === "error") console.error(line);
  else console.info(line);
}
