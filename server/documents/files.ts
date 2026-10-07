const EXTENSIONS = new Set([".xlsx", ".xls", ".csv", ".pdf", ".docx"]);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function extensionOf(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "";
  const match = base.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "marks-file";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^\.+/, "").slice(0, 80);
  return cleaned || "marks-file";
}

export function validateUpload(file: { name: string; type: string; size: number }) {
  const extension = extensionOf(file.name);
  if (!EXTENSIONS.has(extension)) {
    return { ok: false as const, code: "UPLOAD_FAILED", message: "Use an Excel, CSV, PDF, or DOCX file." };
  }
  if (file.size <= 0) {
    return { ok: false as const, code: "UPLOAD_FAILED", message: "The file is empty." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false as const, code: "UPLOAD_FAILED", message: "The file is larger than 10 MB." };
  }
  if (file.type && /^(image|video|audio)\//.test(file.type)) {
    return { ok: false as const, code: "UPLOAD_FAILED", message: "This file type is not a marks document." };
  }
  return { ok: true as const, extension };
}
