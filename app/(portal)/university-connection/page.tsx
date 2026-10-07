import type { Metadata } from "next";
import { ConnectionView } from "@/components/university/connection-view";

export const metadata: Metadata = { title: "University Connection" };

export default function UniversityPage() {
  return <ConnectionView />;
}
