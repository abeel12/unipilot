import type { ConnectionStatus, UploadStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

const uploadTone: Record<UploadStatus, "success" | "info" | "warning" | "violet" | "danger" | "neutral"> = {
  Completed: "success",
  Processing: "info",
  "Waiting for Weightage": "warning",
  "Waiting for Approval": "violet",
  Failed: "danger",
  "Needs Review": "warning",
  Approved: "success",
};

export function StatusBadge({ status, pulse = false }: { status: string; pulse?: boolean }) {
  const tone =
    status in uploadTone
      ? uploadTone[status as UploadStatus]
      : status === "Connected" || status === "Exact Match" || status === "Valid" || status === "Active" || status === "Complete"
        ? "success"
        : status === "Exists" || status === "No Action"
          ? "neutral"
          : status === "Will Create" || status === "Create" || status === "Detected"
            ? "info"
            : status === "Missing" || status === "Partial" || status === "Session Expired" || status === "MFA Required"
              ? "warning"
              : status === "Failed" || status === "Connection Failed" || status === "Disconnected" || status === "Authentication Required"
                ? "danger"
                : "neutral";

  const live = pulse || status === "Connected" || status === "Processing" || status === "Active";

  return (
    <Badge tone={tone}>
      {live ? (
        <span className="relative flex size-1.5" aria-hidden>
          <span className="status-ping absolute inline-flex size-full rounded-full bg-current" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {status}
    </Badge>
  );
}

export function connectionTone(status: ConnectionStatus) {
  return status;
}
