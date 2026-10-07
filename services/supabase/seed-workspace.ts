import { getBrowserClient } from "@/lib/supabase/browser";

const DEMO_CODES = new Set(["CS-301", "CS-302", "CS-305", "CS-401", "CS-410", "SE-401"]);

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function clearWorkspace(teacherId: string) {
  const client = getBrowserClient();
  throwIf((await client.from("activity_logs").delete().eq("teacher_id", teacherId)).error);
  throwIf((await client.from("upload_jobs").delete().eq("teacher_id", teacherId)).error);
  throwIf((await client.from("courses").delete().eq("teacher_id", teacherId)).error);
}

export async function disconnectUniversity(teacherId: string) {
  const { error } = await getBrowserClient()
    .from("university_connections")
    .update({ status: "Disconnected", session: "Inactive", last_authentication: null })
    .eq("teacher_id", teacherId);
  throwIf(error);
}

/** Deletes the generated sample workspace once. Real courses with any other code are left in place. */
export async function removeSeededDemo(teacherId: string) {
  const client = getBrowserClient();
  const courses = await client.from("courses").select("code").eq("teacher_id", teacherId);
  throwIf(courses.error);
  const codes = (courses.data ?? []).map((row) => String(row.code));
  const onlyDemoCourses = codes.length > 0 && codes.every((code) => DEMO_CODES.has(code));

  const jobs = await client.from("upload_jobs").select("file_name, title").eq("teacher_id", teacherId);
  throwIf(jobs.error);
  const seededJob = (jobs.data ?? []).some((row) => row.file_name === "AI_Marks.xlsx" && row.title === "CS-301 Midterm Upload");

  const connection = await client.from("university_connections").select("last_authentication").eq("teacher_id", teacherId).maybeSingle();
  throwIf(connection.error);
  const authenticatedAt = String(connection.data?.last_authentication ?? "");
  const seededConnection = authenticatedAt.startsWith("2026-09-29T18:02:00") || authenticatedAt.startsWith("2026-09-29 18:02:00");

  if (!onlyDemoCourses && !seededJob && !seededConnection) return;
  await clearWorkspace(teacherId);
  if (seededConnection || onlyDemoCourses) await disconnectUniversity(teacherId);
}
