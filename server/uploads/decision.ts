import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSchemaMissing } from "@/server/http/errors";
import { logEvent } from "@/server/log";
import { prepareApproval, type ExtractedIssue, type ExtractedStudent, type Resolution } from "@/server/uploads/approve";
import { canTransition, type PipelineStatus } from "@/server/uploads/transitions";

const assessmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["Assignment", "Quiz", "Presentation", "Project", "Lab", "Midterm", "Final", "Other"]),
  maxMarks: z.number().positive().max(1000),
  weightage: z.number().min(0).max(100).nullable(),
});

const studentSchema = z.object({
  studentId: z.string().trim().min(1).max(40),
  name: z.string().trim().max(160),
  marks: z.record(z.string(), z.number().nullable()),
});

const issueSchema = z.object({
  id: z.string().min(1).max(160),
  kind: z.string().min(1).max(40),
  studentCode: z.string().max(40).optional(),
  studentName: z.string().max(160).optional(),
  enteredMarks: z.number().optional(),
  maxMarks: z.number().optional(),
});

const approveSchema = z.object({
  courseId: z.uuid(),
  assessments: z.array(assessmentSchema).min(1).max(40),
  resolutions: z.record(z.string(), z.enum(["cap", "exclude"])).optional(),
  students: z.array(studentSchema).max(5000).optional(),
  issues: z.array(issueSchema).max(5000).optional(),
});

export async function approveUpload(client: SupabaseClient, teacherId: string, jobId: string, body: unknown) {
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: { code: "ASSESSMENT_INVALID", message: "The approval payload is incomplete.", details: { issues: parsed.error.issues.length } } } };
  }

  let jobResult = await client.from("upload_jobs").select("id, status, pipeline_status, approval_hash, extracted_data, course_code").eq("id", jobId).maybeSingle();
  if (jobResult.error && isSchemaMissing(jobResult.error.message)) {
    jobResult = await client.from("upload_jobs").select("id, status, course_code").eq("id", jobId).maybeSingle();
  }
  if (jobResult.error) return { status: 500, body: { error: { code: "UPLOAD_FAILED", message: "The upload could not be loaded." } } };
  if (!jobResult.data) return { status: 404, body: { error: { code: "COURSE_NOT_FOUND", message: "That upload was not found." } } };

  const pipeline = jobResult.data.pipeline_status ? (String(jobResult.data.pipeline_status) as PipelineStatus) : null;
  const legacyStatus = String(jobResult.data.status ?? "");
  if (pipeline ? !canApprove(pipeline) : legacyStatus === "Failed" || legacyStatus === "Completed") {
    return { status: 409, body: { error: { code: "UPLOAD_FAILED", message: "This upload cannot be approved from its current state." } } };
  }

  const course = await client.from("courses").select("id, code, name").eq("id", parsed.data.courseId).maybeSingle();
  if (course.error || !course.data) {
    return { status: 404, body: { error: { code: "COURSE_NOT_FOUND", message: "Choose one of your courses." } } };
  }

  const extracted = (jobResult.data.extracted_data ?? {}) as {
    students?: ExtractedStudent[];
    issues?: ExtractedIssue[];
  };
  const storedStudents = extracted.students ?? [];
  const decision = prepareApproval({
    courseId: parsed.data.courseId,
    assessments: parsed.data.assessments,
    students: storedStudents.length > 0 ? storedStudents : (parsed.data.students ?? []),
    issues: (extracted.issues ?? parsed.data.issues ?? []) as ExtractedIssue[],
    resolutions: (parsed.data.resolutions ?? {}) as Record<string, Resolution>,
  });
  if (!decision.ok) {
    return { status: 422, body: { error: { code: decision.code, message: decision.message, details: decision.details } } };
  }

  if (pipeline === "approved" && jobResult.data.approval_hash === decision.hash) {
    return { status: 200, body: await presentJob(client, jobId) };
  }

  const now = new Date().toISOString();
  const detail = "Approved by the teacher. University portal writes are off, so no grades were changed.";
  const counts = {
    course_id: course.data.id,
    course_code: course.data.code,
    course_name: course.data.name,
    progress: 100,
    assessment_count: decision.payload.assessments.length,
    student_count: decision.payload.students.length,
    detail,
    entries_verified: 0,
    errors: 0,
  };
  let saved = await client
    .from("upload_jobs")
    .update({
      ...counts,
      status: "Approved",
      pipeline_status: "approved",
      confirmed_data: decision.payload,
      approval_hash: decision.hash,
      approved_at: now,
      approved_by: teacherId,
    })
    .eq("id", jobId)
    .select("id")
    .single();
  if (saved.error && /check constraint|pipeline_status|approved_by|approval_hash|confirmed_data|schema cache|column/i.test(saved.error.message)) {
    saved = await client.from("upload_jobs").update({ ...counts, status: "Needs Review" }).eq("id", jobId).select("id").single();
  }

  if (saved.error) {
    logEvent("error", "approval_save_failed", { teacherId, jobId, message: saved.error.message });
    return { status: 500, body: { error: { code: "UPLOAD_FAILED", message: "The approval could not be saved." } } };
  }

  const approval = await client.from("approval_records").insert({
    upload_job_id: jobId,
    teacher_id: teacherId,
    payload_hash: decision.hash,
  });
  if (approval.error && !isSchemaMissing(approval.error.message)) {
    logEvent("error", "approval_record_failed", { teacherId, jobId, message: approval.error.message });
  }
  await client.from("upload_sections").delete().eq("job_id", jobId);
  const sectionsSaved = await client.from("upload_sections").insert(
    decision.payload.assessments.map((item) => ({
      job_id: jobId,
      name: item.name,
      type: item.type,
      max_marks: Math.round(item.maxMarks),
      weightage: item.weightage ?? 0,
      university_status: "Will Create",
    })),
  );
  if (sectionsSaved.error) {
    logEvent("error", "approval_sections_failed", { teacherId, jobId, message: sectionsSaved.error.message });
    return { status: 500, body: { error: { code: "UPLOAD_FAILED", message: "The approved assessments could not be saved." } } };
  }
  const activity = {
    teacher_id: teacherId,
    course_code: course.data.code,
    action: "TEACHER_APPROVED",
    status: "Success",
    message: "Teacher approved the confirmed marks. No university write was started.",
  };
  const logged = await client.from("activity_logs").insert({ ...activity, upload_job_id: jobId });
  if (logged.error) await client.from("activity_logs").insert(activity);

  logEvent("info", "upload_approved", { teacherId, jobId, courseId: course.data.id });
  return { status: 200, body: await presentJob(client, jobId) };
}

function canApprove(status: PipelineStatus) {
  if (status === "approved") return true;
  if (canTransition(status, "approved")) return true;
  return canTransition(status, "waiting_for_approval");
}

async function presentJob(client: SupabaseClient, jobId: string) {
  const { data, error } = await client.from("upload_jobs").select("*, upload_sections(*)").eq("id", jobId).maybeSingle();
  if (error || !data) return { id: jobId, status: "Approved" };
  const sections = (Array.isArray(data.upload_sections) ? data.upload_sections : []) as Array<{
    name: string;
    type: "Assignment" | "Quiz" | "Presentation" | "Project" | "Lab" | "Midterm" | "Final" | "Other";
    max_marks: number;
    weightage: number | string;
    university_status: "Will Create" | "Exists";
  }>;
  return {
    id: data.id,
    courseId: data.course_id ?? "",
    courseCode: data.course_code,
    courseName: data.course_name,
    title: data.title,
    fileName: data.file_name,
    status: data.status === "Needs Review" && String(data.detail ?? "").startsWith("Approved by the teacher") ? "Approved" : data.status,
    progress: data.progress,
    studentCount: data.student_count,
    assessmentCount: data.assessment_count,
    createdAt: data.created_at,
    completedAt: data.completed_at,
    detail: data.detail,
    entriesVerified: data.entries_verified,
    errors: data.errors,
    sections: sections.map((section) => ({
      name: section.name,
      type: section.type,
      maxMarks: section.max_marks,
      weightage: Number(section.weightage),
      universityStatus: section.university_status,
    })),
  };
}
