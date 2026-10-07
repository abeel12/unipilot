import { requireUser } from "@/server/auth/require-user";
import { apiError, isSchemaMissing } from "@/server/http/errors";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireUser(request);
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  let result = await gate.auth.client.from("upload_jobs").select("id, status, pipeline_status, progress, detail, course_code, course_name, file_name, student_count, assessment_count, approval_hash, approved_at, created_at, completed_at").eq("id", id).maybeSingle();
  if (result.error && isSchemaMissing(result.error.message)) {
    result = await gate.auth.client.from("upload_jobs").select("id, status, progress, detail, course_code, course_name, file_name, student_count, assessment_count, created_at, completed_at").eq("id", id).maybeSingle();
  }
  if (result.error) return apiError(500, "UPLOAD_FAILED", "The upload could not be loaded.");
  if (!result.data) return apiError(404, "COURSE_NOT_FOUND", "That upload was not found.");
  const data = result.data;
  const detail = String(data.detail ?? "");
  return Response.json({
    id: data.id,
    status: data.status === "Needs Review" && detail.startsWith("Approved by the teacher") ? "Approved" : data.status,
    pipelineStatus: "pipeline_status" in data ? data.pipeline_status : null,
    progress: data.progress,
    detail: data.detail,
    courseCode: data.course_code,
    courseName: data.course_name,
    fileName: data.file_name,
    studentCount: data.student_count,
    assessmentCount: data.assessment_count,
    approved: ("approval_hash" in data && Boolean(data.approval_hash)) || detail.startsWith("Approved by the teacher"),
    approvedAt: "approved_at" in data ? data.approved_at : null,
    createdAt: data.created_at,
    completedAt: data.completed_at,
  });
}
