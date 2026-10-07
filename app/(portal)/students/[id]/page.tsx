import type { Metadata } from "next";
import { StudentDetail } from "@/components/students/students-view";

export const metadata: Metadata = { title: "Student" };

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentDetail id={id} />;
}
