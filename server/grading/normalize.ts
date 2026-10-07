import type { AssessmentType } from "@/types";

const ONES: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};

export interface NormalizedAssessment {
  sourceLabel: string;
  name: string;
  type: AssessmentType;
  confidence: number;
}

function compact(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ");
}

function numberWord(value: string) {
  return ONES[value] ?? value;
}

export function normalizeAssessment(source: string): NormalizedAssessment {
  const sourceLabel = source.trim();
  const text = compact(sourceLabel).replace(/([a-z])(\d)/g, "$1 $2");

  const assignment = text.match(/^(?:a|assg|assignment|hw|homework)\s+(\d+)$/);
  if (assignment) {
    return { sourceLabel, name: `Assignment ${assignment[1]}`, type: "Assignment", confidence: 0.95 };
  }
  const assignmentWord = text.match(/^(?:assignment|hw|homework)\s+(one|two|three|four|five|six|seven|eight|nine|ten)$/);
  if (assignmentWord) {
    return { sourceLabel, name: `Assignment ${numberWord(assignmentWord[1])}`, type: "Assignment", confidence: 0.9 };
  }

  const quiz = text.match(/^(?:q|quiz)\s+(\d+)$/);
  if (quiz) return { sourceLabel, name: `Quiz ${quiz[1]}`, type: "Quiz", confidence: 0.95 };

  if (/^(mid|midterm|mid term)( exam)?$/.test(text)) {
    return { sourceLabel, name: "Midterm", type: "Midterm", confidence: 0.96 };
  }
  if (/^(final|final exam|terminal|end term)( exam)?$/.test(text)) {
    return { sourceLabel, name: "Final", type: "Final", confidence: 0.96 };
  }
  if (/^projects?$/.test(text)) return { sourceLabel, name: "Project", type: "Project", confidence: 0.9 };
  if (/^labs?( work| report)?$/.test(text)) return { sourceLabel, name: "Lab", type: "Lab", confidence: 0.9 };
  if (/^presentations?$/.test(text)) return { sourceLabel, name: "Presentation", type: "Presentation", confidence: 0.9 };
  if (/^(viva|participation)$/.test(text)) {
    return { sourceLabel, name: sourceLabel, type: "Other", confidence: 0.7 };
  }

  return { sourceLabel, name: sourceLabel || "Assessment", type: "Other", confidence: 0.4 };
}

export interface HeaderParts {
  label: string;
  weightage: number | null;
  maxMarks: number | null;
}

export function splitHeader(header: string): HeaderParts {
  let weightage: number | null = null;
  let maxMarks: number | null = null;
  const weight = header.match(/\(\s*(\d+(?:\.\d+)?)\s*%?\s*\)/);
  if (weight) weightage = Number(weight[1]);
  const max = header.match(/\/\s*(\d+(?:\.\d+)?)\s*$/);
  if (max) maxMarks = Number(max[1]);
  const label = header
    .replace(/\([^)]*\)/g, "")
    .replace(/\/\s*\d+(?:\.\d+)?\s*$/, "")
    .trim();
  return { label, weightage, maxMarks };
}
