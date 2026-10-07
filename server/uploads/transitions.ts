export const PIPELINE_STATUSES = [
  "uploaded",
  "parsing",
  "analyzing",
  "subject_matching",
  "waiting_for_subject",
  "assessment_review",
  "waiting_for_weightage",
  "validation_failed",
  "waiting_for_approval",
  "approved",
  "queued",
  "connecting_university",
  "reading_portal",
  "creating_assessments",
  "uploading_marks",
  "verifying",
  "completed",
  "partially_completed",
  "failed",
  "cancelled",
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

const NEXT: Record<PipelineStatus, PipelineStatus[]> = {
  uploaded: ["parsing", "failed", "cancelled"],
  parsing: ["analyzing", "failed", "cancelled"],
  analyzing: ["subject_matching", "waiting_for_weightage", "failed", "cancelled"],
  subject_matching: ["waiting_for_subject", "assessment_review", "waiting_for_weightage", "waiting_for_approval", "failed"],
  waiting_for_subject: ["subject_matching", "assessment_review", "waiting_for_weightage", "waiting_for_approval", "cancelled"],
  assessment_review: ["waiting_for_weightage", "waiting_for_approval", "validation_failed", "cancelled"],
  waiting_for_weightage: ["waiting_for_approval", "validation_failed", "assessment_review", "cancelled"],
  validation_failed: ["waiting_for_weightage", "assessment_review", "cancelled"],
  waiting_for_approval: ["approved", "waiting_for_weightage", "cancelled"],
  approved: ["cancelled"],
  queued: [],
  connecting_university: [],
  reading_portal: [],
  creating_assessments: [],
  uploading_marks: [],
  verifying: [],
  completed: [],
  partially_completed: [],
  failed: [],
  cancelled: [],
};

export function canTransition(from: PipelineStatus, to: PipelineStatus) {
  return NEXT[from].includes(to);
}

export type UiUploadStatus =
  | "Completed"
  | "Processing"
  | "Waiting for Weightage"
  | "Waiting for Approval"
  | "Failed"
  | "Needs Review"
  | "Approved";

export function uiStatusFor(status: PipelineStatus): UiUploadStatus {
  switch (status) {
    case "waiting_for_weightage":
      return "Waiting for Weightage";
    case "waiting_for_approval":
      return "Waiting for Approval";
    case "approved":
      return "Approved";
    case "failed":
      return "Failed";
    case "completed":
      return "Completed";
    case "parsing":
    case "analyzing":
    case "subject_matching":
    case "uploaded":
      return "Processing";
    default:
      return "Needs Review";
  }
}

export function reviewStatus(input: { parseError: boolean; requiresManualSubject: boolean; weightageMode: "full" | "partial" | "none" }): PipelineStatus {
  if (input.parseError) return "failed";
  if (input.requiresManualSubject) return "waiting_for_subject";
  if (input.weightageMode !== "full") return "waiting_for_weightage";
  return "waiting_for_approval";
}
