import type { Metadata } from "next";
import { Suspense } from "react";
import { StudentsView } from "@/components/students/students-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const params = await searchParams;
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <StudentsView initialCourse={params.course ?? ""} />
    </Suspense>
  );
}
