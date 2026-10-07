import { summarizeWeightage } from "@/features/upload/weightage";
import { liveUniversityConnection, universityConnectionLabel } from "@/lib/university-connection";
import { uid } from "@/lib/utils";
import { getAssessments, getCourses, getStudents, getUniversityConnection, getUploadHistory } from "@/services/api";
import type { AICard, AIMessage } from "@/types";

function message(content: string, cards: AICard[] = []): AIMessage {
  return {
    id: uid("ai"),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    cards,
  };
}

export async function buildAssistantReply(prompt: string, fileName?: string): Promise<AIMessage> {
  const [connection, courses, students, jobs, assessments] = await Promise.all([
    getUniversityConnection(),
    getCourses(),
    getStudents(),
    getUploadHistory(),
    getAssessments(),
  ]);
  const cs301 = courses.find((course) => course.code === "CS-301");
  const text = `${prompt} ${fileName ?? ""}`.toLowerCase();

  if (/password|credential|portal login|otp code/.test(text)) {
    return message("University authentication stays on the University Connection page. I never ask for, store, or repeat portal credentials.", [
      {
        type: "university",
        status: universityConnectionLabel(connection),
        session: connection.session,
        university: connection.portalName,
        account: connection.accountName,
      },
      {
        type: "confirmation",
        title: "Open the connection page",
        message: "Check, reconnect, or disconnect the portal without entering a password here.",
        actions: [{ id: "connection", label: "University Connection", href: "/university-connection" }],
      },
    ]);
  }

  if (/connection|portal|session|authenticated/.test(text)) {
    return message(
      connection.status === "Connected" && liveUniversityConnection(connection)
        ? "Your university portal session is active."
        : "The university portal needs attention before an upload can continue.",
      [
        {
          type: "university",
          status: universityConnectionLabel(connection),
          session: connection.session,
          university: connection.portalName,
          account: connection.accountName,
        },
      ],
    );
  }

  if (/course/.test(text)) {
    return message("These are the courses on your faculty account.", [
      {
        type: "courses",
        items: courses.map((course) => ({
          code: course.code,
          name: course.name,
          meta: `${course.semester}${course.section} · ${course.studentCount} students`,
        })),
      },
    ]);
  }

  if (/missing mark|which student|incomplete/.test(text)) {
    const missing = students.filter((student) => student.marksStatus !== "Complete").slice(0, 4);
    return message("A few students still have incomplete assessment marks.", [
      ...missing.map((student) => ({
        type: "warning" as const,
        title: student.name,
        message: `${student.studentCode} · ${student.completedAssessments}/${student.totalAssessments} assessments complete.`,
      })),
      {
        type: "confirmation",
        title: "Open the roster",
        message: "Review completion for every enrolled student.",
        actions: [{ id: "students", label: "View Students", href: "/students" }],
      },
    ]);
  }

  if (/history|recent upload|my upload/.test(text)) {
    return message("Here are your most recent upload records.", [
      {
        type: "list",
        title: "Recent uploads",
        items: jobs.slice(0, 5).map((job) => ({
          title: `${job.courseCode} · ${job.fileName}`,
          meta: `${job.studentCount} students · ${job.assessmentCount} assessments`,
          status: job.status,
        })),
      },
    ]);
  }

  if (/weight/.test(text)) {
    const items = assessments
      .filter((item) => item.courseId === cs301?.id)
      .map((item) => ({ name: item.name, weightage: item.weightage }));
    const summary = summarizeWeightage(items);
    return message("This is the current CS-301 weightage picture.", [
      {
        type: "weightage",
        items,
        total: summary.total,
        valid: summary.valid,
        message: summary.valid
          ? "Weightage was detected from your records and totals 100%."
          : "Some weightage is still missing. I will ask only for the gaps.",
      },
    ]);
  }

  if (/upload|mark|assessment|section|file|analy/.test(text) || fileName) {
    const items = assessments.filter((item) => item.courseId === cs301?.id);
    const cards: AICard[] = [];
    if (fileName) {
      cards.push({ type: "file", name: fileName, size: 124 * 1024, status: "Ready to analyze" });
    }
    cards.push(
      {
        type: "subject",
        code: cs301?.code ?? "CS-301",
        name: cs301?.name ?? "Artificial Intelligence",
        confidence: 98,
        semester: cs301?.semester ?? "BSCS 5",
        section: cs301?.section ?? "A",
      },
      {
        type: "assessments",
        items: items.map((item) => ({
          name: item.name,
          type: item.type,
          maxMarks: item.maxMarks,
          weightage: item.weightage,
          confidence: item.confidence ?? 96,
        })),
      },
      {
        type: "confirmation",
        title: "Review this upload",
        message: "I will not send anything to the portal until you confirm the full review.",
        actions: [
          { id: "review", label: "Review Upload", href: "/uploads/new" },
          { id: "cancel", label: "Cancel" },
        ],
      },
    );
    return message("I detected a subject and its assessment sections. Review them before anything is uploaded.", cards);
  }

  return message("I can help with courses, marks, assessment sections, weightage, and your university connection. What should we do next?", [
    {
      type: "list",
      title: "Try one of these",
      items: [
        { title: "Upload these marks for Artificial Intelligence.", meta: "Starts a document review" },
        { title: "Show my current courses.", meta: "Opens your faculty course list" },
        { title: "Which students are missing marks?", meta: "Finds incomplete rows" },
        { title: "Check my university connection.", meta: "Reads portal status only" },
      ],
    },
  ]);
}
