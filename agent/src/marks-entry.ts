import type { Page } from "playwright";
import { readDevice, appOrigin } from "./device-store";

export interface MarkStudent {
  studentId: string;
  name: string;
  marks: Record<string, number>;
}

export interface ApprovedFile {
  courseCode: string;
  courseName: string;
  fileName: string;
  students: MarkStudent[];
}

export interface MarkEntry {
  studentId: string;
  name: string;
  score: number;
}

export function wantsMarkUpload(prompt: string) {
  return /\b(upload|enter|save|submit|fill|put)\b/i.test(prompt) && /\b(mark|marks|grade|grades|score|scores)\b/i.test(prompt);
}

export function marksForPrompt(prompt: string, students: MarkStudent[]) {
  const names = new Set<string>();
  for (const student of students) {
    for (const name of Object.keys(student.marks)) names.add(name);
  }
  const list = [...names];
  const named = list.find((name) => prompt.toLowerCase().includes(name.toLowerCase()));
  const assessment = named ?? list[0] ?? "";
  const entries: MarkEntry[] = [];
  for (const student of students) {
    const score = student.marks[assessment];
    if (typeof score !== "number" || !assessment) continue;
    entries.push({ studentId: student.studentId, name: student.name, score });
    if (entries.length === 60) break;
  }
  return { assessment, entries, named: Boolean(named), choices: list };
}

export async function fetchApprovedMarks(): Promise<ApprovedFile | null> {
  const device = readDevice();
  if (!device?.deviceSecret) return null;
  try {
    const response = await fetch(new URL("/api/agent/approved-marks", appOrigin()), {
      method: "POST",
      headers: { authorization: `Bearer ${device.deviceSecret}`, "content-type": "application/json" },
      body: "{}",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as ApprovedFile;
    if (!body || !Array.isArray(body.students)) return null;
    return body;
  } catch {
    return null;
  }
}

export async function fillVisibleMarks(page: Page, entries: MarkEntry[]) {
  const filled = await page.evaluate(
    new Function("wanted", `
      var entries = Array.isArray(wanted) ? wanted : [];
      var rows = Array.from(document.querySelectorAll("tr"));
      var count = 0;
      for (var index = 0; index < rows.length; index += 1) {
        var row = rows[index];
        var text = (row.innerText || "").toLowerCase();
        var input = row.querySelector("input");
        if (!input) continue;
        var type = (input.getAttribute("type") || "text").toLowerCase();
        if (type === "password" || type === "hidden") continue;
        for (var entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
          var entry = entries[entryIndex];
          var id = String(entry.studentId || "").toLowerCase();
          var name = String(entry.name || "").toLowerCase();
          var matched = (id && text.indexOf(id) !== -1) || (name.length > 3 && text.indexOf(name) !== -1);
          if (!matched) continue;
          input.focus();
          input.value = String(entry.score);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          count += 1;
          break;
        }
      }
      return count;
    `) as (wanted: MarkEntry[]) => number,
    entries,
  );
  return filled;
}

export async function saveMarks(page: Page) {
  const button = page.getByRole("button", { name: /save|submit|update/i }).first();
  if (!(await button.isVisible().catch(() => false))) return false;
  const name = (await button.innerText()).replace(/\s+/g, " ").trim();
  if (/delete|log\s*out|sign\s*out|remove|cancel/i.test(name)) return false;
  await button.click({ timeout: 8000 });
  return true;
}
