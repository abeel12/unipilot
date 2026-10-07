import type { Page } from "playwright";

export interface PortalCourse {
  portalId: string;
  code: string;
  name: string;
  semester: string;
  section: string;
}

export interface PortalAssessment {
  portalId: string;
  name: string;
}

export interface PortalStudent {
  portalId: string;
  name: string;
}

export class PortalError extends Error {
  constructor(
    public code: string,
    message: string,
    public url = "",
    public title = "",
  ) {
    super(message);
  }
}

export function assertOwnedUrl(url: string, origin: string) {
  const target = new URL(url);
  const home = new URL(origin);
  if (target.origin !== home.origin || target.username || target.password) {
    throw new PortalError("UNIVERSITY_NOT_SUPPORTED", "The agent only opens the configured university portal.");
  }
}

export function mockUniversity(origin: string) {
  function owned(path: string) {
    const url = new URL(path, origin).toString();
    assertOwnedUrl(url, origin);
    return url;
  }

  return {
    key: "mock",
    getLoginUrl() {
      return owned("/login");
    },
    async isAuthenticated(page: Page) {
      const login = await page.locator("#login").count();
      const courses = await page.getByRole("heading", { name: "My Courses" }).count();
      const logout = await page.getByRole("link", { name: "Log out" }).count();
      return login === 0 && courses > 0 && logout > 0;
    },
    async getAuthenticatedUser(page: Page) {
      const text = await page.locator("body").innerText();
      const match = /Signed in as (.+)/.exec(text);
      const name = match?.[1]?.split("\n")[0]?.trim() ?? "";
      return name ? { name } : null;
    },
    async listCourses(page: Page): Promise<PortalCourse[]> {
      await page.goto(owned("/courses"), { waitUntil: "domcontentloaded" });
      if (!(await this.isAuthenticated(page))) throw new PortalError("UNIVERSITY_SESSION_EXPIRED", "The university session is no longer signed in.", page.url(), await page.title());
      const rows = await page.locator("tr[data-portal-id]").evaluateAll((elements) =>
        elements.map((element) => ({
          portalId: element.getAttribute("data-portal-id") ?? "",
          cells: Array.from(element.querySelectorAll("td")).map((cell) => cell.textContent?.trim() ?? ""),
        })),
      );
      if (rows.length === 0) throw new PortalError("PORTAL_STRUCTURE_CHANGED", "The course list is not on this page.", page.url(), await page.title());
      return rows.map((row) => ({
        portalId: row.portalId,
        code: row.cells[0] ?? "",
        name: row.cells[1] ?? "",
        semester: row.cells[2] ?? "",
        section: row.cells[3] ?? "",
      }));
    },
    async readAssessments(page: Page, portalId: string): Promise<PortalAssessment[]> {
      if (!/^[a-z0-9-]+$/.test(portalId)) throw new PortalError("COURSE_NOT_FOUND", "That course was not found.");
      await page.goto(owned(`/course/${portalId}/assessments`), { waitUntil: "domcontentloaded" });
      if ((await page.locator("#login").count()) > 0) throw new PortalError("UNIVERSITY_SESSION_EXPIRED", "The university session is no longer signed in.", page.url(), await page.title());
      const items = await page.locator("li[data-id]").evaluateAll((elements) =>
        elements.map((element) => ({ portalId: element.getAttribute("data-id") ?? "", name: element.textContent?.trim() ?? "" })),
      );
      if (items.length === 0) throw new PortalError("PORTAL_STRUCTURE_CHANGED", "The assessment list is not on this page.", page.url(), await page.title());
      return items;
    },
    async readStudents(page: Page, portalId: string): Promise<PortalStudent[]> {
      if (!/^[a-z0-9-]+$/.test(portalId)) throw new PortalError("COURSE_NOT_FOUND", "That course was not found.");
      await page.goto(owned(`/course/${portalId}/students`), { waitUntil: "domcontentloaded" });
      const items = await page.locator("li[data-id]").evaluateAll((elements) =>
        elements.map((element) => ({ portalId: element.getAttribute("data-id") ?? "", name: element.textContent?.trim() ?? "" })),
      );
      if (items.length === 0) throw new PortalError("PORTAL_STRUCTURE_CHANGED", "The student list is not on this page.", page.url(), await page.title());
      return items;
    },
    createAssessment() {
      throw new PortalError("WRITE_DISABLED", "University writes are off.");
    },
    uploadMarks() {
      throw new PortalError("WRITE_DISABLED", "University writes are off.");
    },
    verifyMarks() {
      throw new PortalError("WRITE_DISABLED", "University writes are off.");
    },
  };
}
