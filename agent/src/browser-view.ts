import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Page } from "playwright";
import { PortalError } from "./adapter";
import { activePage } from "./browser-manager";
import { chooseSection, learnUniversity, mapSummary, readLmsMap } from "./lms-map";
import { fetchApprovedMarks, fillVisibleMarks, marksForPrompt, saveMarks, wantsMarkUpload } from "./marks-entry";
import { completePlan, matchControl, modelAnswer, modelClicks, openaiApiKey, sanitizeLines } from "./prompt-agent";

const KEYS = new Set(["Enter", "Tab", "Backspace", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const history: string[] = [];

function safePageUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "";
  }
}

function rememberPage(url: string) {
  const safe = safePageUrl(url);
  if (!safe || history[history.length - 1] === safe) return;
  history.push(safe);
  if (history.length > 12) history.shift();
}

let chain: Promise<unknown> = Promise.resolve();

function locked<T>(task: () => Promise<T>) {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function withPage<T>(task: (page: Page) => Promise<T>) {
  return locked(async () => {
    const page = await activePage();
    if (!page) throw new PortalError("LMS_NOT_REACHABLE", "Open the university panel first.");
    return task(page);
  });
}

export function createViewToken() {
  return randomBytes(24).toString("base64url");
}

export function viewTokensMatch(expected: string | null, provided: string | undefined) {
  if (!expected || !provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function pageLabel(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "University panel";
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return "University panel";
  }
}

function isPrivateHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "::1") return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || a === 0;
}

export function teacherAddress(input: string, mockOrigin: string) {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 300) throw new PortalError("UNIVERSITY_NOT_SUPPORTED", "Enter the university web address.");
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let target: URL;
  try {
    target = new URL(withProtocol);
  } catch {
    throw new PortalError("UNIVERSITY_NOT_SUPPORTED", "That university address is not valid.");
  }
  if (target.username || target.password) throw new PortalError("UNIVERSITY_NOT_SUPPORTED", "The university address cannot contain a password.");
  if (target.origin === new URL(mockOrigin).origin) return target.toString();
  if (target.protocol !== "https:") throw new PortalError("UNIVERSITY_NOT_SUPPORTED", "Open the university with an https address.");
  if (isPrivateHost(target.hostname)) throw new PortalError("UNIVERSITY_NOT_SUPPORTED", "That address is not a public university page.");
  return target.toString();
}

export function parsePrompt(prompt: string) {
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (!clean || clean.length > 4000 || /javascript:/i.test(clean)) {
    throw new PortalError("UNKNOWN_ACTION", "Ask in plain words, such as: click on Course Management and tell me how many courses are there.");
  }
  const asksClick = /^\s*(please\s+)?(click|open|press|tap|select|go to)\b/i.test(clean);
  const count = /how many|how much|count|number of/i.test(clean);
  const target = asksClick
    ? clean
        .replace(/^\s*(please\s+)?(click|open|press|tap|select|go to)\s+(on\s+)*/i, "")
        .replace(/\b(and|then)\b[\s\S]*$/i, "")
        .replace(/\b(how many|how much|count|number of|find how)\b[\s\S]*$/i, "")
        .replace(/^(on\s+)+/i, "")
        .replace(/\bcurses\b/gi, "courses")
        .trim()
    : "";
  return { target, count, asksClick, keywords: promptKeywords(clean) };
}

const PROMPT_WORDS = new Set(["what", "is", "my", "the", "a", "an", "of", "me", "show", "find", "tell", "give", "please", "how", "many", "much", "are", "there", "on", "in", "to", "for", "and", "click", "open", "this", "that", "from", "do", "have", "get", "any", "anything", "about", "with", "your", "you", "can", "see"]);

export function promptKeywords(prompt: string) {
  return prompt
    .toLowerCase()
    .replace(/\bcurses\b/g, "courses")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !PROMPT_WORDS.has(word));
}

export function linesForPrompt(lines: string[], keywords: string[]) {
  const needles = keywords.flatMap((word) => {
    if (word === "cgpa" || word === "gpa") return ["cgpa", "gpa"];
    if (word === "courses" || word === "course") return ["course"];
    return [word];
  });
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/password|cookie|token|bearer|otp|captcha/i.test(lower)) continue;
    if (!needles.some((word) => lower.includes(word))) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    hits.push(line);
    if (hits.length === 6) break;
  }
  return hits;
}

export async function captureFrame() {
  return locked(async () => {
    const page = await activePage();
    if (!page) throw new PortalError("LMS_NOT_REACHABLE", "Open the university panel first.");
    const metrics = await page.evaluate(
      new Function(`
        return {
          scrollY: Math.round(window.scrollY || document.documentElement.scrollTop || 0),
          scrollHeight: Math.round((document.documentElement && document.documentElement.scrollHeight) || 0),
          clientHeight: Math.round(window.innerHeight || 0)
        };
      `) as () => { scrollY: number; scrollHeight: number; clientHeight: number },
    );
    const jpeg = await page.screenshot({ type: "jpeg", quality: 55 });
    return { jpeg, ...metrics };
  });
}

export async function currentPageLabel() {
  const page = await activePage();
  if (!page) return null;
  return pageLabel(page.url());
}

export async function applyPortalInput(body: Record<string, unknown>, mockOrigin: string) {
  if (body.kind === "prompt") {
    try {
      return await runPrompt(String(body.prompt ?? ""));
    } catch (error) {
      if (error instanceof PortalError) throw error;
      throw new PortalError("AUTOMATION_FAILED", "The university page changed before the answer was ready. Ask again.");
    }
  }
  return locked(async () => {
    const page = await activePage();
    if (!page) throw new PortalError("LMS_NOT_REACHABLE", "Open the university panel first.");
    const kind = body.kind;
    if (kind === "open") {
      const address = teacherAddress(String(body.address ?? ""), mockOrigin);
      await page.goto(address, { waitUntil: "domcontentloaded", timeout: 30000 });
      return { message: "University page opened in the panel." };
    }
    if (kind === "scroll") {
      const top = Number(body.y);
      if (!Number.isFinite(top) || top < 0 || top > 100000) throw new PortalError("UNKNOWN_ACTION", "Scroll inside the university panel.");
      await page.evaluate(
        new Function("wanted", "window.scrollTo(0, Number(wanted) || 0);") as (wanted: number) => void,
        top,
      );
      return { message: "Scrolled the university page." };
    }
    if (kind === "click") {
      const x = Number(body.x);
      const y = Number(body.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > 1400 || y > 1000) {
        throw new PortalError("UNKNOWN_ACTION", "Click inside the university panel.");
      }
      await page.mouse.click(x, y);
      return { message: "Clicked in the university panel." };
    }
    if (kind === "type") {
      const text = String(body.text ?? "");
      if (!text || text.length > 200) throw new PortalError("UNKNOWN_ACTION", "Type a shorter value in the panel.");
      await page.keyboard.type(text);
      return { message: "Typed in the university panel." };
    }
    if (kind === "press") {
      const key = String(body.key ?? "");
      if (!KEYS.has(key)) throw new PortalError("UNKNOWN_ACTION", "That key is not available.");
      await page.keyboard.press(key);
      return { message: "Key sent to the university panel." };
    }
    throw new PortalError("UNKNOWN_ACTION", "The panel can open a page, click, type, or follow a prompt.");
  });
}

async function settle(page: Page) {
  await Promise.race([
    page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => undefined),
    page.waitForTimeout(2500),
  ]);
  await page.waitForTimeout(500);
}

async function goToPreviousPage() {
  return withPage(async (page) => {
    const before = page.url();
    rememberPage(before);
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => undefined);
    if (safePageUrl(page.url()) !== safePageUrl(before)) {
      await settle(page);
      return pageLabel(page.url());
    }
    const current = safePageUrl(before);
    while (history.length > 0 && history[history.length - 1] === current) history.pop();
    const target = history[history.length - 1];
    if (!target) throw new PortalError("LMS_NOT_REACHABLE", "There is no previous page to open.");
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 8000 });
    await settle(page);
    return pageLabel(page.url());
  });
}

async function clickStep(target: string, controls: string[]) {
  try {
    return await withPage(async (page) => {
      rememberPage(page.url());
      const name = await clickBestControl(page, target);
      await settle(page);
      return name;
    });
  } catch (error) {
    if (!openaiApiKey()) throw error;
    const next = (await modelClicks(`Click only this section: ${target}`, controls))[0];
    if (!next || next.toLowerCase() === target.toLowerCase()) throw error;
    return withPage(async (page) => {
      const name = await clickBestControl(page, next);
      await settle(page);
      return name;
    });
  }
}

export async function learnOpenUniversity() {
  return withPage((page) => learnUniversity(page));
}

async function uploadApprovedMarks(prompt: string, lead: string) {
  const approved = await fetchApprovedMarks();
  if (!approved || approved.students.length === 0) {
    return { message: `${lead}Approve the marks file in UniPilot first. Then ask me to upload those marks.` };
  }
  const selected = marksForPrompt(prompt, approved.students);
  if (selected.entries.length === 0) {
    return { message: `${lead}The approved file has no numeric marks to enter.` };
  }
  const section = chooseSection(readLmsMap()?.sections ?? [], prompt, approved.courseCode);
  if (section) {
    try {
      await clickStep(section.name, [section.name]);
    } catch {
      // The teacher may already be on the marks page.
    }
  }
  const filled = await withPage((page) => fillVisibleMarks(page, selected.entries));
  if (filled === 0) {
    return { message: `${lead}I learned this university's sections, but the current page has no mark boxes for ${approved.courseCode || "the approved file"}. Open the marks page, then ask again.` };
  }
  let saved = false;
  if (/\b(upload|save|submit)\b/i.test(prompt)) {
    saved = await withPage((page) => saveMarks(page)).catch(() => false);
  }
  const which = selected.named || selected.choices.length === 1 ? selected.assessment : `${selected.assessment} (name another assessment in the prompt to enter a different column)`;
  const ending = saved ? "Saved them on the university page." : "The marks are filled in. Say save the marks when you want them submitted.";
  return { message: `${lead}Entered ${filled} ${which} marks from ${approved.fileName || "the approved file"} for ${approved.courseCode || approved.courseName || "the course"}. ${ending}` };
}

async function runPrompt(prompt: string) {
  const parsed = parsePrompt(prompt);
  const firstControls = await withPage((page) => visibleControls(page));
  const known = (readLmsMap()?.sections ?? []).map((section) => section.name);
  const plan = await completePlan(prompt, firstControls, known);
  let steps = plan.steps;
  if (steps.length === 0 && parsed.asksClick && parsed.target && !/^(this|that|it|section|here)$/i.test(parsed.target)) steps = [parsed.target];
  const clicked: string[] = [];
  const moves: string[] = [];
  const missed: string[] = [];
  for (const step of steps.slice(0, 4)) {
    if (step === "__back__") {
      try {
        moves.push(`Went back to ${await goToPreviousPage()}`);
      } catch (error) {
        if (steps.length === 1 && error instanceof PortalError) throw error;
        missed.push("the previous page");
      }
      continue;
    }
    const controls = await withPage((page) => visibleControls(page));
    const target = matchControl(step, controls) ?? step;
    try {
      const name = await clickStep(target, controls);
      clicked.push(name);
      moves.push(`Clicked ${name}`);
    } catch (error) {
      if (steps.length === 1 && clicked.length === 0 && error instanceof PortalError) throw error;
      missed.push(step);
    }
  }
  const actionLead = moves.length === 0 ? "" : moves.every((move) => move.startsWith("Clicked ")) ? `Clicked ${clicked.join(", then ")}. ` : `${moves.join(". ")}. `;
  const lead = `${actionLead}${missed.length > 0 ? `I could not find ${missed.join(", then ")} on the page. ` : ""}`;
  const controls = clicked.length === 0 ? firstControls : [];
  if (plan.countCourses) {
    const courses = await withPage((page) => readVisibleCourses(page));
    if (courses.length === 0) return { message: `${lead}I do not see a course list on this page yet. Open the section that lists courses, then ask again.` };
    const shown = courses.slice(0, 8).join(", ");
    const more = courses.length > 8 ? `, and ${courses.length - 8} more` : "";
    return { message: `${lead}There are ${courses.length} course${courses.length === 1 ? "" : "s"}: ${shown}${more}.` };
  }
  if (clicked.length === 0 && /\b(click|open|press|tap|select|go to)\b/i.test(prompt) && parsed.keywords.length === 0) {
    const shown = controls.slice(0, 8).join(", ");
    return { message: shown ? `Tell me the section name as it appears on the page. I can see: ${shown}.` : "I do not see a section to click on this page." };
  }
  if (plan.uploadMarks || wantsMarkUpload(prompt)) return uploadApprovedMarks(prompt, lead);
  const lines = sanitizeLines(await withPage((page) => readVisibleLines(page)));
  if (openaiApiKey()) {
    const answer = await modelAnswer(prompt, lines, mapSummary(readLmsMap()), plan.question);
    if (answer) return { message: `${lead}${answer}` };
  }
  const hits = linesForPrompt(lines, parsed.keywords);
  if (hits.length === 0) {
    return { message: `${lead}That information is not on the current university page. Open the section that shows it, then ask again.` };
  }
  return { message: `${lead}${hits.join(" · ")}` };
}

async function readVisibleLines(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await visibleLines(page);
    } catch (error) {
      last = error;
      await page.waitForTimeout(400);
    }
  }
  throw last;
}

async function readVisibleCourses(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await listVisibleCourses(page);
    } catch (error) {
      last = error;
      await page.waitForTimeout(400);
    }
  }
  throw last;
}

function inPage<Result>(source: string) {
  return new Function(source) as () => Result;
}

function inPageWith<Arg, Result>(source: string) {
  return new Function("wanted", source) as (wanted: Arg) => Result;
}

async function visibleControls(page: Page) {
  return page.evaluate(
    inPage<string[]>(`
      var nodes = Array.from(document.querySelectorAll("a, button, [role='button'], [role='link'], [role='menuitem']"));
      var names = [];
      var seen = {};
      for (var index = 0; index < nodes.length; index += 1) {
        var node = nodes[index];
        if (!(node instanceof HTMLElement)) continue;
        var rect = node.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) continue;
        var style = getComputedStyle(node);
        if (style.visibility === "hidden" || style.display === "none") continue;
        var name = (node.innerText || "").replace(/\\s+/g, " ").trim();
        if (!name || name.length > 80 || /password|cookie|token|otp|captcha/i.test(name)) continue;
        var key = name.toLowerCase();
        if (seen[key]) continue;
        seen[key] = true;
        names.push(name);
        if (names.length === 40) break;
      }
      return names;
    `),
  );
}

async function visibleLines(page: Page) {
  return page.evaluate(
    inPage<string[]>(`
      var text = document.body && document.body.innerText ? document.body.innerText : "";
      return text.split(/\\n+/).map(function (line) {
        return line.replace(/\\s+/g, " ").trim();
      }).filter(function (line) {
        return line.length > 1 && line.length < 180;
      }).slice(0, 200);
    `),
  );
}

function targetPattern(target: string) {
  return new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

async function clickNamedControl(page: Page, target: string) {
  const pattern = targetPattern(target);
  const roles = [
    page.getByRole("link", { name: pattern }),
    page.getByRole("button", { name: pattern }),
    page.getByRole("menuitem", { name: pattern }),
  ];
  for (const role of roles) {
    const item = role.first();
    if (!(await item.isVisible().catch(() => false))) continue;
    const name = (await item.innerText()).replace(/\s+/g, " ").trim().slice(0, 80);
    await item.click({ timeout: 8000 });
    return name || target;
  }
  return null;
}

async function clickBestControl(page: Page, target: string) {
  const named = await clickNamedControl(page, target).catch(() => null);
  if (named) return named;
  const found = await page.evaluate(
    inPageWith<string, { name: string; x: number; y: number } | null>(`
      var wantedLower = String(wanted).toLowerCase();
      var words = wantedLower.split(/\\s+/).filter(function (word) { return word.length > 2; });
      var nodes = Array.from(document.querySelectorAll("a, button, [role='button'], [role='link'], [role='menuitem'], li, span, div, td, p, label"));
      var best = null;
      for (var index = 0; index < nodes.length; index += 1) {
        var node = nodes[index];
        if (!(node instanceof HTMLElement)) continue;
        var style = getComputedStyle(node);
        if (style.visibility === "hidden" || style.display === "none") continue;
        var name = (node.innerText || node.textContent || "").replace(/\\s+/g, " ").trim();
        if (!name || name.length > 80) continue;
        var lower = name.toLowerCase();
        var score = 0;
        if (lower === wantedLower) score = 100;
        else if (lower.indexOf(wantedLower) !== -1) score = 80;
        else if (words.length > 0 && words.every(function (word) { return lower.indexOf(word) !== -1; })) score = 70;
        else continue;
        var clickable = node.closest("a, button, [role='button'], [role='link'], [role='menuitem']");
        var targetNode = clickable instanceof HTMLElement ? clickable : node;
        targetNode.scrollIntoView({ block: "center", inline: "nearest" });
        var rect = targetNode.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8 || rect.width > 1400 || rect.height > 160) continue;
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        if (clickable) score += 20;
        if (node.tagName === "A" || node.tagName === "BUTTON") score += 10;
        score += Math.max(0, 40 - name.length);
        if (!best || score > best.score) {
          best = { name: name.slice(0, 80), x: rect.left + rect.width / 2, y: rect.top + Math.min(rect.height / 2, 24), score: score };
        }
      }
      return best;
    `),
    target,
  );
  if (!found) throw new PortalError("PORTAL_STRUCTURE_CHANGED", `I could not find “${target}” on the university page.`);
  await page.mouse.click(found.x, found.y);
  return found.name;
}

async function listVisibleCourses(page: Page) {
  return page.evaluate(
    inPage<string[]>(`
      var ignore = /dashboard|course management|exam management|survey management|resource management|logout|sign out|search|hello,|generate|password|cookie|token/i;
      function textOf(element) {
        return (element.textContent || "").replace(/\\s+/g, " ").trim();
      }
      var tables = Array.from(document.querySelectorAll("table"));
      tables.sort(function (left, right) {
        return right.querySelectorAll("tbody tr").length - left.querySelectorAll("tbody tr").length;
      });
      var main = tables[0];
      var fromTable = main
        ? Array.from(main.querySelectorAll("tbody tr")).map(textOf).filter(function (text) {
            return text.length > 2 && text.length < 140 && !ignore.test(text);
          })
        : [];
      if (fromTable.length > 0) return Array.from(new Set(fromTable)).slice(0, 30);
      var items = Array.from(document.querySelectorAll("li, [class*='course'], tr")).map(textOf).filter(function (text) {
        return text.length > 2 && text.length < 120 && /course|section|[a-z]{2,}-\\d{2,}/i.test(text) && !ignore.test(text);
      });
      return Array.from(new Set(items)).slice(0, 30);
    `),
  );
}

export async function panelAccountName(page: Page) {
  const hello = page.getByText(/^hello,/i).first();
  if ((await hello.count()) > 0) {
    const text = (await hello.innerText()).replace(/^hello,\s*/i, "").replace(/!/g, "").trim();
    if (text) return text.slice(0, 80);
  }
  return null;
}

export function universityLabel(hostname: string) {
  const name = hostname.split(".")[0]?.replace(/[^a-z0-9]/gi, "") ?? "";
  return (name || hostname).slice(0, 80).toUpperCase();
}

export async function panelSignedIn(page: Page, mockOrigin: string, mockCheck: () => Promise<boolean>) {
  const current = page.url();
  if (!current || current === "about:blank") return false;
  if (current.startsWith(mockOrigin)) return mockCheck();
  const password = await page.locator("input[type='password']:visible").count();
  if (password > 0) return false;
  const logout =
    (await page.getByRole("link", { name: /log\s*out|sign\s*out|logout/i }).count()) +
    (await page.getByRole("button", { name: /log\s*out|sign\s*out|logout/i }).count());
  const dashboard = await page.getByText(/^dashboard$/i).count();
  const courses = await page.getByText(/course management|my courses|exam management/i).count();
  const hello = await page.getByText(/^hello,/i).count();
  return logout > 0 || dashboard > 0 || courses > 0 || hello > 0;
}
