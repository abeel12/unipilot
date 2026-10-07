import fs from "node:fs";
import path from "node:path";
import { mockUniversity, PortalError, type PortalCourse } from "./adapter";
import { applyPortalInput, captureFrame, createViewToken, currentPageLabel, learnOpenUniversity, pageLabel, panelAccountName, panelSignedIn, universityLabel, viewTokensMatch } from "./browser-view";
import { closeBrowser, launchProfile } from "./browser-manager";
import { appOrigin, dataRoot, profileDirectory, readDevice } from "./device-store";

type Phase = "idle" | "BROWSER_OPENING" | "LMS_OPENED" | "WAITING_FOR_LOGIN" | "AUTHENTICATED" | "READING" | "SESSION_EXPIRED" | "FAILED";

export interface AgentSnapshot {
  phase: Phase;
  message: string;
  accountName: string | null;
  courses: PortalCourse[] | null;
  errorCode: string | null;
  viewToken: string | null;
  pageLabel: string | null;
}

function rememberPortal(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return;
    fs.mkdirSync(dataRoot(), { recursive: true });
    fs.writeFileSync(path.join(dataRoot(), "last-portal.txt"), `${parsed.origin}${parsed.pathname}`);
  } catch {
    // The address is only a convenience for the next open.
  }
}

function lastPortal() {
  try {
    const saved = fs.readFileSync(path.join(dataRoot(), "last-portal.txt"), "utf8").trim();
    const parsed = new URL(saved);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function createConnectionManager(origin: string) {
  const university = mockUniversity(origin);
  let generation = 0;
  let busy = false;
  const state: AgentSnapshot = {
    phase: "idle",
    message: "UniPilot Agent is ready.",
    accountName: null,
    courses: null,
    errorCode: null,
    viewToken: null,
    pageLabel: null,
  };

  function snapshot(): AgentSnapshot {
    return { ...state, courses: state.courses ? state.courses.map((course) => ({ ...course })) : null };
  }

  function clearView() {
    state.viewToken = null;
    state.pageLabel = null;
  }

  async function report(event: string, extra: { accountName?: string; courseCount?: number; universityName?: string; portalHost?: string } = {}) {
    const device = readDevice();
    if (!device?.deviceSecret) throw new PortalError("AGENT_NOT_PAIRED", "Pair UniPilot Agent with your account first.");
    const response = await fetch(new URL("/api/agent/events", appOrigin()), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${device.deviceSecret}` },
      body: JSON.stringify({ event, adapterKey: "mock", ...extra }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
      throw new PortalError(payload?.error?.code ?? "AUTOMATION_FAILED", payload?.error?.message ?? "UniPilot could not save this university update.");
    }
  }

  async function open(teacherId: string) {
    const page = await launchProfile(profileDirectory(teacherId, "mock"), true);
    state.viewToken = createViewToken();
    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) return;
      const url = frame.url();
      if (url === "about:blank") return;
      state.pageLabel = pageLabel(url);
      rememberPortal(url);
    });
    return page;
  }

  function fail(error: unknown) {
    state.phase = "FAILED";
    state.errorCode = error instanceof PortalError ? error.code : "AUTOMATION_FAILED";
    state.message = error instanceof Error ? error.message : "The university browser could not be opened.";
  }

  return {
    snapshot,
    get busy() {
      return busy;
    },
    async start(teacherId: string) {
      if (busy) return snapshot();
      busy = true;
      const token = ++generation;
      state.phase = "BROWSER_OPENING";
      state.message = "Opening a dedicated university browser.";
      state.errorCode = null;
      try {
        const page = await open(teacherId);
        if (token !== generation) return snapshot();
        const startUrl = lastPortal() ?? university.getLoginUrl();
        await page.goto(startUrl, { waitUntil: "domcontentloaded" });
        state.pageLabel = pageLabel(page.url());
        state.phase = "LMS_OPENED";
        await report("UNIVERSITY_BROWSER_OPENED");
        state.phase = "WAITING_FOR_LOGIN";
        state.message = "The university panel is open on this page. Enter the university address, sign in there, or type a prompt such as Click Courses.";
        const deadline = Date.now() + 30 * 60 * 1000;
        while (Date.now() < deadline) {
          if (token !== generation) return snapshot();
          state.pageLabel = pageLabel(page.url());
          if (await panelSignedIn(page, origin, () => university.isAuthenticated(page))) {
            const onMock = page.url().startsWith(origin);
            const user = onMock ? await university.getAuthenticatedUser(page) : null;
            const accountName = user?.name ?? (onMock ? null : await panelAccountName(page));
            const host = onMock ? undefined : new URL(page.url()).hostname;
            state.accountName = accountName ?? state.accountName;
            await report("UNIVERSITY_LOGIN_DETECTED", { accountName: state.accountName ?? undefined, universityName: host ? universityLabel(host) : undefined, portalHost: host });
            await report("UNIVERSITY_CONNECTED", { accountName: state.accountName ?? undefined, universityName: host ? universityLabel(host) : undefined, portalHost: host });
            state.phase = "AUTHENTICATED";
            state.message = "University connected. Learning this university's sections...";
            const map = await learnOpenUniversity().catch(() => null);
            state.message = map && map.sections.length > 0
              ? `University connected. Learned ${map.sections.length} sections. Approve a marks file, then ask the agent to upload those marks.`
              : "University connected. The panel stays here so you can watch each prompt.";
            return snapshot();
          }
          await delay(1500);
        }
        state.phase = "WAITING_FOR_LOGIN";
        state.message = "Still waiting for sign-in inside the university panel.";
      } catch (error) {
        fail(error);
        clearView();
        clearView();
        await closeBrowser().catch(() => undefined);
      } finally {
        busy = false;
      }
      return snapshot();
    },
    async verify(teacherId: string) {
      if (busy) return snapshot();
      busy = true;
      try {
        const page = await open(teacherId);
        await page.goto(university.getLoginUrl(), { waitUntil: "domcontentloaded" });
        const signedIn = await university.isAuthenticated(page);
        if (!signedIn) {
          await report("UNIVERSITY_SESSION_EXPIRED");
          clearView();
          clearView();
        await closeBrowser();
          state.phase = "SESSION_EXPIRED";
          state.errorCode = "UNIVERSITY_SESSION_EXPIRED";
          state.message = "University Session Expired. Please reconnect your university account.";
          return snapshot();
        }
        const user = await university.getAuthenticatedUser(page);
        state.accountName = user?.name ?? state.accountName;
        await report("UNIVERSITY_SESSION_VERIFIED", { accountName: state.accountName ?? undefined });
        clearView();
        await closeBrowser();
        state.phase = "AUTHENTICATED";
        state.errorCode = null;
        state.message = "University session is active.";
        return snapshot();
      } catch (error) {
        fail(error);
        clearView();
        await closeBrowser().catch(() => undefined);
        return snapshot();
      } finally {
        busy = false;
      }
    },
    async readCourses(teacherId: string) {
      if (busy) return snapshot();
      busy = true;
      state.phase = "READING";
      state.message = "Reading courses from the university portal.";
      try {
        const page = await open(teacherId);
        await page.goto(university.getLoginUrl(), { waitUntil: "domcontentloaded" });
        if (!(await university.isAuthenticated(page))) {
          await report("UNIVERSITY_SESSION_EXPIRED");
          clearView();
          clearView();
        await closeBrowser();
          state.phase = "SESSION_EXPIRED";
          state.errorCode = "UNIVERSITY_SESSION_EXPIRED";
          state.message = "University Session Expired. Please reconnect your university account.";
          state.courses = null;
          return snapshot();
        }
        const courses = await university.listCourses(page);
        state.courses = courses;
        await report("COURSES_READ", { courseCount: courses.length, accountName: state.accountName ?? undefined });
        clearView();
        await closeBrowser();
        state.phase = "AUTHENTICATED";
        state.errorCode = null;
        state.message = "Courses read from the university portal.";
        return snapshot();
      } catch (error) {
        fail(error);
        clearView();
        await closeBrowser().catch(() => undefined);
        return snapshot();
      } finally {
        busy = false;
      }
    },
    async readAssessments(teacherId: string, portalId: string) {
      if (busy) throw new PortalError("AUTOMATION_FAILED", "The university browser is already working.");
      busy = true;
      try {
        const page = await open(teacherId);
        await page.goto(university.getLoginUrl(), { waitUntil: "domcontentloaded" });
        if (!(await university.isAuthenticated(page))) {
          await report("UNIVERSITY_SESSION_EXPIRED");
          throw new PortalError("UNIVERSITY_SESSION_EXPIRED", "The university session is no longer signed in.");
        }
        const assessments = await university.readAssessments(page, portalId);
        await report("ASSESSMENTS_READ");
        clearView();
        await closeBrowser();
        return assessments;
      } finally {
        busy = false;
        clearView();
        await closeBrowser().catch(() => undefined);
      }
    },
    async disconnect(teacherId: string) {
      generation += 1;
      busy = false;
      await closeBrowser();
      clearView();
      const dir = profileDirectory(teacherId, "mock");
      for (let attempt = 0; attempt < 3; attempt += 1) {
        fs.rmSync(dir, { recursive: true, force: true });
        if (!fs.existsSync(dir)) break;
        await delay(400);
      }
      if (fs.existsSync(dir)) throw new PortalError("AUTOMATION_FAILED", "The university browser is still in use. Close it, then disconnect again.");
      await report("UNIVERSITY_DISCONNECTED");
      state.phase = "idle";
      state.accountName = null;
      state.courses = null;
      state.errorCode = null;
      state.message = "University disconnected.";
      return snapshot();
    },
    viewMatches(token: string | undefined) {
      return viewTokensMatch(state.viewToken, token);
    },
    capture() {
      return captureFrame();
    },
    interact(body: Record<string, unknown>) {
      return applyPortalInput(body, origin).then(async (result) => {
        state.pageLabel = (await currentPageLabel()) ?? state.pageLabel;
        return result;
      });
    },
    async stop() {
      generation += 1;
      clearView();
      await closeBrowser();
    },
  };
}
