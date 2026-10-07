"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { getUploadHistory, getUploadJob } from "@/services/api";
import type { UploadStatus } from "@/types";

const STATUSES: Array<UploadStatus | "All"> = ["All", "Completed", "Processing", "Waiting for Weightage", "Waiting for Approval", "Approved", "Failed", "Needs Review"];

export function HistoryView() {
  const router = useRouter();
  const history = useQuery({ queryKey: ["history"], queryFn: getUploadHistory });
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");
  const rows = useMemo(() => (history.data ?? []).filter((job) => status === "All" || job.status === status), [history.data, status]);

  if (history.isLoading) return <Skeleton className="h-96" />;
  if ((history.data ?? []).length === 0) {
    return <EmptyState icon={History} title="No Uploads Yet" message="When you finish a marks upload, the record will appear here." action="Upload marks" onAction={() => router.push("/uploads/new")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map((item) => (
          <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-full border px-3 py-1 text-xs ${status === item ? "border-primary bg-primary/15 text-primary" : "border-border"}`}>
            {item}
          </button>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState icon={History} title="No Uploads Yet" message="Nothing matches this status." action="Show all" onAction={() => setStatus("All")} /> : null}
      <div className="hidden overflow-hidden rounded-3xl border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/70 text-muted-foreground">
            <tr>
              {["Date", "Course", "File", "Students", "Assessments", "Status"].map((heading) => (
                <th key={heading} className="px-4 py-3 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => (
              <tr key={job.id} className="border-t border-border">
                <td className="px-4 py-3">{formatDate(job.createdAt)}</td>
                <td className="px-4 py-3">{job.courseCode}</td>
                <td className="px-4 py-3">
                  <Link href={`/history/${job.id}`} className="font-medium hover:text-primary">{job.fileName}</Link>
                </td>
                <td className="px-4 py-3">{job.studentCount}</td>
                <td className="px-4 py-3">{job.assessmentCount}</td>
                <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 md:hidden">
        {rows.map((job) => (
          <Link key={job.id} href={`/history/${job.id}`} className="glass-panel rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{job.courseCode}</p>
                <p className="text-xs text-muted-foreground">{job.fileName} · {formatDate(job.createdAt)}</p>
              </div>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-2 text-sm">{job.studentCount} students · {job.assessmentCount} assessments</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HistoryDetail({ id }: { id: string }) {
  const router = useRouter();
  const job = useQuery({ queryKey: ["history", id], queryFn: () => getUploadJob(id) });
  if (job.isLoading) return <Skeleton className="h-80" />;
  if (!job.data) return <EmptyState icon={History} title="No Uploads Yet" message="This upload record could not be found." action="Back to history" onAction={() => router.push("/history")} />;
  const data = job.data;
  return (
    <section className="glass-panel rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <p className="text-sm text-muted-foreground">{data.courseCode} — {data.courseName} · {data.fileName}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-muted-foreground">Date</dt><dd>{formatDate(data.createdAt)}</dd></div>
        <div><dt className="text-muted-foreground">Students</dt><dd>{data.studentCount}</dd></div>
        <div><dt className="text-muted-foreground">Entries verified</dt><dd>{data.entriesVerified}</dd></div>
      </dl>
      <p className="mt-4 text-sm">{data.detail}</p>
      <ul className="mt-4 space-y-2">
        {data.sections.map((section) => (
          <li key={section.name} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
            <span>{section.name} · {section.maxMarks} marks · {section.weightage}%</span>
            <StatusBadge status={section.universityStatus} />
          </li>
        ))}
      </ul>
    </section>
  );
}
