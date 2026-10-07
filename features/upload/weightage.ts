import type { DetectedAssessment, WeightageMode } from "@/types";

export interface WeightageSummary {
  total: number;
  remaining: number;
  missing: number;
  valid: boolean;
  mode: WeightageMode | "invalid";
}

export function summarizeWeightage(items: Pick<DetectedAssessment, "weightage">[]): WeightageSummary {
  const missing = items.filter((item) => item.weightage == null).length;
  const total = items.reduce((sum, item) => sum + (item.weightage ?? 0), 0);
  const rounded = Math.round(total * 100) / 100;
  const remaining = Math.round((100 - rounded) * 100) / 100;
  const allPresent = missing === 0;
  const valid = allPresent && rounded === 100;
  let mode: WeightageSummary["mode"] = "partial";
  if (items.length === 0) mode = "none";
  else if (missing === items.length) mode = "none";
  else if (missing === 0 && valid) mode = "full";
  else if (missing === 0 && !valid) mode = "invalid";
  else mode = "partial";
  return { total: rounded, remaining, missing, valid, mode };
}

export function comparisonFor(items: DetectedAssessment[]) {
  return items.map((item) => {
    const exists = item.universityStatus === "Exists";
    return {
      ...item,
      document: "Detected" as const,
      university: exists ? ("Exists" as const) : ("Missing" as const),
      action: exists ? ("No Action" as const) : ("Create" as const),
      reviewStatus: exists ? ("Exists" as const) : ("Will Create" as const),
    };
  });
}
