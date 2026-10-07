"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FileUp, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ErrorState } from "@/components/shared/error-state";
import { SuccessState } from "@/components/shared/success-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { comparisonFor } from "@/features/upload/weightage";
import { fileKind, formatBytes, uid } from "@/lib/utils";
import { liveUniversityConnection } from "@/lib/university-connection";
import { ASSESSMENT_TYPES, analyzeDocument, approveUploadJob, getCourses, getUniversityConnection, simulateUpload } from "@/services/api";
import type { AssessmentType, DetectedAssessment, DetectedIssue, DocumentAnalysis, UploadFileMeta, UploadProgressEvent, UploadResult } from "@/types";
import { UploadStepper } from "./upload-stepper";
import { WeightageEditor } from "./weightage-editor";

const assessmentSchema = z.object({
  name: z.string().min(2, "Enter a name"),
  type: z.enum(["Assignment", "Quiz", "Presentation", "Project", "Lab", "Midterm", "Final", "Other"]),
  maxMarks: z.number().positive("Enter a maximum above 0"),
  weightage: z.string(),
});

type AssessmentForm = z.infer<typeof assessmentSchema>;

export function UploadFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const connection = useQuery({ queryKey: ["connection"], queryFn: getUniversityConnection });
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<UploadFileMeta | null>(null);
  const [source, setSource] = useState<File | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, "cap" | "exclude">>({});
  const [fileProgress, setFileProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [choosingSubject, setChoosingSubject] = useState(false);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [assessments, setAssessments] = useState<DetectedAssessment[]>([]);
  const [issues, setIssues] = useState<DetectedIssue[]>([]);
  const [editingWeight, setEditingWeight] = useState(false);
  const [editor, setEditor] = useState<DetectedAssessment | "new" | null>(null);
  const [events, setEvents] = useState<UploadProgressEvent[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const stages = [
    "Reading document",
    "Detecting subject",
    "Detecting student records",
    "Detecting assessments",
    "Detecting maximum marks",
    "Detecting weightage",
    "Validating document structure",
  ];

  useEffect(() => {
    if (!file) return;
    let value = 0;
    const timer = window.setInterval(() => {
      value = Math.min(100, value + 8);
      setFileProgress(value);
      if (value >= 100) window.clearInterval(timer);
    }, 45);
    return () => window.clearInterval(timer);
  }, [file]);

  useEffect(() => {
    if (step !== 1 || !source) return;
    let cancelled = false;
    const run = async () => {
      setStageIndex(-1);
      const pending = analyzeDocument(source);
      for (let index = 0; index < stages.length; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 480));
        if (cancelled) return;
        setStageIndex(index);
      }
      try {
      const next = await pending;
      if (cancelled) return;
      if (next.parseError) {
        toast.error(next.issues[0]?.message ?? "We couldn't understand this file.");
        setAnalysis(next);
        setStep(0);
        return;
      }
      setAnalysis(next);
      setAssessments(next.assessments);
      setIssues(next.issues);
      setCourseId(next.subject?.courseId ?? null);
      setChoosingSubject(next.requiresManualSubject || !next.subject);
      if (!next.parseError) setStep(2);
      } catch (error) {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : "The file could not be analyzed.");
        setStep(0);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // stages is a stable literal list for this screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, source]);

  const course = courses.data?.find((item) => item.id === courseId) ?? null;
  const rows = useMemo(() => comparisonFor(assessments), [assessments]);
  const createCount = rows.filter((row) => row.action === "Create").length;
  const existsCount = rows.filter((row) => row.action === "No Action").length;
  const openIssues = issues.filter((issue) => !issue.resolved);
  const portalReady = liveUniversityConnection(connection.data);
  const activeUpload = events.find((event) => event.status === "active");
  const percent = events.length ? events[events.length - 1]?.percent ?? 0 : 0;
  const studentsDone = activeUpload?.studentsDone ?? (events.some((event) => event.id === "upload" && event.status === "done") ? file ? analysis?.studentCount ?? 0 : 0 : 0);

  function takeFile(next: File) {
    const kind = fileKind(next.name);
    if (!kind) {
      toast.error("Use an Excel, CSV, PDF, or DOCX file.");
      return;
    }
    setSource(next);
    setResolutions({});
    setFile({ name: next.name, size: next.size, kind });
    setFileProgress(0);
    setAnalysis(null);
    setResult(null);
    setStep(0);
  }

  function resolveIssue(id: string, fix?: "cap") {
    setResolutions((current) => ({ ...current, [id]: fix === "cap" ? "cap" : "exclude" }));
    setIssues((current) => current.map((issue) => (issue.id === id ? { ...issue, resolved: true, message: fix === "cap" ? "Mark capped at the maximum." : "Row removed from this upload." } : issue)));
  }

  async function startUpload() {
    if (!file || !courseId) return;
    if (!analysis?.jobId && !portalReady) return;
    setUploading(true);
    setUploadError(null);
    if (!analysis?.jobId) setStep(7);
    try {
      const upload = analysis?.jobId
        ? await approveUploadJob({ jobId: analysis.jobId, courseId, assessments, resolutions, students: analysis.students, issues: analysis.issues })
        : await simulateUpload(
            { courseId, fileName: file.name, studentCount: analysis?.studentCount ?? 0, assessments },
            setEvents,
          );
      setResult(upload);
      await queryClient.invalidateQueries();
      setStep(8);
    } catch (error) {
      setUploadError(
        analysis?.jobId
          ? error instanceof Error
            ? error.message
            : "The upload could not be approved."
          : "Your university account must be reconnected before uploads can continue.",
      );
      setStep(6);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <UploadStepper step={step} />
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
          {step === 0 ? (
            <section className="space-y-4">
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const next = event.dataTransfer.files[0];
                  if (next) takeFile(next);
                }}
                className={`glass-panel flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-3xl border-dashed p-8 text-center ${dragOver ? "border-primary" : ""}`}
              >
                <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <FileUp />
                </span>
                <p className="text-lg font-medium">Drop your marks file here</p>
                <p className="mt-1 text-sm text-muted-foreground">Supported: Excel, CSV, PDF, DOCX</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
                  className="sr-only"
                  onChange={(event) => {
                    const next = event.target.files?.[0];
                    if (next) takeFile(next);
                  }}
                />
                <span className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">Browse Files</span>
              </label>
              {file ? (
                <article className="glass-panel rounded-3xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{file.name}</h2>
                      <p className="text-sm text-muted-foreground">Size: {formatBytes(file.size)}</p>
                      <p className="text-sm">Status: {fileProgress < 100 ? "Uploading" : "Ready"}</p>
                    </div>
                    <StatusBadge status={fileProgress < 100 ? "Processing" : "Ready"} />
                  </div>
                  <div className="mt-4">
                    <Progress value={fileProgress} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setSource(null);
                        setFileProgress(0);
                      }}
                    >
                      Remove
                    </Button>
                    <Button disabled={fileProgress < 100} onClick={() => setStep(1)}>
                      Analyze Document
                    </Button>
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}

          {step === 1 ? (
            <section className="glass-panel rounded-3xl p-6">
              <div className="mb-5 flex items-center gap-3">
                <Loader2 className="size-5 animate-spin text-primary motion-reduce:animate-none" />
                <div>
                  <h2 className="text-xl font-semibold">Analyzing Document</h2>
                  <p className="text-sm text-muted-foreground">UniPilot is reading structure, marks, and weightage.</p>
                </div>
              </div>
              <ul className="space-y-3">
                {stages.map((stage, index) => {
                  const done = index <= stageIndex;
                  return (
                    <li key={stage} className="flex items-center justify-between rounded-2xl border border-border px-3 py-3">
                      <span>{stage}</span>
                      <span className={`grid size-6 place-items-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                        {done ? <Check className="size-3.5" /> : index + 1}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {analysis?.parseError ? (
                <div className="mt-4">
                  <ErrorState
                    title="File Parsing Error"
                    message="We couldn't understand this file completely."
                    primary="Try Again"
                    secondary="Review Manually"
                    onPrimary={() => {
                      setFile(null);
                      setSource(null);
                      setAnalysis(null);
                      setStep(0);
                    }}
                    onSecondary={() => {
                      setAssessments([
                        {
                          id: uid("manual"),
                          name: "Assignment 1",
                          type: "Assignment",
                          maxMarks: 10,
                          weightage: null,
                          source: "Teacher",
                          confidence: 100,
                          universityStatus: "Missing",
                        },
                      ]);
                      setChoosingSubject(true);
                      setStep(2);
                    }}
                    shake
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 2 ? (
            <SubjectStep
              analysis={analysis}
              courseId={courseId}
              choosing={choosingSubject}
              query={subjectQuery}
              courses={courses.data ?? []}
              onQuery={setSubjectQuery}
              onChoose={(id) => {
                setCourseId(id);
                setChoosingSubject(false);
                setIssues((current) => current.map((issue) => (issue.kind === "subject-not-found" ? { ...issue, resolved: true, message: "Course selected by the teacher." } : issue)));
              }}
              onChange={() => setChoosingSubject(true)}
              onConfirm={() => courseId && setStep(3)}
            />
          ) : null}

          {step === 3 ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Assessments detected</h2>
                  <p className="text-sm text-muted-foreground">Edit anything before weightage is validated.</p>
                </div>
                <Button variant="outline" onClick={() => setEditor("new")}>
                  Add Assessment
                </Button>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {assessments.map((item) => (
                  <article key={item.id} className="glass-panel rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold">{item.name}</h3>
                      <StatusBadge status={item.source === "Missing" || item.weightage == null ? "Missing" : "Detected"} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Type</dt>
                        <dd>{item.type}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Max marks</dt>
                        <dd>{item.maxMarks}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Weightage</dt>
                        <dd>{item.weightage == null ? "Not found" : `${item.weightage}%`}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Source</dt>
                        <dd>{item.source}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Confidence</dt>
                        <dd>{item.confidence}%</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditor(item)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (assessments.length === 1) {
                            toast.error("Keep at least one assessment.");
                            return;
                          }
                          setAssessments((current) => current.filter((row) => row.id !== item.id));
                        }}
                      >
                        <Trash2 /> Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={() => setStep(4)} disabled={assessments.length === 0}>
                  Continue
                </Button>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <WeightageEditor
                items={assessments}
                editing={editingWeight}
                onEdit={() => setEditingWeight(true)}
                onChange={(id, value) =>
                  setAssessments((current) =>
                    current.map((item) =>
                      item.id === id
                        ? { ...item, weightage: value, source: value == null ? "Missing" : item.source === "Document" ? "Document" : "Teacher" }
                        : item,
                    ),
                  )
                }
                onConfirm={() => setStep(5)}
              />
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
            </div>
          ) : null}

          {step === 5 ? (
            <section className="glass-panel space-y-4 rounded-3xl p-5">
              <div>
                <h2 className="text-xl font-semibold">University Assessment Setup</h2>
                <p className="text-sm text-muted-foreground">
                  {analysis?.jobId
                    ? "These assessments were read from your file. The university portal has not been checked, and nothing will be written there."
                    : `${createCount} sections will be created. ${existsCount} sections already exist.`}
                </p>
              </div>
              <ComparisonList rows={rows} />
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="outline" onClick={() => setStep(4)}>
                  Back
                </Button>
                <Button onClick={() => setStep(6)}>{analysis?.jobId ? "Continue to review" : "Create Sections & Continue"}</Button>
              </div>
            </section>
          ) : null}

          {step === 6 && course ? (
            <section className="space-y-4">
              <div className="glass-panel rounded-3xl p-5">
                <h2 className="text-xl font-semibold">Ready to Configure & Upload</h2>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Subject</dt>
                    <dd className="font-medium">
                      {course.code} — {course.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Semester</dt>
                    <dd>
                      {course.semester}
                      {course.section}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Students</dt>
                    <dd>{analysis?.studentCount ?? course.studentCount}</dd>
                  </div>
                </dl>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-2 font-medium">Assessment</th>
                        <th className="py-2 font-medium">Max marks</th>
                        <th className="py-2 font-medium">Weightage</th>
                        <th className="py-2 font-medium">University status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-t border-border">
                          <td className="py-2">{row.name}</td>
                          <td>{row.maxMarks}</td>
                          <td>{row.weightage}%</td>
                          <td>
                            <StatusBadge status={row.reviewStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-sm font-medium text-primary">Weightage total: 100% ✓</p>
              </div>
              {!portalReady && analysis?.jobId ? (
                <p className="text-sm text-muted-foreground">University writes are off. Approval saves this upload. Nothing is sent to the portal.</p>
              ) : null}
              {!portalReady && !analysis?.jobId ? (
                <ErrorState
                  title="University Session Expired"
                  message="Your university account must be reconnected before uploads can continue."
                  primary="Reconnect University"
                  onPrimary={() => router.push("/university-connection")}
                  shake
                />
              ) : null}
              {uploadError ? <ErrorState title="Upload paused" message={uploadError} shake /> : null}
              <div className="space-y-3">
                {openIssues.map((issue) =>
                  issue.kind === "student-not-found" ? (
                    <ErrorState
                      key={issue.id}
                      title="Student Not Found"
                      message={`Student ID ${issue.studentCode}. ${issue.message}`}
                      primary="Remove Row"
                      secondary="Cancel Upload"
                      onPrimary={() => resolveIssue(issue.id)}
                      onSecondary={() => setStep(0)}
                    />
                  ) : issue.kind === "invalid-marks" ? (
                    <ErrorState
                      key={issue.id}
                      title="Invalid Marks"
                      message={`${issue.studentName} entered ${issue.enteredMarks}. Maximum is ${issue.maxMarks}. ${issue.message}`}
                      primary="Cap at Maximum"
                      secondary="Remove Row"
                      onPrimary={() => resolveIssue(issue.id, "cap")}
                      onSecondary={() => resolveIssue(issue.id)}
                    />
                  ) : null,
                )}
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="outline" onClick={() => setStep(5)}>
                  Back
                </Button>
                <Button onClick={() => void startUpload()} disabled={(!analysis?.jobId && !portalReady) || openIssues.length > 0 || uploading}>
                  {analysis?.jobId ? "Approve" : "Approve & Upload"}
                </Button>
              </div>
            </section>
          ) : null}

          {step === 7 ? (
            <section className="glass-panel rounded-3xl p-5">
              <h2 className="text-xl font-semibold">Configuring {course?.code}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {events.find((event) => event.id === "upload")?.studentsDone ?? 0} / {analysis?.studentCount ?? 0} students
              </p>
              <div className="mt-4">
                <Progress value={percent} />
                <p className="mt-2 text-sm">{percent}%</p>
              </div>
              <ul className="mt-5 space-y-2">
                {events.map((event) => (
                  <li key={event.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                    <span>{event.label}</span>
                    <span className="text-muted-foreground">{event.status === "done" ? "✓" : event.status === "active" ? "…" : ""}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="mt-4 text-sm text-primary" onClick={() => setShowLogs((value) => !value)}>
                {showLogs ? "Hide details" : "View Details"}
              </button>
              {showLogs ? (
                <ul className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
                  {events
                    .filter((event) => event.log)
                    .map((event) => (
                      <li key={event.id}>
                        {event.log?.time} {event.log?.message}
                      </li>
                    ))}
                </ul>
              ) : null}
              <p className="mt-4 text-xs text-muted-foreground">Students processed: {studentsDone}</p>
            </section>
          ) : null}

          {step === 8 && result ? (
            <SuccessState
              title={result.job.status === "Approved" ? "Upload approved" : "Upload Completed Successfully"}
              message={result.job.status === "Approved" ? result.job.detail : undefined}
              secondary="View Details"
              primary="Go to Dashboard"
              onSecondary={() => router.push(`/history/${result.job.id}`)}
              onPrimary={() => router.push("/dashboard")}
            >
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Course</dt>
                  <dd>
                    {result.job.courseCode} — {result.job.courseName}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Students</dt>
                  <dd>
                    {result.job.studentCount} / {result.job.studentCount}
                  </dd>
                </div>
              </dl>
              <ul className="mt-4 space-y-1 text-sm">
                {result.job.sections.map((section) => (
                  <li key={section.name}>
                    {section.name} ✓
                  </li>
                ))}
              </ul>
              {result.job.status === "Approved" ? null : (
                <>
                  <p className="mt-4 text-sm">Entries verified: {result.job.entriesVerified}</p>
                  <p className="text-sm">Errors: {result.job.errors}</p>
                </>
              )}
            </SuccessState>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <AssessmentDialog
        target={editor}
        onClose={() => setEditor(null)}
        onSave={(next) => {
          setAssessments((current) => {
            const index = current.findIndex((item) => item.id === next.id);
            if (index === -1) return [...current, next];
            return current.map((item) => (item.id === next.id ? next : item));
          });
          setEditor(null);
        }}
      />
    </div>
  );
}

function SubjectStep({
  analysis,
  courseId,
  choosing,
  query,
  courses,
  onQuery,
  onChoose,
  onChange,
  onConfirm,
}: {
  analysis: DocumentAnalysis | null;
  courseId: string | null;
  choosing: boolean;
  query: string;
  courses: { id: string; code: string; name: string; semester: string; section: string }[];
  onQuery: (value: string) => void;
  onChoose: (id: string) => void;
  onChange: () => void;
  onConfirm: () => void;
}) {
  const selected = analysis?.matches.find((match) => match.courseId === courseId) ?? analysis?.subject;
  const filtered = courses.filter((course) => `${course.code} ${course.name}`.toLowerCase().includes(query.toLowerCase()));
  const showChoices = choosing || analysis?.requiresManualSubject || analysis?.subjectNotFound;

  return (
    <section className="space-y-4">
      {analysis?.subjectNotFound ? (
        <ErrorState title="Subject Not Found" message="We couldn't find CS-301 in your university account." shake />
      ) : null}
      {analysis?.requiresManualSubject ? (
        <ErrorState title="Multiple Subjects Found" message="Several courses match this document." />
      ) : null}
      {!showChoices && selected ? (
        <article className="glass-panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Subject detected</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Course code" value={selected.code} />
            <Field label="Course name" value={selected.name} />
            <Field label="Semester" value={selected.semester} />
            <Field label="Section" value={selected.section} />
            <Field label="Confidence" value={`${selected.confidence}%`} />
            <Field label="University match" value={`${selected.code} — ${selected.name}`} />
          </dl>
          <div className="mt-4">
            <StatusBadge status={selected.match} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={onConfirm}>Confirm Subject</Button>
            <Button variant="outline" onClick={onChange}>
              Change Subject
            </Button>
          </div>
        </article>
      ) : (
        <article className="glass-panel rounded-3xl p-5">
          <h2 className="font-semibold">Possible matches</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose the course yourself. UniPilot will not guess when the match is uncertain.</p>
          <Input className="mt-4" placeholder="Search your courses" value={query} onChange={(event) => onQuery(event.target.value)} />
          {filtered.length === 0 ? (
            <div className="mt-4">
              <ErrorState title="Subject Not Found" message="No course matches that search." primary="Search Again" onPrimary={() => onQuery("")} />
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {(analysis?.matches.length && !query ? analysis.matches : filtered.map((course) => ({
                courseId: course.id,
                code: course.code,
                name: course.name,
                semester: course.semester,
                section: course.section,
                confidence: course.id === analysis?.subject?.courseId ? analysis.subject.confidence : 70,
                match: "Possible Match" as const,
              }))).map((match) => (
                <button
                  key={match.courseId}
                  type="button"
                  onClick={() => onChoose(match.courseId)}
                  className={`rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 ${courseId === match.courseId ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  <span className="block font-medium">
                    {match.code} — {match.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {match.semester}
                    {match.section} · {match.confidence}% · {match.match}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => onQuery("")}>
              Search Again
            </Button>
            <Button disabled={!courseId} onClick={onConfirm}>
              Confirm Subject
            </Button>
          </div>
        </article>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ComparisonList({
  rows,
}: {
  rows: ReturnType<typeof comparisonFor>;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 font-medium">Assessment</th>
              <th className="py-2 font-medium">Document</th>
              <th className="py-2 font-medium">University</th>
              <th className="py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="py-2">{row.name}</td>
                <td>{row.document}</td>
                <td>{row.university}</td>
                <td>
                  <StatusBadge status={row.action} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-border p-3 text-sm">
            <p className="font-medium">{row.name}</p>
            <p className="text-muted-foreground">Document: {row.document}</p>
            <p className="text-muted-foreground">University: {row.university}</p>
            <div className="mt-2">
              <StatusBadge status={row.action} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function AssessmentDialog({
  target,
  onClose,
  onSave,
}: {
  target: DetectedAssessment | "new" | null;
  onClose: () => void;
  onSave: (value: DetectedAssessment) => void;
}) {
  const form = useForm<AssessmentForm>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: { name: "", type: "Assignment", maxMarks: 10, weightage: "" },
  });

  const resetForm = form.reset;
  useEffect(() => {
    if (!target) return;
    if (target === "new") resetForm({ name: "", type: "Assignment", maxMarks: 10, weightage: "" });
    else resetForm({ name: target.name, type: target.type, maxMarks: target.maxMarks, weightage: target.weightage?.toString() ?? "" });
  }, [target, resetForm]);

  return (
    <Dialog open={target != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={target === "new" ? "Add assessment" : "Edit assessment"} description="Name, type, maximum marks, and weightage.">
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => {
            const weightage = values.weightage.trim() === "" ? null : Number(values.weightage);
            const base = target && target !== "new" ? target : null;
            onSave({
              id: base?.id ?? uid("assess"),
              name: values.name,
              type: values.type as AssessmentType,
              maxMarks: values.maxMarks,
              weightage: Number.isFinite(weightage) ? weightage : null,
              source: weightage == null ? "Missing" : base?.source === "Document" ? "Document" : "Teacher",
              confidence: base?.confidence ?? 100,
              universityStatus: base?.universityStatus ?? "Missing",
            });
          })}
        >
          <div>
            <Label htmlFor="assessment-name">Assessment name</Label>
            <Input id="assessment-name" {...form.register("name")} />
          </div>
          <div>
            <Label htmlFor="assessment-type">Assessment type</Label>
            <select id="assessment-type" className="mt-1 h-11 w-full rounded-xl border border-border bg-background/50 px-3 text-sm" {...form.register("type")}>
              {ASSESSMENT_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="max-marks">Maximum marks</Label>
            <Input id="max-marks" type="number" {...form.register("maxMarks", { valueAsNumber: true })} />
          </div>
          <div>
            <Label htmlFor="weight">Weightage</Label>
            <Input id="weight" inputMode="numeric" placeholder="Leave blank if missing" {...form.register("weightage")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
