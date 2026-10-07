import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

export interface DeviceRecord {
  devicePublicId: string;
  deviceName: string;
  deviceSecret?: string;
  teacherId?: string;
}

export function dataRoot() {
  return process.env.UNIPILOT_HOME ?? path.join(os.homedir(), ".unipilot");
}

function deviceFile() {
  return path.join(dataRoot(), "device.json");
}

export function readDevice(): DeviceRecord | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(deviceFile(), "utf8")) as DeviceRecord;
    if (!parsed.devicePublicId || !parsed.deviceName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ensureDeviceIdentity(): DeviceRecord {
  const current = readDevice();
  if (current) return current;
  const created: DeviceRecord = {
    devicePublicId: randomBytes(16).toString("hex"),
    deviceName: process.env.COMPUTERNAME || os.hostname() || "This computer",
  };
  writeDevice(created);
  return created;
}

export function writeDevice(record: DeviceRecord) {
  const root = dataRoot();
  fs.mkdirSync(root, { recursive: true });
  const file = deviceFile();
  fs.writeFileSync(file, JSON.stringify(record), { mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Windows may ignore the unix mode. The file still stays outside the repository.
  }
}

export function profileDirectory(teacherId: string, adapterKey: string) {
  const teacher = teacherId.replace(/[^a-zA-Z0-9-]/g, "");
  const adapter = adapterKey.replace(/[^a-zA-Z0-9-]/g, "");
  if (!teacher || !adapter) throw Object.assign(new Error("The university profile path is not valid."), { code: "AUTOMATION_FAILED" });
  return path.join(dataRoot(), "profiles", teacher, adapter);
}

export function appOrigin() {
  const url = new URL(process.env.UNIPILOT_APP_URL ?? "http://localhost:3000");
  if (url.username || url.password) throw Object.assign(new Error("The app address is not valid."), { code: "AUTOMATION_FAILED" });
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw Object.assign(new Error("The app address is not valid."), { code: "AUTOMATION_FAILED" });
  }
  return url.origin;
}
