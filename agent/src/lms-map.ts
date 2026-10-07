import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";
import { dataRoot } from "./device-store";

export interface LmsSection {
  name: string;
  path: string;
  headings: string[];
  columns: string[];
  hasMarkFields: boolean;
}

export interface LmsMap {
  host: string;
  learnedAt: string;
  sections: LmsSection[];
}

const UNSAFE = /log\s*out|sign\s*out|password|delete|remove|save|submit|update|upload|reset/i;

export function isSafeSection(name: string) {
  const clean = name.replace(/\s+/g, " ").trim();
  return clean.length >= 3 && clean.length <= 80 && !UNSAFE.test(clean);
}

export function chooseSection(sections: LmsSection[], prompt: string, courseCode: string) {
  const words = `${prompt} ${courseCode}`.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  let best: LmsSection | null = null;
  let bestScore = 0;
  for (const section of sections) {
    const blob = `${section.name} ${section.headings.join(" ")} ${section.columns.join(" ")}`.toLowerCase();
    let score = section.hasMarkFields ? 50 : 0;
    if (courseCode && blob.includes(courseCode.toLowerCase())) score += 40;
    score += words.filter((word) => blob.includes(word)).length * 10;
    if (score > bestScore) {
      best = section;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

function mapFile() {
  return path.join(dataRoot(), "lms-map.json");
}

export function readLmsMap(): LmsMap | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(mapFile(), "utf8")) as LmsMap;
    if (!parsed || !Array.isArray(parsed.sections)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLmsMap(map: LmsMap) {
  const root = dataRoot();
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(mapFile(), JSON.stringify(map), { mode: 0o600 });
}

export function mapSummary(map: LmsMap | null) {
  if (!map || map.sections.length === 0) return "";
  return map.sections
    .map((section) => {
      const marks = section.hasMarkFields ? " Has mark fields." : "";
      const columns = section.columns.length > 0 ? ` Columns: ${section.columns.slice(0, 6).join(", ")}.` : "";
      return `${section.name}.${columns}${marks}`;
    })
    .join("\n")
    .slice(0, 2000);
}

function pageScript<Result>(source: string) {
  return new Function(source) as () => Result;
}

export async function learnUniversity(page: Page) {
  const start = page.url();
  let host = "";
  try {
    host = new URL(start).host;
  } catch {
    return readLmsMap();
  }
  const links = await page.evaluate(
    pageScript<Array<{ name: string; href: string }>>(`
      var nodes = Array.from(document.querySelectorAll("a"));
      var found = [];
      var seen = {};
      for (var index = 0; index < nodes.length; index += 1) {
        var node = nodes[index];
        var name = (node.innerText || "").replace(/\\s+/g, " ").trim();
        var href = node.href || "";
        if (!name || !href || seen[href]) continue;
        seen[href] = true;
        found.push({ name: name.slice(0, 80), href: href });
        if (found.length === 12) break;
      }
      return found;
    `),
  );
  const sections: LmsSection[] = [];
  for (const link of links) {
    if (sections.length === 6 || !isSafeSection(link.name)) continue;
    let target: URL;
    try {
      target = new URL(link.href);
    } catch {
      continue;
    }
    if (target.host !== host || target.username || target.password) continue;
    try {
      await page.goto(target.toString(), { waitUntil: "domcontentloaded", timeout: 8000 });
      const detail = await page.evaluate(
        pageScript<{ headings: string[]; columns: string[]; hasMarkFields: boolean }>(`
          function clean(value) { return (value || "").replace(/\\s+/g, " ").trim(); }
          var headings = Array.from(document.querySelectorAll("h1, h2, h3")).map(function (node) { return clean(node.textContent); }).filter(Boolean).slice(0, 4);
          var columns = Array.from(document.querySelectorAll("th")).map(function (node) { return clean(node.textContent); }).filter(Boolean).slice(0, 8);
          var inputs = Array.from(document.querySelectorAll("input"));
          var hasMarkFields = inputs.some(function (input) {
            var type = (input.getAttribute("type") || "text").toLowerCase();
            return type !== "password" && type !== "hidden" && input.closest("tr");
          });
          return { headings: headings, columns: columns, hasMarkFields: hasMarkFields };
        `),
      );
      sections.push({
        name: link.name,
        path: target.pathname,
        headings: detail.headings,
        columns: detail.columns,
        hasMarkFields: detail.hasMarkFields,
      });
      if (!detail.hasMarkFields && sections.length < 8) {
        const children = await page.evaluate(
          pageScript<Array<{ name: string; href: string }>>(`
            var nodes = Array.from(document.querySelectorAll("a"));
            var found = [];
            for (var index = 0; index < nodes.length; index += 1) {
              var node = nodes[index];
              var name = (node.innerText || "").replace(/\\s+/g, " ").trim();
              if (!name || !node.href) continue;
              found.push({ name: name.slice(0, 80), href: node.href });
              if (found.length === 8) break;
            }
            return found;
          `),
        );
        const child = children.find((item) => isSafeSection(item.name) && item.href !== page.url());
        if (child) {
          const childUrl = new URL(child.href);
          if (childUrl.host === host && !childUrl.username && !childUrl.password) {
            await page.goto(childUrl.toString(), { waitUntil: "domcontentloaded", timeout: 8000 });
            const childDetail = await page.evaluate(
              pageScript<{ headings: string[]; columns: string[]; hasMarkFields: boolean }>(`
                function clean(value) { return (value || "").replace(/\\s+/g, " ").trim(); }
                var headings = Array.from(document.querySelectorAll("h1, h2, h3")).map(function (node) { return clean(node.textContent); }).filter(Boolean).slice(0, 4);
                var columns = Array.from(document.querySelectorAll("th")).map(function (node) { return clean(node.textContent); }).filter(Boolean).slice(0, 8);
                var inputs = Array.from(document.querySelectorAll("input"));
                var hasMarkFields = inputs.some(function (input) {
                  var type = (input.getAttribute("type") || "text").toLowerCase();
                  return type !== "password" && type !== "hidden" && input.closest("tr");
                });
                return { headings: headings, columns: columns, hasMarkFields: hasMarkFields };
              `),
            );
            sections.push({
              name: child.name,
              path: childUrl.pathname,
              headings: childDetail.headings,
              columns: childDetail.columns,
              hasMarkFields: childDetail.hasMarkFields,
            });
          }
        }
      }
    } catch {
      // A section that does not open is left out of the map.
    }
  }
  try {
    await page.goto(start, { waitUntil: "domcontentloaded", timeout: 8000 });
  } catch {
    // The teacher can still use the page that remains open.
  }
  const map: LmsMap = { host, learnedAt: new Date().toISOString(), sections };
  writeLmsMap(map);
  return map;
}
