import type { Metadata } from "next";
import { UploadFlow } from "@/components/uploads/upload-flow";

export const metadata: Metadata = { title: "Upload Marks" };

export default function UploadPage() {
  return <UploadFlow />;
}
