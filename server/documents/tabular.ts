import { findCourseCodes } from "@/server/courses/match";
import { normalizeAssessment, splitHeader } from "@/server/grading/normalize";
import { checkWeightage } from "@/server/grading/weightage";
import { normalizeStudentId } from "@/server/students/ids";
import type { AssessmentType, DetectedAssessment, DetectedIssue } from "@/types";

export interface ParsedStudent {
  studentId: string;
  name: string;
  marks: Record<string, number | null>;
}

export interface ParsedDocument {
  parseError: boolean;
  subjectCode: string | null;
  subjectName: string | null;
  courseCodes: string[];
  assessments: DetectedAssessment[];
  students: ParsedStudent[];
  issues: DetectedIssue[];
  weightageMode: "full" | "partial" | "none";
  warnings: string[];
}

const META = /^(max(?:imum)?(?:\s*marks)?|weight(?:age)?|total|average|avg)$/i;

function parseNumber(value: string) {
  const trimmed = value.trim().replace(/%$/, "");
  if (!trimmed || !/^-?\d+(?:\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function parseCsv(text: string) {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell.trim());
      if (row.some((item) => item.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }
  row.push(cell.trim());
  if (row.some((item) => item.length > 0)) rows.push(row);
  return rows;
}

function headerScore(row: string[]) {
  const joined = row.join(" ").toLowerCase();
  let score = 0;
  if (/roll|student|registration|reg\.?\s*no|\bid\b/.test(joined)) score += 3;
  if (/name/.test(joined)) score += 1;
  if (row.filter((cell) => cell.trim()).length >= 3) score += 1;
  return score;
}

export function interpretGrid(grid: string[][], fileName: string): ParsedDocument {
  const warnings: string[] = [];
  const issues: DetectedIssue[] = [];
  if (grid.length === 0) {
    return emptyError("The file has no readable rows.");
  }

  let headerIndex = 0;
  let best = -1;
  grid.slice(0, 12).forEach((row, index) => {
    const score = headerScore(row);
    if (score > best) {
      best = score;
      headerIndex = index;
    }
  });
  if (best < 3) {
    return emptyError("The file has no student-id header such as Roll No.");
  }

  const header = grid[headerIndex];
  const idIndex = header.findIndex((cell) => /roll|student|registration|reg\.?\s*no|\bid\b/i.test(cell));
  const nameIndex = header.findIndex((cell, index) => index !== idIndex && /\bname\b/i.test(cell));
  const assessmentIndexes = header
    .map((cell, index) => ({ cell: cell.trim(), index }))
    .filter((item) => item.cell && item.index !== idIndex && item.index !== nameIndex);

  if (idIndex < 0 || assessmentIndexes.length === 0) {
    return emptyError("The file needs a student-id column and at least one assessment column.");
  }

  const preamble = grid.slice(0, headerIndex).flat().join(" ");
  const courseCodes = findCourseCodes(`${fileName} ${preamble}`);
  const subjectCode = courseCodes[0] ?? null;
  const subjectName = preamble.match(/subject\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 &/-]{3,})/i)?.[1]?.trim() ?? null;

  const columns = assessmentIndexes.map((item) => {
    const parts = splitHeader(item.cell);
    const normalized = normalizeAssessment(parts.label);
    return { index: item.index, source: item.cell, ...parts, ...normalized };
  });
  const usedNames = new Map<string, number>();
  for (const column of columns) {
    const count = usedNames.get(column.name) ?? 0;
    usedNames.set(column.name, count + 1);
    if (count > 0) column.name = `${column.sourceLabel} (${count + 1})`;
  }

  const maxRow = grid.find((row) => META.test(row[idIndex] ?? "") && /max/i.test(row[idIndex] ?? ""));
  const weightRow = grid.find((row) => META.test(row[idIndex] ?? "") && /weight/i.test(row[idIndex] ?? ""));

  const students: ParsedStudent[] = [];
  for (const row of grid.slice(headerIndex + 1)) {
    const rawId = row[idIndex]?.trim() ?? "";
    if (!rawId || META.test(rawId) || !/\d/.test(rawId)) continue;
    const id = normalizeStudentId(rawId);
    const marks: Record<string, number | null> = {};
    for (const column of columns) {
      marks[column.name] = parseNumber(row[column.index] ?? "");
    }
    students.push({
      studentId: id.normalizedStudentId,
      name: nameIndex >= 0 ? (row[nameIndex]?.trim() ?? "") : "",
      marks,
    });
  }

  if (students.length === 0) {
    return emptyError("No student rows were found under the header.");
  }

  const assessments: DetectedAssessment[] = columns.map((column, order) => {
    const statedMax = column.maxMarks ?? (maxRow ? parseNumber(maxRow[column.index] ?? "") : null);
    const observed = students
      .map((student) => student.marks[column.name])
      .filter((score): score is number => score != null);
    const observedMax = observed.length ? Math.max(...observed) : null;
    const maxMarks = statedMax ?? observedMax ?? 0;
    const inferred = statedMax == null && observedMax != null;
    if (inferred) warnings.push(`Maximum marks for ${column.name} were taken from the highest score. Confirm them.`);
    const rowWeight = weightRow ? parseNumber(weightRow[column.index] ?? "") : null;
    const weightage = column.weightage ?? rowWeight;
    return {
      id: `detected-${order + 1}`,
      name: column.name,
      type: column.type as AssessmentType,
      maxMarks: maxMarks > 0 ? maxMarks : 1,
      weightage,
      source: weightage == null ? "Missing" : "Document",
      confidence: Math.round(column.confidence * 100),
      universityStatus: "Missing",
    };
  });

  for (const student of students) {
    for (const assessment of assessments) {
      const score = student.marks[assessment.name];
      if (score == null) continue;
      if (score > assessment.maxMarks) {
        issues.push({
          id: `mark-${student.studentId}-${assessment.name}`,
          kind: "invalid-marks",
          studentCode: student.studentId,
          studentName: student.name || student.studentId,
          enteredMarks: score,
          maxMarks: assessment.maxMarks,
          message: "This mark exceeds the maximum allowed value.",
          resolved: false,
        });
      }
    }
  }

  const weight = checkWeightage(assessments.map((item) => item.weightage));
  return {
    parseError: false,
    subjectCode,
    subjectName,
    courseCodes,
    assessments,
    students,
    issues,
    weightageMode: weight.mode,
    warnings,
  };
}

function emptyError(message: string): ParsedDocument {
  return {
    parseError: true,
    subjectCode: null,
    subjectName: null,
    courseCodes: [],
    assessments: [],
    students: [],
    issues: [{ id: "issue-parse", kind: "file-parse", message, resolved: false }],
    weightageMode: "none",
    warnings: [],
  };
}

export async function gridFromXlsx(bytes: Uint8Array) {
  const excel = await import("exceljs");
  const workbook = new excel.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    const width = Math.max(sheet.columnCount, row.cellCount);
    for (let index = 1; index <= width; index += 1) {
      cells.push(cellText(row.getCell(index).value));
    }
    if (cells.some((cell) => cell.length > 0)) rows.push(cells);
  });
  return rows;
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const record = value as { result?: unknown; richText?: { text: string }[]; text?: string };
    if ("result" in record) return cellText(record.result);
    if (record.richText) return record.richText.map((part) => part.text).join("").trim();
    if (record.text) return record.text.trim();
  }
  return String(value).trim();
}
