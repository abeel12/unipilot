import type { Metadata } from "next";
import { HistoryView } from "@/components/history/history-view";

export const metadata: Metadata = { title: "Upload History" };

export default function HistoryPage() {
  return <HistoryView />;
}
