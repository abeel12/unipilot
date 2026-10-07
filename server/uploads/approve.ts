import { createHash } from "node:crypto";
import { checkWeightage } from "@/server/grading/weightage";
import { normalizeStudentId } from "@/server/students/ids";

export interface ApprovalAssessment {
  name: string;
  type: string;
  maxMarks: number;
  weightage: number | null;
}

export interface ExtractedStudent {
  studentId: string;
  name: string;
  marks: Record<string, number | null>;
}

export interface ExtractedIssue {
  id: string;
  kind: string;
  studentCode?: string;
  studentName?: string;
  enteredMarks?: number;
  maxMarks?: number;
}

export type Resolution = "cap" | "exclude";

export interface ApprovalPayload {
  courseId: string;
  assessments: ApprovalAssessment[];
  students: ExtractedStudent[];
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function payloadHash(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function prepareApproval(input: {
  courseId: string;
  assessments: ApprovalAssessment[];
  students: ExtractedStudent[];
  issues: ExtractedIssue[];
  resolutions: Record<string, Resolution>;
}): { ok: true; payload: ApprovalPayload; hash: string } | { ok: false; code: string; message: string; details?: Record<string, unknown> } {
  if (!input.courseId) {
    return { ok: false, code: "COURSE_NOT_FOUND", message: "Choose the course before approving." };
  }
  if (input.issues.some((issue) => issue.kind === "file-parse")) {
    return { ok: false, code: "UPLOAD_FAILED", message: "This file could not be read, so it cannot be approved." };
  }

  const weight = checkWeightage(input.assessments.map((item) => item.weightage));
  if (!weight.valid) {
    return {
      ok: false,
      code: weight.missing > 0 ? "WEIGHTAGE_MISSING" : "WEIGHTAGE_INVALID",
      message: weight.missing > 0 ? "Enter the missing assessment weightage." : `Assessment weightage totals ${weight.total}%.`,
      details: { currentTotal: weight.total, requiredTotal: 100, remaining: weight.remaining, excess: weight.excess },
    };
  }

  const blocking = input.issues.filter((issue) => issue.kind === "invalid-marks" || issue.kind === "student-not-found");
  const uncovered = blocking.filter((issue) => !input.resolutions[issue.id]);
  if (uncovered.length > 0) {
    return {
      ok: false,
      code: "MARKS_INVALID",
      message: "Resolve every invalid mark before approval.",
      details: { issueIds: uncovered.map((issue) => issue.id) },
    };
  }

  const excluded = new Set(
    blocking
      .filter((issue) => input.resolutions[issue.id] === "exclude" && issue.studentCode)
      .map((issue) => normalizeStudentId(issue.studentCode ?? "").normalizedStudentId),
  );
  const cappedStudents = new Set(
    blocking
      .filter((issue) => input.resolutions[issue.id] === "cap" && issue.studentCode)
      .map((issue) => normalizeStudentId(issue.studentCode ?? "").normalizedStudentId),
  );

  const maxByName = new Map(input.assessments.map((item) => [item.name, item.maxMarks]));
  const students: ExtractedStudent[] = [];
  for (const student of input.students) {
    const id = normalizeStudentId(student.studentId);
    if (excluded.has(id.normalizedStudentId)) continue;
    const marks: Record<string, number | null> = {};
    for (const [name, score] of Object.entries(student.marks)) {
      const max = maxByName.get(name);
      if (score == null || max == null) {
        marks[name] = score;
        continue;
      }
      if (score > max) {
        if (!cappedStudents.has(id.normalizedStudentId)) {
          return {
            ok: false,
            code: "MARKS_INVALID",
            message: `${student.studentId} has ${score} for ${name}, above the maximum of ${max}.`,
            details: { studentId: student.studentId, assessment: name, score, maxMarks: max },
          };
        }
        marks[name] = max;
        continue;
      }
      if (score < 0) {
        return { ok: false, code: "MARKS_INVALID", message: `${student.studentId} has a negative mark for ${name}.` };
      }
      marks[name] = score;
    }
    students.push({ studentId: id.normalizedStudentId, name: student.name, marks });
  }

  const payload: ApprovalPayload = {
    courseId: input.courseId,
    assessments: [...input.assessments].sort((a, b) => a.name.localeCompare(b.name)),
    students,
  };
  return { ok: true, payload, hash: payloadHash(payload) };
}
