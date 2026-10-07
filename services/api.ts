import { comparisonFor } from "@/features/upload/weightage";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase/browser";
import { formatTime, uid, wait } from "@/lib/utils";
import type {
  ActivityLog,
  Assessment,
  AssessmentType,
  ConnectionStatus,
  Course,
  DetectedAssessment,
  DetectedIssue,
  DocumentAnalysis,
  SubjectMatch,
  Teacher,
  UniversityConnection,
  UploadJob,
  UploadProgressEvent,
  UploadResult,
  WeightageSource,
} from "@/types";
import { clone, db, hydrateDb, persistDb, sessionFor } from "./db";
import {
  ensureDemoOnce,
  fetchActivities,
  fetchAssessments,
  fetchConnection,
  fetchCourses,
  fetchJobs,
  fetchStudents,
  fetchTeacher,
  persistCompletedUpload,
  saveConnection,
  saveTeacher,
  saveTeacherAvatar,
  touchConnection,
} from "./supabase/data";

function ready() {
  hydrateDb();
}

export async function getTeacher(): Promise<Teacher> {
  if (isSupabaseConfigured()) return fetchTeacher();
  ready();
  await wait(220);
  return clone(db.teacher);
}

export async function getCourses() {
  if (isSupabaseConfigured()) {
    await ensureDemoOnce();
    return fetchCourses();
  }
  ready();
  await wait(420);
  return clone(db.courses);
}

export async function getCourse(id: string) {
  const courses = await getCourses();
  if (isSupabaseConfigured()) return courses.find((course) => course.id === id) ?? null;
  await wait(320);
  return courses.find((course) => course.id === id) ?? null;
}

export async function getStudents() {
  if (isSupabaseConfigured()) {
    await ensureDemoOnce();
    return fetchStudents();
  }
  ready();
  await wait(480);
  return clone(db.students);
}

export async function getStudent(id: string) {
  const students = await getStudents();
  if (isSupabaseConfigured()) return students.find((student) => student.id === id) ?? null;
  await wait(280);
  return students.find((student) => student.id === id) ?? null;
}

export async function getAssessments() {
  if (isSupabaseConfigured()) {
    await ensureDemoOnce();
    return fetchAssessments();
  }
  ready();
  await wait(420);
  return clone(db.assessments);
}

export async function getUniversityConnection(): Promise<UniversityConnection> {
  if (isSupabaseConfigured()) {
    await ensureDemoOnce();
    return fetchConnection();
  }
  ready();
  await wait(360);
  return clone(db.connection);
}

export async function getUploadHistory(): Promise<UploadJob[]> {
  if (isSupabaseConfigured()) {
    await ensureDemoOnce();
    return fetchJobs();
  }
  ready();
  await wait(400);
  return clone(db.jobs).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function getUploadJob(id: string) {
  const jobs = await getUploadHistory();
  if (isSupabaseConfigured()) return jobs.find((job) => job.id === id) ?? null;
  await wait(280);
  return jobs.find((job) => job.id === id) ?? null;
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  if (isSupabaseConfigured()) {
    await ensureDemoOnce();
    return fetchActivities();
  }
  ready();
  await wait(400);
  return clone(db.activities).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
}

export async function updateTeacher(patch: Partial<Teacher>) {
  if (isSupabaseConfigured()) return saveTeacher(patch);
  ready();
  await wait(450);
  const name = patch.name ?? db.teacher.name;
  const parts = name.trim().split(/\s+/);
  db.teacher = {
    ...db.teacher,
    ...patch,
    id: db.teacher.id,
    avatarInitials: `${parts[0]?.[0] ?? "A"}${parts[1]?.[0] ?? parts[0]?.[1] ?? "K"}`.toUpperCase(),
  };
  persistDb();
  return clone(db.teacher);
}

export async function updateTeacherAvatar(dataUrl: string) {
  if (isSupabaseConfigured()) return saveTeacherAvatar(dataUrl);
  ready();
  db.teacher = { ...db.teacher, avatarUrl: dataUrl };
  persistDb();
  return clone(db.teacher);
}

export async function setConnectionStatus(status: ConnectionStatus) {
  if (isSupabaseConfigured()) return saveConnection(status);
  ready();
  await wait(650);
  db.connection = {
    ...db.connection,
    status,
    session: sessionFor(status),
    lastAuthentication: status === "Connected" ? new Date().toISOString() : db.connection.lastAuthentication,
  };
  db.activities.unshift({
    id: uid("act"),
    time: formatTime().slice(0, 5),
    date: new Date().toISOString().slice(0, 10),
    courseCode: "Portal",
    action: "Connection",
    status: status === "Connected" ? "Success" : status === "Connection Failed" ? "Failed" : "Warning",
    message:
      status === "Connected"
        ? "University authentication verified"
        : status === "Session Expired"
          ? "University session expired"
          : `University connection is ${status.toLowerCase()}`,
  });
  persistDb();
  return clone(db.connection);
}

export async function checkConnection() {
  if (isSupabaseConfigured()) {
    await wait(400);
    return touchConnection();
  }
  ready();
  await wait(800);
  if (db.connection.status === "Connected") {
    db.connection = { ...db.connection, session: "Active", lastAuthentication: new Date().toISOString() };
    persistDb();
  }
  return clone(db.connection);
}

function courseByCode(courses: Course[], code: string) {
  return courses.find((course) => course.code === code);
}

function toMatch(courses: Course[], code: string, confidence: number, match: SubjectMatch["match"]): SubjectMatch {
  const course = courseByCode(courses, code);
  if (!course) throw new Error("SUBJECT_NOT_FOUND");
  return {
    courseId: course.id,
    code: course.code,
    name: course.name,
    semester: course.semester,
    section: course.section,
    confidence,
    match,
  };
}

function detectedFromCatalog(assessments: Assessment[], courseId: string, mode: "full" | "partial" | "none"): DetectedAssessment[] {
  return assessments
    .filter((item) => item.courseId === courseId)
    .map((item) => {
      let weightage = item.weightage;
      let source: WeightageSource = item.weightage == null ? "Missing" : "Document";
      if (mode === "none") {
        weightage = null;
        source = "Missing";
      }
      if (mode === "full" && weightage == null) {
        weightage = 5;
        source = "Document";
      }
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        maxMarks: item.maxMarks,
        weightage,
        source,
        confidence: item.confidence ?? 96,
        universityStatus: item.universityStatus,
      };
    });
}

function defaultIssues(): DetectedIssue[] {
  return [
    {
      id: "issue-missing-student",
      kind: "student-not-found",
      studentCode: "2026-CS-109",
      message: "This student is not on the CS-301 roster.",
      resolved: false,
    },
    {
      id: "issue-invalid-mark",
      kind: "invalid-marks",
      studentName: "Ahmed Khan",
      enteredMarks: 45,
      maxMarks: 30,
      message: "This mark exceeds the maximum allowed value.",
      resolved: false,
    },
  ];
}

export async function analyzeDocument(file: { name: string; size: number } | File): Promise<DocumentAnalysis> {
  if (typeof File !== "undefined" && file instanceof File && isSupabaseConfigured()) {
    return analyzeUploadedFile(file);
  }
  const courses = await getCourses();
  const assessments = await getAssessments();
  await wait(isSupabaseConfigured() ? 280 : 700);
  const name = file.name.toLowerCase();
  const base = {
    fileName: file.name,
    fileSize: file.size,
    studentCount: 42,
    issues: [] as DetectedIssue[],
  };

  if (/bad|corrupt|broken/.test(name)) {
    return {
      ...base,
      subject: null,
      matches: [],
      requiresManualSubject: false,
      subjectNotFound: false,
      parseError: true,
      assessments: [],
      weightageMode: "none",
      issues: [
        {
          id: "issue-parse",
          kind: "file-parse",
          message: "We couldn't understand this file completely.",
          resolved: false,
        },
      ],
    };
  }

  if (/unknown|999|missing-course/.test(name)) {
    return {
      ...base,
      subject: null,
      matches: [],
      requiresManualSubject: true,
      subjectNotFound: true,
      parseError: false,
      assessments: detectedFromCatalog(assessments, courseByCode(courses, "CS-301")?.id ?? "", "partial"),
      weightageMode: "partial",
      issues: [
        {
          id: "issue-subject",
          kind: "subject-not-found",
          message: "We couldn't find CS-301 in your university account.",
          resolved: false,
        },
      ],
    };
  }

  const ambiguous = /lab|ambiguous|multi/.test(name);
  const code = /305|database/.test(name)
    ? "CS-305"
    : /software|se-?401/.test(name)
      ? "SE-401"
      : /410|machine/.test(name)
        ? "CS-410"
        : /401|advanced/.test(name)
          ? "CS-401"
          : "CS-301";

  const mode = /none|raw|blank/.test(name) ? "none" : /full|weighted|complete/.test(name) ? "full" : "partial";
  const matches = ambiguous
    ? [toMatch(courses, "CS-301", 74, "Possible Match"), toMatch(courses, "CS-302", 71, "Possible Match"), toMatch(courses, "CS-401", 63, "Possible Match")]
    : [toMatch(courses, code, 98, "Exact Match"), toMatch(courses, "CS-302", 64, "Possible Match"), toMatch(courses, "CS-401", 58, "Possible Match")];

  const selected = courseByCode(courses, ambiguous ? "CS-301" : code);
  const detected = detectedFromCatalog(assessments, selected?.id ?? "", mode);
  const course = selected;

  return {
    ...base,
    studentCount: course?.studentCount ?? 42,
    subject: ambiguous ? null : matches[0],
    matches,
    requiresManualSubject: ambiguous,
    subjectNotFound: false,
    parseError: false,
    assessments: detected,
    weightageMode: mode,
    issues: code === "CS-301" && !ambiguous ? defaultIssues() : [],
  };
}

async function authHeader() {
  const { data } = await getBrowserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to continue.");
  return { Authorization: `Bearer ${token}` };
}

async function analyzeUploadedFile(file: File): Promise<DocumentAnalysis> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/uploads", { method: "POST", headers: await authHeader(), body });
  const payload = (await response.json()) as DocumentAnalysis & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "The file could not be analyzed.");
  return payload;
}

export async function approveUploadJob(input: {
  jobId: string;
  courseId: string;
  assessments: DetectedAssessment[];
  resolutions: Record<string, "cap" | "exclude">;
  students?: DocumentAnalysis["students"];
  issues?: DocumentAnalysis["issues"];
}): Promise<UploadResult> {
  const response = await fetch(`/api/uploads/${input.jobId}/approve`, {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify({
      courseId: input.courseId,
      assessments: input.assessments.map((item) => ({
        name: item.name,
        type: item.type,
        maxMarks: item.maxMarks,
        weightage: item.weightage,
      })),
      resolutions: input.resolutions,
      students: input.students,
      issues: input.issues,
    }),
  });
  const payload = (await response.json()) as UploadJob & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "The upload could not be approved.");
  return {
    job: payload,
    logs: [{ time: formatTime(), message: payload.detail || "Approved. No university records were changed." }],
  };
}

export interface UploadRequest {
  courseId: string;
  fileName: string;
  studentCount: number;
  assessments: DetectedAssessment[];
}

export async function simulateUpload(
  request: UploadRequest,
  onEvent: (events: UploadProgressEvent[]) => void,
): Promise<UploadResult> {
  const connection = await getUniversityConnection();
  const courses = await getCourses();
  if (connection.status !== "Connected") {
    throw new Error("UNIVERSITY_SESSION");
  }

  const course = courses.find((item) => item.id === request.courseId);
  if (!course) throw new Error("SUBJECT_NOT_FOUND");

  const rows = comparisonFor(request.assessments);
  const steps: { id: string; label: string; message: string }[] = [
    { id: "connect", label: "Connecting to university portal", message: "University session loaded" },
    { id: "auth", label: "Authentication verified", message: "Authentication verified" },
    { id: "find", label: `Finding ${course.code}`, message: `Course ${course.code} found` },
    { id: "open", label: "Opening marks section", message: "Marks page opened" },
    { id: "read", label: "Reading existing assessments", message: "Existing assessments read" },
    ...rows
      .filter((row) => row.action === "Create")
      .map((row) => ({ id: `create-${row.id}`, label: `Creating ${row.name}`, message: `${row.name} created` })),
    { id: "upload", label: "Uploading marks", message: "Upload started" },
    { id: "verify", label: "Verifying entries", message: "Verification completed" },
  ];

  const events: UploadProgressEvent[] = steps.map((step) => ({
    id: step.id,
    label: step.label,
    status: "pending",
    percent: 0,
    studentsDone: 0,
    studentsTotal: request.studentCount,
  }));
  const logs: { time: string; message: string }[] = [];
  onEvent(events.map((event) => ({ ...event })));

  for (let index = 0; index < steps.length; index += 1) {
    events[index] = { ...events[index], status: "active" };
    onEvent(events.map((event) => ({ ...event })));

    if (steps[index].id === "upload") {
      const total = request.studentCount;
      const ticks = 8;
      for (let tick = 1; tick <= ticks; tick += 1) {
        await wait(220);
        const done = Math.min(total, Math.round((tick / ticks) * total));
        events[index] = {
          ...events[index],
          status: "active",
          studentsDone: done,
          studentsTotal: total,
          percent: Math.round(68 + (done / total) * 24),
          label: "Uploading marks...",
        };
        onEvent(events.map((event) => ({ ...event })));
      }
    } else {
      await wait(460);
    }

    const log = { time: formatTime(), message: steps[index].message };
    logs.push(log);
    events[index] = {
      ...events[index],
      status: "done",
      percent: Math.round(((index + 1) / steps.length) * 100),
      log,
      studentsDone: steps[index].id === "upload" ? request.studentCount : events[index].studentsDone,
    };
    onEvent(events.map((event) => ({ ...event })));
  }

  const now = new Date().toISOString();
  const sections = rows.map((row) => ({
    name: row.name,
    type: row.type,
    maxMarks: row.maxMarks,
    weightage: row.weightage ?? 0,
    universityStatus: row.reviewStatus,
  }));

  const stamped: ActivityLog[] = [
    ["Upload started", "Info", `${course.code} upload started`],
    ["Authentication", "Success", "University authentication verified"],
    ...rows
      .filter((row) => row.action === "Create")
      .map((row) => ["Section created", "Success", `${row.name} created`] as const),
    ["Marks uploaded", "Success", `${request.studentCount} student records uploaded`],
    ["Verification", "Success", "Verification completed"],
  ].map(([action, status, message]) => ({
    id: uid("act"),
    time: formatTime().slice(0, 5),
    date: now.slice(0, 10),
    courseCode: course.code,
    action,
    status: status as ActivityLog["status"],
    message,
  }));

  if (isSupabaseConfigured()) {
    const job = await persistCompletedUpload({
      course,
      fileName: request.fileName,
      studentCount: request.studentCount,
      assessmentCount: request.assessments.length,
      sections,
      created: rows.map((row) => ({
        name: row.name,
        type: row.type,
        maxMarks: row.maxMarks,
        weightage: row.weightage,
        source: row.source,
        confidence: row.confidence,
      })),
      activities: stamped.map(({ action, status, message }) => ({ action, status, message })),
    });
    return { job, logs };
  }

  rows.forEach((row) => {
    const existing = db.assessments.find((item) => item.courseId === course.id && item.name === row.name);
    if (existing) {
      existing.universityStatus = "Exists";
      existing.weightage = row.weightage;
      existing.maxMarks = row.maxMarks;
      existing.type = row.type;
      if (existing.source === "Missing") existing.source = "Teacher";
    } else {
      db.assessments.push({
        id: uid("assess"),
        courseId: course.id,
        name: row.name,
        type: row.type,
        maxMarks: row.maxMarks,
        weightage: row.weightage,
        source: row.source === "Teacher" ? "Teacher" : "Document",
        confidence: row.confidence,
        universityStatus: "Exists",
        createdAt: now.slice(0, 10),
      });
    }
  });

  const job: UploadJob = {
    id: uid("job"),
    courseId: course.id,
    courseCode: course.code,
    courseName: course.name,
    title: `${course.code} Marks Upload`,
    fileName: request.fileName,
    status: "Completed",
    progress: 100,
    studentCount: request.studentCount,
    assessmentCount: request.assessments.length,
    createdAt: now,
    completedAt: now,
    detail: `${request.studentCount} student records uploaded and verified.`,
    sections,
    entriesVerified: request.studentCount * request.assessments.length,
    errors: 0,
  };
  db.jobs.unshift(job);
  db.activities.unshift(...stamped.reverse());
  persistDb();

  return { job: clone(job), logs };
}

export async function searchPortal(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const [courseList, studentList] = await Promise.all([getCourses(), getStudents()]);
  const pages = [
    ["Dashboard", "/dashboard"],
    ["AI Assistant", "/assistant"],
    ["Upload Marks", "/uploads/new"],
    ["Courses", "/courses"],
    ["Assessments", "/assessments"],
    ["Students", "/students"],
    ["University Connection", "/university-connection"],
    ["Upload History", "/history"],
    ["Activity Log", "/activity"],
    ["Settings", "/settings"],
  ]
    .filter(([label]) => label.toLowerCase().includes(q))
    .map(([label, href]) => ({ kind: "Page" as const, label, href, meta: "Navigate" }));

  const courses = courseList
    .filter((course) => `${course.code} ${course.name}`.toLowerCase().includes(q))
    .map((course) => ({
      kind: "Course" as const,
      label: `${course.code} — ${course.name}`,
      href: `/courses/${course.id}`,
      meta: `${course.semester}${course.section}`,
    }));

  const students = studentList
    .filter((student) => `${student.name} ${student.studentCode}`.toLowerCase().includes(q))
    .slice(0, 6)
    .map((student) => ({
      kind: "Student" as const,
      label: student.name,
      href: `/students/${student.id}`,
      meta: student.studentCode,
    }));

  return [...pages, ...courses, ...students].slice(0, 10);
}

export const ASSESSMENT_TYPES: AssessmentType[] = [
  "Assignment",
  "Quiz",
  "Presentation",
  "Project",
  "Lab",
  "Midterm",
  "Final",
  "Other",
];
