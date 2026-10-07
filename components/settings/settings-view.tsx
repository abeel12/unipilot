"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { liveUniversityConnection, universityConnectionLabel } from "@/lib/university-connection";
import { getTeacher, getUniversityConnection, updateTeacher } from "@/services/api";
import { updatePassword } from "@/services/auth";
import { resetDemoData } from "@/services/db";
import { resetRemoteDemo } from "@/services/supabase/data";

const profileSchema = z.object({
  name: z.string().min(3, "Enter your name"),
  department: z.string().min(2),
  university: z.string().min(2),
  email: z.email("Enter a valid email"),
});

const passwordSchema = z.object({
  current: z.string().min(8, "Enter your current password"),
  next: z.string().min(8, "Use at least 8 characters"),
}).refine((value) => value.current !== value.next, { message: "Choose a different password", path: ["next"] });

export function SettingsView() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const teacher = useQuery({ queryKey: ["teacher"], queryFn: getTeacher });
  const connection = useQuery({ queryKey: ["connection"], queryFn: getUniversityConnection });
  const profile = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", department: "", university: "", email: "" },
  });
  const security = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { current: "", next: "" } });

  const resetProfile = profile.reset;
  const connected = liveUniversityConnection(connection.data);
  useEffect(() => {
    if (!teacher.data) return;
    resetProfile({
      name: teacher.data.name,
      department: teacher.data.department,
      university: connected && connection.data?.university ? connection.data.university : teacher.data.university,
      email: teacher.data.email,
    });
  }, [teacher.data, resetProfile, connected, connection.data?.university]);

  return (
    <Tabs defaultValue="profile">
      <TabsList className="flex h-auto flex-wrap">
        {["profile", "appearance", "security", "ai", "university", "privacy"].map((value) => (
          <TabsTrigger key={value} value={value} className="capitalize">{value === "ai" ? "AI Preferences" : value === "privacy" ? "Data & Privacy" : value}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="profile">
        <form
          className="glass-panel max-w-xl space-y-3 rounded-3xl p-5"
          onSubmit={profile.handleSubmit(async (values) => {
            await updateTeacher(values);
            await queryClient.invalidateQueries({ queryKey: ["teacher"] });
            toast.success("Profile saved");
          })}
        >
          <Field label="Name" error={profile.formState.errors.name?.message}>
            <Input {...profile.register("name")} />
          </Field>
          <Field label="Department" error={profile.formState.errors.department?.message}>
            <Input {...profile.register("department")} />
          </Field>
          <Field label="University" error={profile.formState.errors.university?.message}>
            <Input {...profile.register("university")} readOnly={connected} />
            {connected ? <span className="text-xs text-muted-foreground">Taken from the connected university portal.</span> : null}
          </Field>
          <Field label="Email" error={profile.formState.errors.email?.message}>
            <Input type="email" {...profile.register("email")} />
          </Field>
          <Button type="submit">Save profile</Button>
        </form>
      </TabsContent>
      <TabsContent value="appearance">
        <section className="glass-panel max-w-xl rounded-3xl p-5">
          <h2 className="font-semibold">Theme</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {(["light", "dark", "system"] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => theme.setTheme(mode)} className={`rounded-2xl border px-3 py-4 text-sm capitalize ${theme.theme === mode ? "border-primary bg-primary/10" : "border-border"}`}>
                {mode === "light" ? "Light Mode" : mode === "dark" ? "Dark Mode" : "System Mode"}
              </button>
            ))}
          </div>
        </section>
      </TabsContent>
      <TabsContent value="security">
        <form
          className="glass-panel max-w-xl space-y-3 rounded-3xl p-5"
          onSubmit={security.handleSubmit(async (values) => {
            try {
              if (isSupabaseConfigured()) await updatePassword(values.next);
              security.reset();
              toast.success(isSupabaseConfigured() ? "Password updated" : "Password updated for this demo session. It is not stored.");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update the password");
            }
          })}
        >
          <Field label="Current password" error={security.formState.errors.current?.message}>
            <Input type="password" autoComplete="current-password" {...security.register("current")} />
          </Field>
          <Field label="New password" error={security.formState.errors.next?.message}>
            <Input type="password" autoComplete="new-password" {...security.register("next")} />
          </Field>
          <label className="flex items-center justify-between rounded-2xl border border-border px-3 py-3 text-sm">
            Faculty sign-in reminder
            <Switch defaultChecked aria-label="Faculty sign-in reminder" />
          </label>
          <Button type="submit">Update password</Button>
        </form>
      </TabsContent>
      <TabsContent value="ai">
        <section className="glass-panel max-w-xl space-y-3 rounded-3xl p-5">
          <Preference label="Ask only for missing weightage" defaultChecked />
          <Preference label="Require confirmation before upload" defaultChecked />
          <Preference label="Show confidence on detected sections" defaultChecked />
        </section>
      </TabsContent>
      <TabsContent value="university">
        <section className="glass-panel max-w-xl rounded-3xl p-5">
          <h2 className="font-semibold">{connection.data?.portalName ?? "ABC University Portal"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Status: {!connection.data ? "Loading" : universityConnectionLabel(connection.data)}
            {connection.data?.accountName ? ` · ${connection.data.accountName}` : ""}
          </p>
          <Button className="mt-4" asChild>
            <Link href="/university-connection">Manage connection</Link>
          </Button>
        </section>
      </TabsContent>
      <TabsContent value="privacy">
        <section className="glass-panel max-w-xl space-y-3 rounded-3xl p-5">
          <p className="text-sm text-muted-foreground">
            {isSupabaseConfigured()
              ? "Academic records for this account live in Supabase. University passwords are never collected."
              : "UniPilot keeps demo records on this device. University passwords are never collected."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([JSON.stringify({ note: "Demo export without credentials" })], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "unipilot-privacy-export.json";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export data
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void (async () => {
                  try {
                    if (isSupabaseConfigured()) await resetRemoteDemo();
                    else resetDemoData();
                    await queryClient.invalidateQueries();
                    toast.success(isSupabaseConfigured() ? "Workspace data cleared" : "Local demo data reset");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not reset demo data");
                  }
                })();
              }}
            >
              Clear local data
            </Button>
          </div>
        </section>
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <Label>{label}</Label>
      {children}
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}

function Preference({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3 text-sm">
      {label}
      <Switch defaultChecked={defaultChecked} aria-label={label} />
    </label>
  );
}
