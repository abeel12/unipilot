"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssessments, getCourses, getStudent, getStudents } from "@/services/api";

export function StudentsView({ initialCourse = "" }: { initialCourse?: string }) {
  const router = useRouter();
  const students = useQuery({ queryKey: ["students"], queryFn: getStudents });
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const [query, setQuery] = useState("");
  const [courseId, setCourseId] = useState(initialCourse);
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    return (students.data ?? []).filter((student) => {
      const course = courses.data?.find((item) => item.id === student.courseId);
      const haystack = `${student.name} ${student.studentCode} ${course?.code ?? ""}`.toLowerCase();
      if (courseId && student.courseId !== courseId) return false;
      return haystack.includes(query.toLowerCase());
    });
  }, [students.data, courses.data, query, courseId]);
  const pageSize = 8;
  const slice = filtered.slice(page * pageSize, page * pageSize + pageSize);

  if (students.isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-[1fr_220px]">
        <SearchInput value={query} onChange={(value) => { setQuery(value); setPage(0); }} placeholder="Search students..." />
        <select className="h-11 rounded-xl border border-border bg-card/60 px-3 text-sm" value={courseId} onChange={(event) => { setCourseId(event.target.value); setPage(0); }} aria-label="Course">
          <option value="">All courses</option>
          {(courses.data ?? []).map((course) => (
            <option key={course.id} value={course.id}>{course.code}</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={(students.data ?? []).length === 0 ? "No students yet" : "No students match"}
          message={(students.data ?? []).length === 0 ? "Students appear here after you approve a marks file." : "Try a different name, ID, or course."}
          action={(students.data ?? []).length === 0 ? "Upload marks" : "Reset"}
          onAction={() => ((students.data ?? []).length === 0 ? router.push("/uploads/new") : (setQuery(""), setCourseId("")))}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/70 text-muted-foreground">
                <tr>
                  {["Student ID", "Student Name", "Course", "Marks Status", "Assessment Completion", "Overall Percentage"].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((student) => {
                  const course = courses.data?.find((item) => item.id === student.courseId);
                  return (
                    <tr key={student.id} className="border-t border-border">
                      <td className="px-4 py-3">{student.studentCode}</td>
                      <td className="px-4 py-3">
                        <Link href={`/students/${student.id}`} className="font-medium hover:text-primary">{student.name}</Link>
                      </td>
                      <td className="px-4 py-3">{course?.code}</td>
                      <td className="px-4 py-3"><StatusBadge status={student.marksStatus} /></td>
                      <td className="px-4 py-3">{student.completedAssessments}/{student.totalAssessments}</td>
                      <td className="px-4 py-3">{student.overallPercentage == null ? "—" : `${student.overallPercentage}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-2 md:hidden">
            {slice.map((student) => {
              const course = courses.data?.find((item) => item.id === student.courseId);
              return (
                <Link key={student.id} href={`/students/${student.id}`} className="glass-panel rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.studentCode} · {course?.code}</p>
                    </div>
                    <StatusBadge status={student.marksStatus} />
                  </div>
                  <p className="mt-2 text-sm">
                    {student.completedAssessments}/{student.totalAssessments} · {student.overallPercentage == null ? "—" : `${student.overallPercentage}%`}
                  </p>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">{filtered.length} students</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={(page + 1) * pageSize >= filtered.length} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function StudentDetail({ id }: { id: string }) {
  const router = useRouter();
  const student = useQuery({ queryKey: ["student", id], queryFn: () => getStudent(id) });
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const assessments = useQuery({ queryKey: ["assessments"], queryFn: getAssessments });
  if (student.isLoading) return <Skeleton className="h-80" />;
  if (!student.data) return <EmptyState icon={Users} title="Student not found" message="This record is not in the current roster." action="Back to students" onAction={() => router.push("/students")} />;
  const person = student.data;
  const course = courses.data?.find((item) => item.id === person.courseId);
  const marks = person.marks.map((mark) => ({
    ...mark,
    assessment: assessments.data?.find((item) => item.id === mark.assessmentId),
  }));
  const missing = marks.filter((mark) => mark.score == null);

  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="glass-panel rounded-3xl p-5">
        <h1 className="text-2xl font-semibold">{person.name}</h1>
        <p className="text-sm text-muted-foreground">{person.studentCode}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Course</dt><dd>{course ? `${course.code} — ${course.name}` : "—"}</dd></div>
          <div className="flex justify-between"><dt>Overall</dt><dd>{person.overallPercentage == null ? "—" : `${person.overallPercentage}%`}</dd></div>
          <div className="flex justify-between"><dt>Status</dt><dd><StatusBadge status={person.marksStatus} /></dd></div>
        </dl>
      </section>
      <section className="glass-panel rounded-3xl p-5">
        <h2 className="font-semibold">Assessment marks</h2>
        <ul className="mt-3 space-y-2">
          {marks.map((mark) => (
            <li key={mark.assessmentId} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
              <span>{mark.assessment?.name ?? "Assessment"}</span>
              <span>{mark.score == null ? "Missing" : `${mark.score} / ${mark.assessment?.maxMarks}`}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-5 text-sm font-semibold">Missing marks</h3>
        {missing.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">None. This student is complete for the recorded assessments.</p> : (
          <ul className="mt-2 text-sm text-muted-foreground">
            {missing.map((mark) => <li key={mark.assessmentId}>{mark.assessment?.name}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
