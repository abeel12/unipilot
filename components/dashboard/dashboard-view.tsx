"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, ClipboardList, Link2, Upload, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QuickAction, StatCard } from "@/components/dashboard/stat-card";
import { Reveal, RevealItem } from "@/components/shared/reveal";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate, greeting } from "@/lib/utils";
import { liveUniversityConnection, universityConnectionLabel } from "@/lib/university-connection";
import { getActivityLogs, getCourses, getTeacher, getUniversityConnection, getUploadHistory } from "@/services/api";

const PROMPTS = ["Upload marks", "Show my courses", "Check pending work", "Create assessment sections", "Review marks"];

export function DashboardView() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const teacher = useQuery({ queryKey: ["teacher"], queryFn: getTeacher });
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const history = useQuery({ queryKey: ["history"], queryFn: getUploadHistory });
  const connection = useQuery({ queryKey: ["connection"], queryFn: getUniversityConnection });
  const activity = useQuery({ queryKey: ["activity"], queryFn: getActivityLogs });
  const loading = teacher.isLoading || courses.isLoading || history.isLoading || connection.isLoading;

  if (loading) return <DashboardSkeleton />;

  const courseCount = courses.data?.length ?? 0;
  const students = courses.data?.reduce((sum, course) => sum + course.studentCount, 0) ?? 0;
  const pending = history.data?.filter((job) => job.status !== "Completed" && job.status !== "Failed").length ?? 0;
  const completed = history.data?.filter((job) => job.status === "Completed").length ?? 0;
  const recent = history.data?.slice(0, 3) ?? [];

  return (
    <Reveal className="space-y-6">
      <RevealItem>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{greeting(teacher.data?.name ?? "Faculty")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here is what is happening with your university work today.</p>
      </RevealItem>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Courses" value={courseCount} icon={BookOpen} />
        <StatCard label="Students" value={students} icon={Users} />
        <StatCard label="Pending Uploads" value={pending} icon={Upload} />
        <StatCard label="Completed Uploads" value={completed} icon={CheckCircle2} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <RevealItem>
          <article className="glass-panel h-full rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">University</p>
            <h2 className="mt-2 text-xl font-semibold">{connection.data?.university}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={universityConnectionLabel(connection.data)} pulse={liveUniversityConnection(connection.data)} />
              <StatusBadge status={connection.data?.session ?? "Inactive"} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Last authentication {connection.data?.lastAuthentication ? formatShortDate(connection.data.lastAuthentication) : "—"}
            </p>
            <Button className="mt-5" asChild>
              <Link href="/university-connection">View Connection</Link>
            </Button>
          </article>
        </RevealItem>
        <RevealItem>
          <article className="glass-panel glow-ring rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-primary">UniPilot AI</p>
            <h2 className="mt-2 text-xl font-semibold">Ask UniPilot anything about your university work.</h2>
            <form
              className="mt-4"
              onSubmit={(event) => {
                event.preventDefault();
                router.push(prompt.trim() ? `/assistant?q=${encodeURIComponent(prompt.trim())}` : "/assistant");
              }}
            >
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="What would you like to do?"
                className="h-12 w-full rounded-2xl border border-border bg-background/50 px-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {PROMPTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => router.push(`/assistant?q=${encodeURIComponent(item)}`)}
                    className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs transition hover:border-primary/50 hover:text-primary"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </form>
          </article>
        </RevealItem>
      </div>
      <RevealItem>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction href="/uploads/new" label="Upload Marks" icon={Upload} />
          <QuickAction href="/courses" label="Courses" icon={BookOpen} />
          <QuickAction href="/assessments" label="Assessments" icon={ClipboardList} />
          <QuickAction href="/university-connection" label="University Connection" icon={Link2} />
        </div>
      </RevealItem>
      <RevealItem>
        <section className="glass-panel rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <Link href="/activity" className="text-sm text-primary">
              View log
            </Link>
          </div>
          <div className="space-y-3">
            {recent.map((job) => (
              <Link key={job.id} href={`/history/${job.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3 transition hover:bg-accent/60">
                <span>
                  <span className="block font-medium">{job.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {job.studentCount} students · {job.detail}
                  </span>
                </span>
                <StatusBadge status={job.status} />
              </Link>
            ))}
            {(activity.data ?? []).slice(0, 1).map((item) => (
              <p key={item.id} className="text-xs text-muted-foreground">
                Latest log · {item.time} {item.message}
              </p>
            ))}
          </div>
        </section>
      </RevealItem>
    </Reveal>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-56" />
      <Skeleton className="h-40" />
    </div>
  );
}
