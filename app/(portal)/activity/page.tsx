import type { Metadata } from "next";
import { ActivityView } from "@/components/activity/activity-view";

export const metadata: Metadata = { title: "Activity Log" };

export default function ActivityPage() {
  return <ActivityView />;
}
