"use client";

import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { getActivityLogs, getCourses } from "@/services/api";

export function ActivityView() {
  const router = useRouter();
  const activity = useQuery({ queryKey: ["activity"], queryFn: getActivityLogs });
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const [course, setCourse] = useState("All");
  const [date, setDate] = useState("All");
  const [action, setAction] = useState("All");
  const [status, setStatus] = useState("All");

  const rows = useMemo(() => {
    return (activity.data ?? []).filter((item) => {
      if (course !== "All" && item.courseCode !== course) return false;
      if (date !== "All" && item.date !== date) return false;
      if (action !== "All" && item.action !== action) return false;
      if (status !== "All" && item.status !== status) return false;
      return true;
    });
  }, [activity.data, course, date, action, status]);

  if (activity.isLoading) return <Skeleton className="h-96" />;
  if ((activity.data ?? []).length === 0) {
        return <EmptyState icon={ScrollText} title="No Activity Yet" message="Uploads, connection checks, and section changes will be recorded here." action="Upload marks" onAction={() => router.push("/uploads/new")} />;
  }

  const dates = [...new Set((activity.data ?? []).map((item) => item.date))];
  const actions = [...new Set((activity.data ?? []).map((item) => item.action))];

  return (
    <div className="space-y-4">
      <FilterBar>
        <select className="h-11 rounded-xl border border-border bg-card/60 px-3 text-sm" value={course} onChange={(event) => setCourse(event.target.value)} aria-label="Filter by course">
          <option>All</option>
          {(courses.data ?? []).map((item) => <option key={item.id}>{item.code}</option>)}
          <option>Portal</option>
        </select>
        <select className="h-11 rounded-xl border border-border bg-card/60 px-3 text-sm" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Filter by date">
          <option>All</option>
          {dates.map((item) => <option key={item} value={item}>{formatDate(item)}</option>)}
        </select>
        <select className="h-11 rounded-xl border border-border bg-card/60 px-3 text-sm" value={action} onChange={(event) => setAction(event.target.value)} aria-label="Filter by action">
          <option>All</option>
          {actions.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="h-11 rounded-xl border border-border bg-card/60 px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
          <option>All</option>
          <option>Success</option>
          <option>Warning</option>
          <option>Info</option>
          <option>Failed</option>
        </select>
      </FilterBar>
      {rows.length === 0 ? <EmptyState icon={ScrollText} title="No Activity Yet" message="No log entries match these filters." action="Clear filters" onAction={() => { setCourse("All"); setDate("All"); setAction("All"); setStatus("All"); }} /> : (
        <ol className="relative space-y-3 border-l border-border pl-5">
          {rows.map((item) => (
            <li key={item.id} className="glass-panel rounded-2xl p-4">
              <span className="absolute -left-[5px] mt-2 size-2.5 rounded-full bg-primary" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{item.time} · {item.message}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.courseCode} · {item.action} · {formatDate(item.date)}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
