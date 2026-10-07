import type { Metadata } from "next";
import { Suspense } from "react";
import { AssessmentsView } from "@/components/assessments/assessments-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Assessments" };

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const params = await searchParams;
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <AssessmentsView initialCourse={params.course ?? ""} />
    </Suspense>
  );
}
