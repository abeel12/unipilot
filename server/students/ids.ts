export function normalizeStudentId(source: string) {
  const sourceStudentId = source.trim();
  const normalizedStudentId = sourceStudentId.replace(/\s+/g, "").toUpperCase();
  return { sourceStudentId, normalizedStudentId };
}

export function sameStudentId(left: string, right: string) {
  return normalizeStudentId(left).normalizedStudentId === normalizeStudentId(right).normalizedStudentId;
}
