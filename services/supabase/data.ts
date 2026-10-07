import { getBrowserClient } from "@/lib/supabase/browser";
import { clearWorkspace, disconnectUniversity, removeSeededDemo } from "@/services/supabase/seed-workspace";
import type {
  ActivityLog,
  ActivityStatus,
  Assessment,
  AssessmentType,
  ConnectionStatus,
  Course,
  Student,
  Teacher,
  UniversityConnection,
  UploadJob,
  UploadSectionSummary,
  UploadStatus,
} from "@/types";

type Row = Record<string, unknown>;

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function avatarKey(id: string) {
  return `unipilot-avatar:${id}`;
}

function rememberedAvatar(id: string) {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(avatarKey(id));
  return stored?.startsWith("data:image/") ? stored : null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? "A"}${parts[1]?.[0] ?? parts[0]?.[1] ?? "K"}`.toUpperCase();
}

function mapTeacher(row: Row): Teacher {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    department: String(row.department),
    university: String(row.university),
    title: String(row.title),
    avatarInitials: String(row.avatar_initials),
    avatarUrl: typeof row.avatar_url === "string" && row.avatar_url.startsWith("data:image/") ? row.avatar_url : rememberedAvatar(String(row.id)),
  };
}

function mapCourse(row: Row): Course {
  const grading = Array.isArray(row.grading) ? row.grading : [];
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    semester: String(row.semester),
    section: String(row.section),
    studentCount: Number(row.student_count),
    grading: grading.map((item) => {
      const entry = item as { name?: string; weightage?: number };
      return { name: String(entry.name ?? ""), weightage: Number(entry.weightage ?? 0) };
    }),
  };
}

function mapAssessment(row: Row): Assessment {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    name: String(row.name),
    type: String(row.type) as AssessmentType,
    maxMarks: Number(row.max_marks),
    weightage: row.weightage == null ? null : Number(row.weightage),
    source: row.source as Assessment["source"],
    confidence: row.confidence == null ? null : Number(row.confidence),
    universityStatus: row.university_status as Assessment["universityStatus"],
    createdAt: String(row.created_at).slice(0, 10),
  };
}

function mapStudent(row: Row): Student {
  const marks = Array.isArray(row.student_marks) ? row.student_marks : [];
  return {
    id: String(row.id),
    studentCode: String(row.student_code),
    name: String(row.name),
    courseId: String(row.course_id),
    marksStatus: row.marks_status as Student["marksStatus"],
    completedAssessments: Number(row.completed_assessments),
    totalAssessments: Number(row.total_assessments),
    overallPercentage: row.overall_percentage == null ? null : Number(row.overall_percentage),
    marks: marks.map((item) => {
      const mark = item as { assessment_id?: string; score?: number | null };
      return { assessmentId: String(mark.assessment_id), score: mark.score == null ? null : Number(mark.score) };
    }),
  };
}

function mapConnection(row: Row): UniversityConnection {
  return {
    university: String(row.university),
    portalName: String(row.portal_name),
    status: row.status as ConnectionStatus,
    session: row.session as UniversityConnection["session"],
    accountName: String(row.account_name),
    lastAuthentication: row.last_authentication ? String(row.last_authentication) : null,
    connectionMethod: row.connection_method ? String(row.connection_method) : null,
    lastVerified: row.last_verified_at ? String(row.last_verified_at) : null,
  };
}

function mapJob(row: Row): UploadJob {
  const sections = Array.isArray(row.upload_sections) ? row.upload_sections : [];
  return {
    id: String(row.id),
    courseId: row.course_id ? String(row.course_id) : "",
    courseCode: String(row.course_code),
    courseName: String(row.course_name),
    title: String(row.title),
    fileName: String(row.file_name),
    status: (row.status === "Needs Review" && String(row.detail ?? "").startsWith("Approved by the teacher") ? "Approved" : row.status) as UploadStatus,
    progress: Number(row.progress),
    studentCount: Number(row.student_count),
    assessmentCount: Number(row.assessment_count),
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    detail: String(row.detail ?? ""),
    entriesVerified: Number(row.entries_verified),
    errors: Number(row.errors),
    sections: sections.map((item) => {
      const section = item as Row;
      return {
        name: String(section.name),
        type: String(section.type) as AssessmentType,
        maxMarks: Number(section.max_marks),
        weightage: Number(section.weightage),
        universityStatus: section.university_status as UploadSectionSummary["universityStatus"],
      };
    }),
  };
}

function mapActivity(row: Row): ActivityLog {
  const occurred = String(row.occurred_at);
  return {
    id: String(row.id),
    time: occurred.slice(11, 16),
    date: occurred.slice(0, 10),
    courseCode: String(row.course_code),
    action: String(row.action),
    status: row.status as ActivityStatus,
    message: String(row.message),
  };
}

async function userId() {
  const { data, error } = await getBrowserClient().auth.getUser();
  fail(error);
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

let seeded: Promise<void> | null = null;

export function ensureDemoOnce() {
  if (seeded) return seeded;
  seeded = (async () => {
    await removeSeededDemo(await userId());
  })().catch((error: unknown) => {
    seeded = null;
    throw error;
  });
  return seeded;
}

export async function resetRemoteDemo() {
  const id = await userId();
  await clearWorkspace(id);
  await disconnectUniversity(id);
  seeded = Promise.resolve();
}

export async function fetchTeacher() {
  const id = await userId();
  const { data, error } = await getBrowserClient().from("profiles").select("*").eq("id", id).single();
  fail(error);
  return mapTeacher(data as Row);
}

export async function saveTeacher(patch: Partial<Teacher>) {
  const current = await fetchTeacher();
  const name = patch.name ?? current.name;
  const { data, error } = await getBrowserClient()
    .from("profiles")
    .update({
      name,
      department: patch.department ?? current.department,
      university: patch.university ?? current.university,
      title: patch.title ?? current.title,
      email: patch.email ?? current.email,
      avatar_initials: initials(name),
    })
    .eq("id", current.id)
    .select("*")
    .single();
  fail(error);
  return mapTeacher(data as Row);
}

export async function saveTeacherAvatar(dataUrl: string) {
  const current = await fetchTeacher();
  if (typeof window !== "undefined") window.localStorage.setItem(avatarKey(current.id), dataUrl);
  const saved = await getBrowserClient().from("profiles").update({ avatar_url: dataUrl }).eq("id", current.id);
  if (saved.error && !/avatar_url/i.test(saved.error.message)) fail(saved.error);
  return { ...current, avatarUrl: dataUrl };
}

export async function fetchCourses() {
  const { data, error } = await getBrowserClient().from("courses").select("*").order("code");
  fail(error);
  return (data as Row[]).map(mapCourse);
}

export async function fetchStudents() {
  const { data, error } = await getBrowserClient()
    .from("students")
    .select("id, student_code, name, course_id, marks_status, completed_assessments, total_assessments, overall_percentage, student_marks (assessment_id, score)")
    .order("student_code");
  fail(error);
  return (data as Row[]).map(mapStudent);
}

export async function fetchAssessments() {
  const { data, error } = await getBrowserClient().from("assessments").select("*").order("created_at");
  fail(error);
  return (data as Row[]).map(mapAssessment);
}

export async function fetchConnection() {
  const id = await userId();
  const { data, error } = await getBrowserClient().from("university_connections").select("*").eq("teacher_id", id).maybeSingle();
  fail(error);
  if (!data) {
    return {
      university: "University",
      portalName: "University portal",
      status: "Disconnected" as const,
      session: "Inactive" as const,
      accountName: "",
      lastAuthentication: null,
    };
  }
  return mapConnection(data as Row);
}

export async function saveConnection(status: ConnectionStatus) {
  const current = await fetchConnection();
  const session = status === "Connected" ? "Active" : status === "Session Expired" ? "Expired" : "Inactive";
  const id = await userId();
  const { data, error } = await getBrowserClient()
    .from("university_connections")
    .update({
      status,
      session,
      last_authentication: status === "Connected" ? new Date().toISOString() : current.lastAuthentication,
    })
    .eq("teacher_id", id)
    .select("*")
    .single();
  fail(error);
  await getBrowserClient().from("activity_logs").insert({
    teacher_id: id,
    course_code: "Portal",
    action: "Connection",
    status: status === "Connected" ? "Success" : status === "Connection Failed" ? "Failed" : "Warning",
    message:
      status === "Connected"
        ? "University authentication verified"
        : status === "Session Expired"
          ? "University session expired"
          : `University connection is ${status.toLowerCase()}`,
  });
  return mapConnection(data as Row);
}

export async function touchConnection() {
  const current = await fetchConnection();
  if (current.status !== "Connected") return current;
  const id = await userId();
  const { data, error } = await getBrowserClient()
    .from("university_connections")
    .update({ session: "Active", last_authentication: new Date().toISOString() })
    .eq("teacher_id", id)
    .select("*")
    .single();
  fail(error);
  return mapConnection(data as Row);
}

export async function fetchJobs() {
  const { data, error } = await getBrowserClient()
    .from("upload_jobs")
    .select("*, upload_sections (name, type, max_marks, weightage, university_status)")
    .order("created_at", { ascending: false });
  fail(error);
  return (data as Row[]).map(mapJob);
}

export async function fetchActivities() {
  const { data, error } = await getBrowserClient().from("activity_logs").select("*").order("occurred_at", { ascending: false });
  fail(error);
  return (data as Row[]).map(mapActivity);
}

export async function persistCompletedUpload(input: {
  course: Course;
  fileName: string;
  studentCount: number;
  assessmentCount: number;
  sections: UploadSectionSummary[];
  created: { name: string; type: AssessmentType; maxMarks: number; weightage: number | null; source: Assessment["source"]; confidence: number | null }[];
  activities: { action: string; status: ActivityStatus; message: string }[];
}) {
  const id = await userId();
  const now = new Date().toISOString();
  const existing = await fetchAssessments();
  for (const section of input.created) {
    const match = existing.find((item) => item.courseId === input.course.id && item.name === section.name);
    if (match) {
      const { error } = await getBrowserClient()
        .from("assessments")
        .update({
          university_status: "Exists",
          weightage: section.weightage,
          max_marks: section.maxMarks,
          type: section.type,
          source: match.source === "Missing" ? "Teacher" : match.source,
        })
        .eq("id", match.id);
      fail(error);
    } else {
      const { error } = await getBrowserClient().from("assessments").insert({
        teacher_id: id,
        course_id: input.course.id,
        name: section.name,
        type: section.type,
        max_marks: section.maxMarks,
        weightage: section.weightage,
        source: section.source === "Teacher" ? "Teacher" : "Document",
        confidence: section.confidence,
        university_status: "Exists",
        created_at: now.slice(0, 10),
      });
      fail(error);
    }
  }

  const { data: job, error: jobError } = await getBrowserClient()
    .from("upload_jobs")
    .insert({
      teacher_id: id,
      course_id: input.course.id,
      course_code: input.course.code,
      course_name: input.course.name,
      title: `${input.course.code} Marks Upload`,
      file_name: input.fileName,
      status: "Completed",
      progress: 100,
      student_count: input.studentCount,
      assessment_count: input.assessmentCount,
      detail: `${input.studentCount} student records uploaded and verified.`,
      entries_verified: input.studentCount * input.assessmentCount,
      errors: 0,
      completed_at: now,
    })
    .select("*")
    .single();
  fail(jobError);

  if (input.sections.length) {
    const { error } = await getBrowserClient().from("upload_sections").insert(
      input.sections.map((section) => ({
        job_id: (job as Row).id,
        name: section.name,
        type: section.type,
        max_marks: section.maxMarks,
        weightage: section.weightage,
        university_status: section.universityStatus,
      })),
    );
    fail(error);
  }

  if (input.activities.length) {
    const { error } = await getBrowserClient().from("activity_logs").insert(
      input.activities.map((item) => ({
        teacher_id: id,
        course_code: input.course.code,
        action: item.action,
        status: item.status,
        message: item.message,
      })),
    );
    fail(error);
  }

  return mapJob({ ...(job as Row), upload_sections: input.sections.map((section) => ({
    name: section.name,
    type: section.type,
    max_marks: section.maxMarks,
    weightage: section.weightage,
    university_status: section.universityStatus,
  })) });
}
