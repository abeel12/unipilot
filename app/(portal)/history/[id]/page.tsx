import type { Metadata } from "next";
import { HistoryDetail } from "@/components/history/history-view";

export const metadata: Metadata = { title: "Upload Details" };

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HistoryDetail id={id} />;
}
