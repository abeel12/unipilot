const SCALE = 100;

export interface WeightageCheck {
  total: number;
  remaining: number;
  excess: number;
  missing: number;
  valid: boolean;
  mode: "full" | "partial" | "none";
}

/** Sum weightages in hundredths so 33.33 + 66.67 is exact and 110 is rejected. */
export function checkWeightage(values: Array<number | null | undefined>): WeightageCheck {
  let cents = 0;
  let missing = 0;
  for (const value of values) {
    if (value == null) {
      missing += 1;
      continue;
    }
    cents += Math.round(value * SCALE);
  }
  const total = cents / SCALE;
  const delta = 100 * SCALE - cents;
  const allMissing = values.length === 0 || missing === values.length;
  const valid = values.length > 0 && missing === 0 && cents === 100 * SCALE;
  const mode = allMissing ? "none" : valid ? "full" : "partial";
  return {
    total,
    remaining: Math.max(0, delta) / SCALE,
    excess: Math.max(0, -delta) / SCALE,
    missing,
    valid,
    mode,
  };
}
