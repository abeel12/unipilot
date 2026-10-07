"use client";

import * as Popover from "@radix-ui/react-popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { liveUniversityConnection } from "@/lib/university-connection";
import { cn } from "@/lib/utils";
import { getTeacher, getUniversityConnection, updateTeacher, updateTeacherAvatar } from "@/services/api";
import type { Teacher } from "@/types";

const rules = {
  name: z.string().trim().min(3, "Enter your name"),
  department: z.string().trim().min(2, "Enter your department"),
  university: z.string().trim().min(2, "Enter your university"),
  email: z.email("Enter a valid email"),
};

export function ProfileButton({
  className,
  side = "bottom",
  align = "end",
}: {
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const syncedUniversity = useRef("");
  const teacher = useQuery({ queryKey: ["teacher"], queryFn: getTeacher });
  const connection = useQuery({ queryKey: ["connection"], queryFn: getUniversityConnection });
  const connected = liveUniversityConnection(connection.data);
  const university = connected && connection.data?.university ? connection.data.university : teacher.data?.university;
  const initials = teacher.data?.avatarInitials ?? "…";
  const photo = teacher.data?.avatarUrl;

  useEffect(() => {
    const next = connection.data?.university;
    if (!teacher.data || !connected || !next || teacher.data.university === next || syncedUniversity.current === next) return;
    syncedUniversity.current = next;
    void updateTeacher({ university: next }).then(() => queryClient.invalidateQueries({ queryKey: ["teacher"] }));
  }, [connected, connection.data?.university, queryClient, teacher.data]);

  async function saveField(field: keyof typeof rules, value: string) {
    const parsed = rules[field].safeParse(value);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check that field");
      return false;
    }
    await updateTeacher({ [field]: parsed.data } as Partial<Teacher>);
    await queryClient.invalidateQueries({ queryKey: ["teacher"] });
    toast.success("Profile saved");
    return true;
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await squarePhoto(file);
      await updateTeacherAvatar(dataUrl);
      await queryClient.invalidateQueries({ queryKey: ["teacher"] });
      toast.success("Profile picture saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not use that picture");
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={teacher.data ? `Open profile for ${teacher.data.name}` : "Open profile"}
          className={cn(
            "grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-[11px] font-semibold leading-none text-primary-foreground ring-2 ring-primary/30 transition hover:ring-primary",
            className,
          )}
        >
          {photo ? (
            // The picture is a local data URL chosen by the teacher.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="size-full object-cover" />
          ) : initials}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={10}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="z-50 w-[min(100vw-1.5rem,23rem)] overflow-hidden rounded-3xl border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_-24px_rgba(8,12,32,0.85)]"
        >
          <div className="relative h-28 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--primary)_70%,transparent),transparent_55%),linear-gradient(135deg,color-mix(in_srgb,var(--primary)_35%,transparent),transparent_60%)]">
            <div className="absolute -bottom-11 left-5">
              <div className="relative">
                <div className="grid size-24 place-items-center overflow-hidden rounded-full border-4 border-popover bg-primary text-lg font-semibold text-primary-foreground shadow-lg">
                  {photo ? (
                    // The picture is a local data URL chosen by the teacher.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="size-full object-cover" />
                  ) : initials}
                </div>
                <button
                  type="button"
                  aria-label="Upload profile picture"
                  className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:brightness-110"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="size-3.5" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    void onPhoto(file);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="max-h-[min(28rem,calc(100vh-8rem))] overflow-y-auto px-5 pb-5 pt-14">
            <p className="truncate text-lg font-semibold tracking-tight">{teacher.data?.name ?? "Profile"}</p>
            <p className="truncate text-xs text-muted-foreground">{teacher.data?.title ?? "Faculty"}</p>
            <div className="mt-4 space-y-2">
              <FieldRow label="Name" value={teacher.data?.name} onSave={(value) => saveField("name", value)} />
              <FieldRow label="Department" value={teacher.data?.department} onSave={(value) => saveField("department", value)} />
              <FieldRow
                label="University"
                value={university}
                locked={connected}
                hint={connected ? `From ${connection.data?.portalName || "the connected portal"}` : undefined}
                onSave={(value) => saveField("university", value)}
              />
              {connected && connection.data?.accountName ? (
                <FieldRow label="Portal account" value={connection.data.accountName} locked />
              ) : null}
              <FieldRow label="Email" value={teacher.data?.email} onSave={(value) => saveField("email", value)} />
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function FieldRow({
  label,
  value,
  locked = false,
  hint,
  onSave,
}: {
  label: string;
  value?: string;
  locked?: boolean;
  hint?: string;
  onSave?: (value: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [editing, value]);

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-background/50 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {editing ? (
          <input
            autoFocus
            value={draft}
            aria-label={label}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(false);
              if (event.key === "Enter") {
                setSaving(true);
                void onSave?.(draft)
                  .then((ok) => {
                    if (ok) setEditing(false);
                  })
                  .finally(() => setSaving(false));
              }
            }}
            className="mt-1 h-8 w-full bg-transparent text-sm font-medium outline-none"
          />
        ) : (
          <p className="truncate text-sm font-medium">{value || "—"}</p>
        )}
        {hint && !editing ? <p className="mt-0.5 truncate text-[11px] text-primary">{hint}</p> : null}
      </div>
      {locked ? null : editing ? (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label={`Save ${label}`}
            disabled={saving}
            className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"
            onClick={() => {
              setSaving(true);
              void onSave?.(draft)
                .then((ok) => {
                  if (ok) setEditing(false);
                })
                .catch((error: unknown) => {
                  toast.error(error instanceof Error ? error.message : "Could not save the profile");
                })
                .finally(() => setSaving(false));
            }}
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Cancel ${label}`}
            className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground"
            onClick={() => setEditing(false)}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label={`Edit ${label}`}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3.5" />
        </button>
      )}
    </div>
  );
}

async function squarePhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose a picture file.");
  if (file.size > 8_000_000) throw new Error("Choose a picture under 8 MB.");
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not read that picture.");
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
