export type AssessmentType =
  | "Assignment"
  | "Quiz"
  | "Presentation"
  | "Project"
  | "Lab"
  | "Midterm"
  | "Final"
  | "Other";

export type WeightageSource = "Document" | "Teacher" | "Missing";

export type UniversitySectionStatus = "Exists" | "Missing";

export type UploadStatus =
  | "Completed"
  | "Processing"
  | "Waiting for Weightage"
  | "Waiting for Approval"
  | "Failed"
  | "Needs Review"
  | "Approved";

export type ConnectionStatus =
  | "Connected"
  | "Disconnected"
  | "Session Expired"
  | "MFA Required"
  | "Authentication Required"
  | "Connection Failed";

export type MarksStatus = "Complete" | "Partial" | "Missing";

export type ActivityStatus = "Success" | "Warning" | "Info" | "Failed";

export interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  university: string;
  title: string;
  avatarInitials: string;
  avatarUrl?: string | null;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  section: string;
  studentCount: number;
  grading: { name: string; weightage: number }[];
}

export interface StudentMark {
  assessmentId: string;
  score: number | null;
}

export interface Student {
  id: string;
  studentCode: string;
  name: string;
  courseId: string;
  marksStatus: MarksStatus;
  completedAssessments: number;
  totalAssessments: number;
  overallPercentage: number | null;
  marks: StudentMark[];
}

export interface Assessment {
  id: string;
  courseId: string;
  name: string;
  type: AssessmentType;
  maxMarks: number;
  weightage: number | null;
  source: WeightageSource | "University";
  confidence: number | null;
  universityStatus: UniversitySectionStatus;
  createdAt: string;
}

export interface UniversityConnection {
  university: string;
  portalName: string;
  status: ConnectionStatus;
  session: "Active" | "Inactive" | "Expired";
  accountName: string;
  lastAuthentication: string | null;
  connectionMethod?: string | null;
  lastVerified?: string | null;
}

export interface UploadSectionSummary {
  name: string;
  type: AssessmentType;
  maxMarks: number;
  weightage: number;
  universityStatus: "Will Create" | "Exists";
}

export interface UploadJob {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  title: string;
  fileName: string;
  status: UploadStatus;
  progress: number;
  studentCount: number;
  assessmentCount: number;
  createdAt: string;
  completedAt: string | null;
  detail: string;
  sections: UploadSectionSummary[];
  entriesVerified: number;
  errors: number;
}

export interface ActivityLog {
  id: string;
  time: string;
  date: string;
  courseCode: string;
  action: string;
  status: ActivityStatus;
  message: string;
}

export interface UploadFileMeta {
  name: string;
  size: number;
  kind: "Excel" | "CSV" | "PDF" | "DOCX";
}

export interface DetectedAssessment {
  id: string;
  name: string;
  type: AssessmentType;
  maxMarks: number;
  weightage: number | null;
  source: WeightageSource;
  confidence: number;
  universityStatus: UniversitySectionStatus;
}

export interface SubjectMatch {
  courseId: string;
  code: string;
  name: string;
  semester: string;
  section: string;
  confidence: number;
  match: "Exact Match" | "Possible Match";
}

export interface DetectedIssue {
  id: string;
  kind: "student-not-found" | "invalid-marks" | "file-parse" | "subject-not-found";
  studentCode?: string;
  studentName?: string;
  enteredMarks?: number;
  maxMarks?: number;
  message: string;
  resolved: boolean;
}

export type WeightageMode = "full" | "partial" | "none";

export interface DocumentAnalysis {
  fileName: string;
  fileSize: number;
  subject: SubjectMatch | null;
  matches: SubjectMatch[];
  requiresManualSubject: boolean;
  subjectNotFound: boolean;
  parseError: boolean;
  assessments: DetectedAssessment[];
  studentCount: number;
  issues: DetectedIssue[];
  weightageMode: WeightageMode;
  jobId?: string;
  students?: { studentId: string; name: string; marks: Record<string, number | null> }[];
}

export interface UploadProgressEvent {
  id: string;
  label: string;
  status: "pending" | "active" | "done";
  percent: number;
  studentsDone: number;
  studentsTotal: number;
  log?: { time: string; message: string };
}

export interface UploadResult {
  job: UploadJob;
  logs: { time: string; message: string }[];
}

export type AICard =
  | {
      type: "subject";
      code: string;
      name: string;
      confidence: number;
      semester: string;
      section: string;
    }
  | {
      type: "assessments";
      items: { name: string; type: AssessmentType; maxMarks: number; weightage: number | null; confidence: number }[];
    }
  | {
      type: "weightage";
      items: { name: string; weightage: number | null }[];
      total: number;
      valid: boolean;
      message: string;
    }
  | { type: "warning"; title: string; message: string }
  | { type: "confirmation"; title: string; message: string; actions: { id: string; label: string; href?: string }[] }
  | { type: "university"; status: string; session: string; university: string; account: string }
  | { type: "progress"; label: string; percent: number; detail: string }
  | { type: "success"; title: string; message: string }
  | { type: "error"; title: string; message: string }
  | { type: "file"; name: string; size: number; status: string }
  | { type: "courses"; items: { code: string; name: string; meta: string }[] }
  | { type: "list"; title: string; items: { title: string; meta: string; status?: string }[] };

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  cards?: AICard[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}
