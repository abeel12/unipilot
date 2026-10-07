import type { UniversityConnection } from "@/types";

/** A live LMS link is one the local agent verified. A saved status label is not enough. */
export function liveUniversityConnection(connection: Pick<UniversityConnection, "status" | "connectionMethod"> | null | undefined) {
  return connection?.status === "Connected" && connection.connectionMethod === "local_agent_browser";
}

export function universityConnectionLabel(connection: Pick<UniversityConnection, "status" | "connectionMethod"> | null | undefined) {
  if (!connection) return "No connection found";
  if (connection.connectionMethod !== "local_agent_browser") return "No connection found";
  if (connection.status === "Disconnected") return "No connection found";
  return connection.status;
}
