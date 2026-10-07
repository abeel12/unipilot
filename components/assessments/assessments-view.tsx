"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ASSESSMENT_TYPES, getAssessments, getCourses } from "@/services/api";
import { formatDate } from "@/lib/utils";

export function AssessmentsView({ initialCourse = "" }: { initialCourse?: string }) {
  const router = useRouter();
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const assessments = useQuery({ queryKey: ["assessments"], queryFn: getAssessments });
  const [courseId, setCourseId] = useState(initialCourse);
  const [type, setType] = useState("All");
  const [semester, setSemester] = useState("All");
  const [status, setStatus] = useState("All");

  const rows = useMemo(() => {
    return (assessments.data ?? []).filter((item) => {
      const course = courses.data?.find((entry) => entry.id === item.courseId);
      if (courseId && item.courseId !== courseId) return false;
      if (type !== "All" && item.type !== type) return false;
      if (semester !== "All" && course?.semester !== semester) return false;
      if (status !== "All" && item.universityStatus !== status) return false;
      return true;
    });
  }, [assessments.data, courses.data, courseId, type, semester, status]);

  if (assessments.isLoading || courses.isLoading) return <Skeleton className="h-96" />;

  const semesters = [...new Set((courses.data ?? []).map((course) => course.semester))];
  const grouped = (courses.data ?? [])
    .map((course) => ({ course, items: rows.filter((item) => item.courseId === course.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-4">
        <select className="h-11 rounded-xl border border-border bg-card/60 px-3 text-sm" value={courseId} onChange={(event) => setCourseId(event.target.value)} aria-label="Filter by course">
          <option value="">All courses</option>
          {(courses.data ?? []).map((course) => (
            <option key={course.id} value={course.id}>
              {course.code}
            </option>
          ))}
        </select>
        <select className="h-11 rounded-xl border border-border bg-card/60 px-3 text-sm" value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by assessment type">
          <option>All</option>
          {ASSESSMENT_TYPES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="h-11 rounded-xl border border-border bg-card/60 px-3 text-sm" value={semester} onChange={(event) => setSemester(event.target.value)} aria-label="Filter by semester">
          <option>All</option>
          {semesters.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="h-11 rounded-xl border border-border bg-card/60 px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
          <option>All</option>
          <option>Exists</option>
          <option>Missing</option>
        </select>
      </div>
      {grouped.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No Assessments Found" message="Adjust the filters or upload a marks file to detect sections." action="Upload marks" onAction={() => router.push("/uploads/new")} />
      ) : (
        grouped.map((group) => (
          <section key={group.course.id} className="glass-panel rounded-3xl p-5">
            <h2 className="font-semibold">{group.course.name}</h2>
            <p className="text-xs text-muted-foreground">{group.course.code}</p>
            <div className="mt-3 grid gap-2">
              {group.items.map((item) => (
                <article key={item.id} className="grid gap-2 rounded-2xl border border-border p-3 text-sm md:grid-cols-[1.3fr_repeat(5,0.7fr)] md:items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground md:hidden">{item.type}</p>
                  </div>
                  <span className="hidden md:block">{item.type}</span>
                  <span>Max {item.maxMarks}</span>
                  <span>{item.weightage == null ? "—" : `${item.weightage}%`}</span>
                  <StatusBadge status={item.universityStatus} />
                  <span className="text-muted-foreground">
                    {item.source} · {formatDate(item.createdAt)}
                  </span>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
