import fs from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";

let context: BrowserContext | null = null;

export function browserHeadless() {
  return process.env.AGENT_HEADLESS === "true";
}

export async function launchProfile(profileDir: string, headless = browserHeadless()) {
  await closeBrowser();
  fs.mkdirSync(profileDir, { recursive: true });
  context = await chromium.launchPersistentContext(profileDir, {
    headless,
    viewport: { width: 1280, height: 800 },
    args: ["--disable-sync", "--no-first-run", "--no-default-browser-check"],
  });
  return context.pages()[0] ?? context.newPage();
}

export async function closeBrowser() {
  if (!context) return;
  const closing = context;
  context = null;
  await closing.close();
}

export async function activePage(): Promise<Page | null> {
  if (!context) return null;
  return context.pages()[0] ?? null;
}
