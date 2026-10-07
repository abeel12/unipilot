import type {
  ActivityLog,
  Assessment,
  ConnectionStatus,
  Course,
  Student,
  Teacher,
  UniversityConnection,
  UploadJob,
} from "@/types";

const STORAGE_KEY = "unipilot-db-v1";

const FIRST = [
  "Ahmed", "Sara", "Hassan", "Ayesha", "Bilal", "Fatima", "Omar", "Hira", "Zain", "Maryam",
  "Usman", "Noor", "Ali", "Zara", "Hamza", "Iqra", "Danish", "Maham", "Farhan", "Laiba",
  "Sana", "Kamran", "Hina", "Imran", "Rabia", "Taha", "Amna", "Saad", "Mariam", "Fahad",
  "Nida", "Waleed", "Anum", "Shahzaib", "Khadija", "Haris", "Mehak", "Asad", "Eman", "Junaid",
];

const LAST = [
  "Khan", "Malik", "Sheikh", "Raza", "Hussain", "Qureshi", "Siddiqui", "Butt", "Chaudhry", "Iqbal",
  "Farooq", "Akhtar", "Javed", "Nadeem", "Abbasi", "Mirza", "Dar", "Lone", "Baig", "Ansari",
];

export interface Database {
  teacher: Teacher;
  courses: Course[];
  students: Student[];
  assessments: Assessment[];
  jobs: UploadJob[];
  activities: ActivityLog[];
  connection: UniversityConnection;
}

function courseSeeds(): Course[] {
  return [
    {
      id: "c-cs301",
      code: "CS-301",
      name: "Artificial Intelligence",
      semester: "BSCS 5",
      section: "A",
      studentCount: 42,
      grading: [
        { name: "Assignment 1", weightage: 5 },
        { name: "Assignment 2", weightage: 5 },
        { name: "Assignment 3", weightage: 5 },
        { name: "Project", weightage: 15 },
        { name: "Midterm", weightage: 30 },
        { name: "Final", weightage: 40 },
      ],
    },
    {
      id: "c-cs305",
      code: "CS-305",
      name: "Database Systems",
      semester: "BSCS 5",
      section: "B",
      studentCount: 45,
      grading: [
        { name: "Quiz 1", weightage: 10 },
        { name: "Assignment 1", weightage: 15 },
        { name: "Midterm", weightage: 25 },
        { name: "Final", weightage: 50 },
      ],
    },
    {
      id: "c-se401",
      code: "SE-401",
      name: "Software Engineering",
      semester: "BSSE 7",
      section: "A",
      studentCount: 38,
      grading: [
        { name: "Assignment 1", weightage: 10 },
        { name: "Assignment 2", weightage: 10 },
        { name: "Presentation", weightage: 10 },
        { name: "Midterm", weightage: 30 },
        { name: "Final", weightage: 40 },
      ],
    },
    {
      id: "c-cs410",
      code: "CS-410",
      name: "Machine Learning",
      semester: "BSCS 7",
      section: "A",
      studentCount: 36,
      grading: [
        { name: "Quiz 1", weightage: 10 },
        { name: "Project", weightage: 30 },
        { name: "Final", weightage: 60 },
      ],
    },
    {
      id: "c-cs302",
      code: "CS-302",
      name: "Artificial Intelligence Lab",
      semester: "BSCS 5",
      section: "A",
      studentCount: 40,
      grading: [
        { name: "Lab 1", weightage: 20 },
        { name: "Lab 2", weightage: 20 },
        { name: "Final", weightage: 60 },
      ],
    },
    {
      id: "c-cs401",
      code: "CS-401",
      name: "Advanced Artificial Intelligence",
      semester: "BSCS 7",
      section: "B",
      studentCount: 47,
      grading: [
        { name: "Presentation", weightage: 15 },
        { name: "Midterm", weightage: 35 },
        { name: "Final", weightage: 50 },
      ],
    },
  ];
}

function assessmentSeeds(): Assessment[] {
  const row = (
    id: string,
    courseId: string,
    name: string,
    type: Assessment["type"],
    maxMarks: number,
    weightage: number | null,
    universityStatus: Assessment["universityStatus"],
    createdAt: string,
    source: Assessment["source"] = "University",
  ): Assessment => ({
    id,
    courseId,
    name,
    type,
    maxMarks,
    weightage,
    source,
    confidence: source === "Document" ? 99 : source === "Missing" ? null : 100,
    universityStatus,
    createdAt,
  });

  return [
    row("a-cs301-1", "c-cs301", "Assignment 1", "Assignment", 10, 5, "Missing", "2026-09-12", "Document"),
    row("a-cs301-2", "c-cs301", "Assignment 2", "Assignment", 10, 5, "Missing", "2026-09-12", "Document"),
    row("a-cs301-3", "c-cs301", "Assignment 3", "Assignment", 10, null, "Missing", "2026-09-12", "Missing"),
    row("a-cs301-p", "c-cs301", "Project", "Project", 20, 15, "Missing", "2026-09-12", "Document"),
    row("a-cs301-m", "c-cs301", "Midterm", "Midterm", 50, 30, "Exists", "2026-09-01", "University"),
    row("a-cs301-f", "c-cs301", "Final", "Final", 100, 40, "Exists", "2026-09-01", "University"),
    row("a-cs305-q", "c-cs305", "Quiz 1", "Quiz", 10, 10, "Exists", "2026-09-08"),
    row("a-cs305-a", "c-cs305", "Assignment 1", "Assignment", 20, 15, "Missing", "2026-09-18", "Document"),
    row("a-cs305-m", "c-cs305", "Midterm", "Midterm", 30, 25, "Exists", "2026-09-02"),
    row("a-cs305-f", "c-cs305", "Final", "Final", 50, 50, "Exists", "2026-09-02"),
    row("a-se401-1", "c-se401", "Assignment 1", "Assignment", 20, 10, "Exists", "2026-09-04"),
    row("a-se401-2", "c-se401", "Assignment 2", "Assignment", 20, 10, "Exists", "2026-09-20"),
    row("a-se401-p", "c-se401", "Presentation", "Presentation", 15, 10, "Missing", "2026-09-21", "Document"),
    row("a-se401-m", "c-se401", "Midterm", "Midterm", 40, 30, "Exists", "2026-09-03"),
    row("a-se401-f", "c-se401", "Final", "Final", 80, 40, "Exists", "2026-09-03"),
    row("a-cs410-q", "c-cs410", "Quiz 1", "Quiz", 15, 10, "Exists", "2026-09-11"),
    row("a-cs410-p", "c-cs410", "Project", "Project", 40, 30, "Missing", "2026-09-19", "Document"),
    row("a-cs410-f", "c-cs410", "Final", "Final", 60, 60, "Exists", "2026-09-05"),
    row("a-cs302-1", "c-cs302", "Lab 1", "Lab", 20, 20, "Exists", "2026-09-06"),
    row("a-cs302-2", "c-cs302", "Lab 2", "Lab", 20, 20, "Missing", "2026-09-16", "Document"),
    row("a-cs302-f", "c-cs302", "Final", "Final", 40, 60, "Exists", "2026-09-06"),
    row("a-cs401-p", "c-cs401", "Presentation", "Presentation", 20, 15, "Missing", "2026-09-22", "Document"),
    row("a-cs401-m", "c-cs401", "Midterm", "Midterm", 40, 35, "Exists", "2026-09-07"),
    row("a-cs401-f", "c-cs401", "Final", "Final", 60, 50, "Exists", "2026-09-07"),
  ];
}

function buildStudents(courses: Course[], assessments: Assessment[]): Student[] {
  const students: Student[] = [];
  let person = 0;
  let serial = 1;
  const nextSerial = () => {
    if (serial === 109) serial += 1;
    return serial++;
  };

  courses.forEach((course) => {
    const courseAssessments = assessments.filter((item) => item.courseId === course.id);
    const prefix = course.code.startsWith("SE") ? "2026-SE" : "2026-CS";
    for (let i = 0; i < course.studentCount; i += 1) {
      const codeNumber = nextSerial();
      const name = `${FIRST[person % FIRST.length]} ${LAST[Math.floor(person / FIRST.length) % LAST.length]}`;
      person += 1;
      const marksStatus = person % 17 === 0 ? "Missing" : person % 7 === 0 ? "Partial" : "Complete";
      const marks = courseAssessments.map((assessment, index) => {
        if (marksStatus === "Missing") return { assessmentId: assessment.id, score: null };
        if (marksStatus === "Partial" && index % 2 === 1) return { assessmentId: assessment.id, score: null };
        const pct = 0.58 + ((person * 13 + index * 7) % 38) / 100;
        return { assessmentId: assessment.id, score: Math.min(assessment.maxMarks, Math.round(assessment.maxMarks * pct)) };
      });
      const completed = marks.filter((mark) => mark.score != null).length;
      const earned = marks.reduce((sum, mark) => sum + (mark.score ?? 0), 0);
      const possible = courseAssessments.reduce((sum, assessment, index) => {
        const mark = marks[index];
        return sum + (mark?.score == null ? 0 : assessment.maxMarks);
      }, 0);
      students.push({
        id: `s-${course.id}-${i + 1}`,
        studentCode: `${prefix}-${String(codeNumber).padStart(3, "0")}`,
        name,
        courseId: course.id,
        marksStatus,
        completedAssessments: completed,
        totalAssessments: courseAssessments.length,
        overallPercentage: possible === 0 ? null : Math.round((earned / possible) * 100),
        marks,
      });
    }
  });

  const ahmed = students.find((student) => student.courseId === "c-cs301");
  if (ahmed) ahmed.name = "Ahmed Khan";
  return students;
}

function jobSeeds(): UploadJob[] {
  const section = (
    name: string,
    type: UploadJob["sections"][number]["type"],
    maxMarks: number,
    weightage: number,
    universityStatus: UploadJob["sections"][number]["universityStatus"],
  ) => ({ name, type, maxMarks, weightage, universityStatus });

  return [
    {
      id: "job-cs305-live",
      courseId: "c-cs305",
      courseCode: "CS-305",
      courseName: "Database Systems",
      title: "CS-305 Project Marks",
      fileName: "Assignments.xlsx",
      status: "Waiting for Weightage",
      progress: 55,
      studentCount: 45,
      assessmentCount: 3,
      createdAt: "2026-09-27T11:20:00.000Z",
      completedAt: null,
      detail: "Weightage is still missing for one section.",
      sections: [
        section("Quiz 1", "Quiz", 10, 10, "Exists"),
        section("Assignment 1", "Assignment", 20, 15, "Will Create"),
        section("Midterm", "Midterm", 30, 25, "Exists"),
      ],
      entriesVerified: 0,
      errors: 0,
    },
    {
      id: "job-cs301",
      courseId: "c-cs301",
      courseCode: "CS-301",
      courseName: "Artificial Intelligence",
      title: "CS-301 Midterm Upload",
      fileName: "AI_Marks.xlsx",
      status: "Completed",
      progress: 100,
      studentCount: 42,
      assessmentCount: 6,
      createdAt: "2026-09-29T09:40:00.000Z",
      completedAt: "2026-09-29T09:46:00.000Z",
      detail: "42 student records uploaded and verified.",
      sections: [
        section("Assignment 1", "Assignment", 10, 5, "Will Create"),
        section("Assignment 2", "Assignment", 10, 5, "Will Create"),
        section("Assignment 3", "Assignment", 10, 5, "Will Create"),
        section("Project", "Project", 20, 15, "Will Create"),
        section("Midterm", "Midterm", 50, 30, "Exists"),
        section("Final", "Final", 100, 40, "Exists"),
      ],
      entriesVerified: 252,
      errors: 0,
    },
    {
      id: "job-se401",
      courseId: "c-se401",
      courseCode: "SE-401",
      courseName: "Software Engineering",
      title: "SE-401 Assignment 2",
      fileName: "Midterm.xlsx",
      status: "Completed",
      progress: 100,
      studentCount: 38,
      assessmentCount: 1,
      createdAt: "2026-09-28T14:05:00.000Z",
      completedAt: "2026-09-28T14:12:00.000Z",
      detail: "Sections created and marks posted.",
      sections: [section("Assignment 2", "Assignment", 20, 10, "Exists")],
      entriesVerified: 38,
      errors: 0,
    },
    {
      id: "job-cs410",
      courseId: "c-cs410",
      courseCode: "CS-410",
      courseName: "Machine Learning",
      title: "CS-410 Quiz Upload",
      fileName: "Quiz.xlsx",
      status: "Completed",
      progress: 100,
      studentCount: 36,
      assessmentCount: 1,
      createdAt: "2026-09-26T08:30:00.000Z",
      completedAt: "2026-09-26T08:36:00.000Z",
      detail: "Quiz marks verified.",
      sections: [section("Quiz 1", "Quiz", 15, 10, "Exists")],
      entriesVerified: 36,
      errors: 0,
    },
    {
      id: "job-cs302",
      courseId: "c-cs302",
      courseCode: "CS-302",
      courseName: "Artificial Intelligence Lab",
      title: "CS-302 Lab Marks",
      fileName: "Lab_Marks.xlsx",
      status: "Failed",
      progress: 28,
      studentCount: 40,
      assessmentCount: 2,
      createdAt: "2026-09-25T16:10:00.000Z",
      completedAt: null,
      detail: "The portal session ended before marks were posted.",
      sections: [
        section("Lab 1", "Lab", 20, 20, "Exists"),
        section("Lab 2", "Lab", 20, 20, "Will Create"),
      ],
      entriesVerified: 0,
      errors: 1,
    },
    {
      id: "job-se-review",
      courseId: "c-se401",
      courseCode: "SE-401",
      courseName: "Software Engineering",
      title: "SE-401 Project Draft",
      fileName: "Project.xlsx",
      status: "Needs Review",
      progress: 70,
      studentCount: 38,
      assessmentCount: 1,
      createdAt: "2026-09-24T10:00:00.000Z",
      completedAt: null,
      detail: "One student row could not be matched.",
      sections: [section("Presentation", "Presentation", 15, 10, "Will Create")],
      entriesVerified: 0,
      errors: 1,
    },
    {
      id: "job-cs401",
      courseId: "c-cs401",
      courseCode: "CS-401",
      courseName: "Advanced Artificial Intelligence",
      title: "CS-401 Presentation",
      fileName: "Presentation.xlsx",
      status: "Waiting for Approval",
      progress: 80,
      studentCount: 47,
      assessmentCount: 1,
      createdAt: "2026-09-22T13:15:00.000Z",
      completedAt: null,
      detail: "Ready for faculty approval.",
      sections: [section("Presentation", "Presentation", 20, 15, "Will Create")],
      entriesVerified: 0,
      errors: 0,
    },
    {
      id: "job-processing",
      courseId: "c-cs305",
      courseCode: "CS-305",
      courseName: "Database Systems",
      title: "CS-305 Quiz Processing",
      fileName: "Quiz1.xlsx",
      status: "Processing",
      progress: 64,
      studentCount: 45,
      assessmentCount: 1,
      createdAt: "2026-09-30T07:50:00.000Z",
      completedAt: null,
      detail: "Marks are moving to the portal.",
      sections: [section("Quiz 1", "Quiz", 10, 10, "Exists")],
      entriesVerified: 0,
      errors: 0,
    },
  ];
}

function activitySeeds(): ActivityLog[] {
  const row = (
    id: string,
    time: string,
    date: string,
    courseCode: string,
    action: string,
    status: ActivityLog["status"],
    message: string,
  ): ActivityLog => ({ id, time, date, courseCode, action, status, message });

  return [
    row("act-1", "09:42", "2026-09-29", "CS-301", "Upload started", "Info", "CS-301 upload started"),
    row("act-2", "09:43", "2026-09-29", "CS-301", "Authentication", "Success", "University authentication verified"),
    row("act-3", "09:44", "2026-09-29", "CS-301", "Section created", "Success", "Assignment 1 created"),
    row("act-4", "09:44", "2026-09-29", "CS-301", "Section created", "Success", "Assignment 2 created"),
    row("act-5", "09:45", "2026-09-29", "CS-301", "Marks uploaded", "Success", "42 student records uploaded"),
    row("act-6", "09:46", "2026-09-29", "CS-301", "Verification", "Success", "Verification completed"),
    row("act-7", "14:06", "2026-09-28", "SE-401", "Sections created", "Success", "Assignment 2 section created"),
    row("act-8", "14:12", "2026-09-28", "SE-401", "Upload completed", "Success", "38 student records verified"),
    row("act-9", "11:24", "2026-09-27", "CS-305", "Weightage missing", "Warning", "Waiting for weightage before upload"),
    row("act-10", "08:36", "2026-09-26", "CS-410", "Upload completed", "Success", "Quiz marks posted for Machine Learning"),
    row("act-11", "16:18", "2026-09-25", "CS-302", "Upload failed", "Failed", "Portal session ended during lab upload"),
    row("act-12", "10:12", "2026-09-24", "SE-401", "Needs review", "Warning", "A student row needs a manual match"),
    row("act-13", "13:20", "2026-09-22", "CS-401", "Awaiting approval", "Info", "Presentation upload is ready to approve"),
    row("act-14", "07:55", "2026-09-30", "CS-305", "Processing", "Info", "Quiz upload is still running"),
    row("act-15", "18:02", "2026-09-29", "CS-301", "Connection checked", "Success", "ABC University session is active"),
  ];
}

export function createSeed(): Database {
  const courses = courseSeeds();
  const assessments = assessmentSeeds();
  return {
    teacher: {
      id: "t-ahmed",
      name: "Dr. Ahmed Khan",
      email: "ahmed.khan@abc.edu",
      department: "Computer Science",
      university: "ABC University",
      title: "Assistant Professor",
      avatarInitials: "AK",
    },
    courses,
    students: buildStudents(courses, assessments),
    assessments,
    jobs: jobSeeds(),
    activities: activitySeeds(),
    connection: {
      university: "ABC University",
      portalName: "ABC University Portal",
      status: "Connected",
      session: "Active",
      accountName: "Dr. Ahmed",
      lastAuthentication: "2026-09-29T18:02:00.000Z",
    },
  };
}

export const db: Database = createSeed();

let hydrated = false;

export function hydrateDb() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Database>;
    if (saved.teacher) db.teacher = { ...db.teacher, ...saved.teacher };
    if (saved.assessments) db.assessments = saved.assessments;
    if (saved.jobs) db.jobs = saved.jobs;
    if (saved.activities) db.activities = saved.activities;
    if (saved.connection) db.connection = saved.connection;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function persistDb() {
  if (typeof window === "undefined") return;
  const payload = {
    teacher: db.teacher,
    assessments: db.assessments,
    jobs: db.jobs,
    activities: db.activities,
    connection: db.connection,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function resetDemoData() {
  const fresh = createSeed();
  db.teacher = fresh.teacher;
  db.courses = fresh.courses;
  db.students = fresh.students;
  db.assessments = fresh.assessments;
  db.jobs = fresh.jobs;
  db.activities = fresh.activities;
  db.connection = fresh.connection;
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

export function sessionFor(status: ConnectionStatus): UniversityConnection["session"] {
  if (status === "Connected") return "Active";
  if (status === "Session Expired") return "Expired";
  return "Inactive";
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
