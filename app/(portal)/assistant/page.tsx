import type { Metadata } from "next";
import { Suspense } from "react";
import { AssistantView } from "@/components/assistant/assistant-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AssistantPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <AssistantView />
    </Suspense>
  );
}
