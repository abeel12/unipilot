/** Weighted contribution = (score / max) × weightage. Rounded to hundredths. */
export function weightedContribution(score: number, maxMarks: number, weightage: number): number | null {
  if (!Number.isFinite(score) || !Number.isFinite(maxMarks) || !Number.isFinite(weightage)) return null;
  if (maxMarks <= 0) return null;
  if (score < 0) return null;
  const hundredths = Math.round((score / maxMarks) * weightage * 100);
  return hundredths / 100;
}
