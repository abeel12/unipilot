"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Reveal, RevealItem } from "@/components/shared/reveal";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssessments, getCourses, getUploadHistory } from "@/services/api";

export function CoursesView() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const filtered = useMemo(
    () => (courses.data ?? []).filter((course) => `${course.code} ${course.name} ${course.semester}`.toLowerCase().includes(query.toLowerCase())),
    [courses.data, query],
  );

  if (courses.isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-44" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search courses..." />
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={(courses.data ?? []).length === 0 ? "No courses yet" : "No Courses Found"}
          message={(courses.data ?? []).length === 0 ? "Courses show up here after you upload a marks file." : "Try another name or course code."}
          action={(courses.data ?? []).length === 0 ? "Upload marks" : "Clear search"}
          onAction={() => ((courses.data ?? []).length === 0 ? router.push("/uploads/new") : setQuery(""))}
        />
      ) : (
        <Reveal className="grid gap-3 md:grid-cols-2">
          {filtered.map((course) => (
            <RevealItem key={course.id}>
              <article className="glass-panel h-full rounded-3xl p-5 transition hover:-translate-y-0.5">
                <p className="text-xs text-muted-foreground">{course.code}</p>
                <h2 className="mt-1 text-lg font-semibold">{course.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {course.semester}
                  {course.section} · {course.studentCount} students
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/courses/${course.id}`}>View Course</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/assessments?course=${course.id}`}>Assessments</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/students?course=${course.id}`}>Students</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/uploads/new">Upload Marks</Link>
                  </Button>
                </div>
              </article>
            </RevealItem>
          ))}
        </Reveal>
      )}
    </div>
  );
}

export function CourseDetail({ id }: { id: string }) {
  const router = useRouter();
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const assessments = useQuery({ queryKey: ["assessments"], queryFn: getAssessments });
  const history = useQuery({ queryKey: ["history"], queryFn: getUploadHistory });
  const course = courses.data?.find((item) => item.id === id);

  if (courses.isLoading) return <Skeleton className="h-80" />;
  if (!course) return <EmptyState icon={BookOpen} title="No Courses Found" message="This course is not on your account." action="Back to courses" onAction={() => router.push("/courses")} />;

  const rows = (assessments.data ?? []).filter((item) => item.courseId === course.id);
  const uploads = (history.data ?? []).filter((item) => item.courseId === course.id);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="glass-panel rounded-3xl p-5">
        <PageHeader eyebrow={course.code} title={course.name} subtitle={`${course.semester}${course.section} · ${course.studentCount} students`} />
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Semester</dt>
            <dd>{course.semester}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Section</dt>
            <dd>{course.section}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Students</dt>
            <dd>{course.studentCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Assessments</dt>
            <dd>{rows.length}</dd>
          </div>
        </dl>
        <h2 className="mt-6 font-semibold">Grading structure</h2>
        <ul className="mt-2 space-y-2">
          {course.grading.map((item) => (
            <li key={item.name} className="flex justify-between rounded-xl border border-border px-3 py-2 text-sm">
              <span>{item.name}</span>
              <span>{item.weightage}%</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-4">
        <article className="glass-panel rounded-3xl p-5">
          <h2 className="font-semibold">Assessments</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {rows.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span>{item.name}</span>
                <span className="text-muted-foreground">{item.universityStatus}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="glass-panel rounded-3xl p-5">
          <h2 className="font-semibold">Recent uploads</h2>
          {uploads.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No uploads for this course yet.</p> : null}
          <ul className="mt-3 space-y-2">
            {uploads.map((item) => (
              <li key={item.id}>
                <Link href={`/history/${item.id}`} className="text-sm hover:text-primary">
                  {item.fileName} · {item.status}
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
