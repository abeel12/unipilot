export interface CourseSignal {
  id: string;
  code: string;
  name: string;
  semester: string;
  section: string;
}

export interface CourseCandidate {
  courseId: string;
  code: string;
  name: string;
  semester: string;
  section: string;
  score: number;
  reasons: string[];
}

export function canonicalCode(value: string) {
  const compact = value.toUpperCase().replace(/[\s_]+/g, "");
  const match = compact.match(/^([A-Z]{2,5})-?(\d{3}[A-Z]?)$/);
  if (!match) return compact;
  return `${match[1]}-${match[2]}`;
}

export function findCourseCodes(text: string) {
  const found = new Set<string>();
  const pattern = /\b([A-Za-z]{2,5})\s*-?\s*(\d{3})\b/g;
  for (const match of text.matchAll(pattern)) {
    found.add(canonicalCode(`${match[1]}-${match[2]}`));
  }
  return [...found];
}

export function matchCourses(input: { code: string | null; name: string | null }, courses: CourseSignal[]) {
  const wantedCode = input.code ? canonicalCode(input.code) : null;
  const wantedName = input.name?.trim().toLowerCase() ?? "";
  const candidates: CourseCandidate[] = courses
    .map((course) => {
      let score = 0;
      const reasons: string[] = [];
      if (wantedCode && canonicalCode(course.code) === wantedCode) {
        score += 0.8;
        reasons.push("exact_code");
      }
      if (wantedName && course.name.trim().toLowerCase() === wantedName) {
        score += 0.18;
        reasons.push("exact_name");
      } else if (wantedName.length > 4 && course.name.toLowerCase().includes(wantedName)) {
        score += 0.08;
        reasons.push("name_contains");
      }
      return {
        courseId: course.id,
        code: course.code,
        name: course.name,
        semester: course.semester,
        section: course.section,
        score: Math.min(0.99, Math.round(score * 100) / 100),
        reasons,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = candidates[0];
  const second = candidates[1];
  const gap = top && second ? top.score - second.score : 1;
  const exact = top?.reasons.includes("exact_code") ?? false;
  const auto = Boolean(top && exact && top.score >= 0.8 && gap >= 0.15);
  const notFound = !top || (!exact && top.score < 0.55);
  return {
    candidates,
    selected: auto ? top : null,
    requiresManualSubject: !auto,
    subjectNotFound: notFound,
  };
}
