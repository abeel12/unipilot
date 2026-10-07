import type { SupabaseClient } from "@supabase/supabase-js";
import { matchCourses, type CourseCandidate, type CourseSignal } from "@/server/courses/match";
import { gridFromXlsx, interpretGrid, parseCsv, type ParsedDocument } from "@/server/documents/tabular";
import { extensionOf, safeFileName, validateUpload } from "@/server/documents/files";
import { isSchemaMissing } from "@/server/http/errors";
import { logEvent } from "@/server/log";
import { canTransition, reviewStatus, uiStatusFor, type PipelineStatus } from "@/server/uploads/transitions";
import type { DetectedIssue, DocumentAnalysis, SubjectMatch } from "@/types";

interface IngestResult {
  status: number;
  body: unknown;
}

export async function ingestUpload(client: SupabaseClient, teacherId: string, file: File): Promise<IngestResult> {
  const check = validateUpload({ name: file.name, type: file.type, size: file.size });
  if (!check.ok) return { status: 400, body: { error: { code: check.code, message: check.message } } };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const baseJob = {
    teacher_id: teacherId,
    course_code: "PENDING",
    course_name: "Pending analysis",
    title: "Marks upload",
    file_name: safeFileName(file.name),
    status: "Processing",
    progress: 5,
    detail: "File accepted.",
  };
  let legacy = false;
  let inserted = await client.from("upload_jobs").insert({ ...baseJob, pipeline_status: "uploaded" }).select("id").single();
  if (inserted.error && isSchemaMissing(inserted.error.message)) {
    legacy = true;
    inserted = await client.from("upload_jobs").insert(baseJob).select("id").single();
  }

  if (inserted.error || !inserted.data) {
    if (isSchemaMissing(inserted.error?.message)) {
      return {
        status: 503,
        body: {
          error: {
            code: "MIGRATION_REQUIRED",
            message: "Run supabase/migrations/20260930183000_upload_pipeline.sql in the Supabase SQL editor, then upload again.",
          },
        },
      };
    }
    logEvent("error", "upload_job_insert_failed", { teacherId, message: inserted.error?.message });
    return { status: 500, body: { error: { code: "UPLOAD_FAILED", message: "The upload could not be saved." } } };
  }

  const jobId = String(inserted.data.id);
  const storagePath = `${teacherId}/${jobId}/${safeFileName(file.name)}`;
  const stored = await client.storage.from("marks-files").upload(storagePath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  const storageWarning = stored.error ? "The original file could not be stored privately. The analysis below is from this upload only." : "";
  if (stored.error) logEvent("error", "marks_file_store_failed", { teacherId, jobId, message: stored.error.message });

  const extension = extensionOf(file.name);
  let parsed: ParsedDocument;
  try {
    parsed = await readDocument(extension, bytes, file.name);
  } catch (error) {
    logEvent("error", "document_parse_failed", { teacherId, jobId, message: error instanceof Error ? error.message : "parse failed" });
    parsed = {
      parseError: true,
      subjectCode: null,
      subjectName: null,
      courseCodes: [],
      assessments: [],
      students: [],
      issues: [{ id: "issue-parse", kind: "file-parse", message: "We couldn't understand this file completely.", resolved: false }],
      weightageMode: "none",
      warnings: [],
    };
  }

  const courses = await loadCourses(client);
  const matched = matchCourses({ code: parsed.subjectCode, name: parsed.subjectName }, courses);
  const severalCodes = parsed.courseCodes.length > 1;
  const selected = severalCodes || parsed.parseError ? null : matched.selected;
  const requiresManualSubject = parsed.parseError ? false : severalCodes || matched.requiresManualSubject;
  const subjectNotFound = !parsed.parseError && !selected && matched.subjectNotFound;
  const pipeline = walk(parsed.parseError ? ["parsing", "failed"] : ["parsing", "analyzing", "subject_matching", reviewStatus({
    parseError: false,
    requiresManualSubject,
    weightageMode: parsed.weightageMode,
  })]);

  const course = selected ? courses.find((item) => item.id === selected.courseId) : undefined;
  const issues = subjectIssues(parsed.issues, subjectNotFound, parsed.subjectCode);
  const analysis: DocumentAnalysis & { jobId: string } = {
    jobId,
    fileName: file.name,
    fileSize: file.size,
    subject: selected
      ? {
          courseId: selected.courseId,
          code: selected.code,
          name: selected.name,
          semester: selected.semester,
          section: selected.section,
          confidence: Math.round(selected.score * 100),
          match: "Exact Match",
        }
      : null,
    matches: matched.candidates.slice(0, 5).map((candidate) => toMatch(candidate, candidate.courseId === selected?.courseId)),
    requiresManualSubject,
    subjectNotFound: Boolean(subjectNotFound && !selected),
    parseError: parsed.parseError,
    assessments: parsed.assessments,
    studentCount: parsed.students.length,
    issues,
    weightageMode: parsed.weightageMode,
    students: parsed.students,
  };

  const detail = parsed.parseError
    ? (issues[0]?.message ?? "The file could not be read.")
    : parsed.weightageMode === "full" && selected
      ? "Weightage totals 100%. Approve to save this upload. The university portal will not be changed."
      : requiresManualSubject
        ? "Choose the course before approval. Nothing is sent to the university."
        : "Enter the missing weightage. Nothing is sent to the university.";
  const fullDetail = storageWarning ? `${detail} ${storageWarning}` : detail;

  const shared = {
    course_id: course?.id ?? null,
    course_code: course?.code ?? parsed.subjectCode ?? "UNMATCHED",
    course_name: course?.name ?? parsed.subjectName ?? "Unmatched",
    title: `${course?.code ?? parsed.subjectCode ?? "Marks"} upload`,
    status: uiStatusFor(pipeline),
    progress: parsed.parseError ? 100 : 40,
    student_count: parsed.students.length,
    assessment_count: parsed.assessments.length,
    detail: fullDetail,
  };
  const extracted = {
    promptVersion: "deterministic-tabular-v1",
    model: null,
    subjectCode: parsed.subjectCode,
    subjectName: parsed.subjectName,
    assessments: parsed.assessments,
    students: parsed.students,
    issues,
    warnings: parsed.warnings,
  };
  let updated = legacy
    ? await client.from("upload_jobs").update(shared).eq("id", jobId)
    : await client.from("upload_jobs").update({ ...shared, storage_path: stored.error ? null : storagePath, pipeline_status: pipeline, extracted_data: extracted }).eq("id", jobId);
  if (!legacy && updated.error && isSchemaMissing(updated.error.message)) {
    legacy = true;
    updated = await client.from("upload_jobs").update(shared).eq("id", jobId);
  }

  if (updated.error) {
    logEvent("error", "upload_job_update_failed", { teacherId, jobId, message: updated.error.message });
    return { status: 500, body: { error: { code: "UPLOAD_FAILED", message: "The analysis could not be saved." } } };
  }

  const courseCode = course?.code ?? parsed.subjectCode ?? "UNMATCHED";
  const activity = [
    { teacher_id: teacherId, course_code: courseCode, action: "FILE_UPLOADED", status: "Info", message: stored.error ? "Marks file was read. Private storage is not available yet." : "Marks file stored in a private bucket." },
    { teacher_id: teacherId, course_code: courseCode, action: "DOCUMENT_PARSED", status: parsed.parseError ? "Failed" : "Success", message: fullDetail },
  ];
  const logged = await client.from("activity_logs").insert(activity.map((item) => ({ ...item, upload_job_id: jobId })));
  if (logged.error) await client.from("activity_logs").insert(activity);

  logEvent("info", "document_analyzed", {
    teacherId,
    jobId,
    status: pipeline,
    students: parsed.students.length,
    assessments: parsed.assessments.length,
  });
  return { status: 200, body: analysis };
}

async function readDocument(extension: string, bytes: Uint8Array, fileName: string): Promise<ParsedDocument> {
  if (extension === ".csv") {
    return interpretGrid(parseCsv(new TextDecoder().decode(bytes)), fileName);
  }
  if (extension === ".xlsx") {
    const grid = await gridFromXlsx(bytes);
    return interpretGrid(grid, fileName);
  }
  if (extension === ".xls") {
    return unreadable("Save this workbook as .xlsx or .csv and upload it again.");
  }
  return unreadable("PDF and DOCX reading is not enabled yet. Upload an Excel or CSV marks file.");
}

function unreadable(message: string): ParsedDocument {
  return {
    parseError: true,
    subjectCode: null,
    subjectName: null,
    courseCodes: [],
    assessments: [],
    students: [],
    issues: [{ id: "issue-parse", kind: "file-parse", message, resolved: false }],
    weightageMode: "none",
    warnings: [],
  };
}

function walk(steps: PipelineStatus[]) {
  let current: PipelineStatus = "uploaded";
  for (const step of steps) {
    if (!canTransition(current, step)) {
      throw new Error(`Invalid upload transition ${current} -> ${step}`);
    }
    current = step;
  }
  return current;
}

async function loadCourses(client: SupabaseClient): Promise<CourseSignal[]> {
  const { data, error } = await client.from("courses").select("id, code, name, semester, section");
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    semester: String(row.semester),
    section: String(row.section),
  }));
}

function subjectIssues(issues: DetectedIssue[], subjectNotFound: boolean, code: string | null): DetectedIssue[] {
  if (!subjectNotFound) return issues;
  return [
    ...issues,
    {
      id: "issue-subject",
      kind: "subject-not-found",
      message: code ? `No course matched ${code}. Choose the course yourself.` : "Choose the course yourself. No course was detected.",
      resolved: false,
    },
  ];
}

function toMatch(candidate: CourseCandidate, exact: boolean): SubjectMatch {
  return {
    courseId: candidate.courseId,
    code: candidate.code,
    name: candidate.name,
    semester: candidate.semester,
    section: candidate.section,
    confidence: Math.round(candidate.score * 100),
    match: exact ? "Exact Match" : "Possible Match",
  };
}

