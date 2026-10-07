"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AmbientBackground } from "@/components/shared/ambient-background";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { sendPasswordReset, signUp } from "@/services/auth";
import { useSessionStore } from "@/store/session-store";

const schema = z.object({
  name: z.string().min(3, "Enter your full name"),
  email: z.email("Enter a valid email"),
  department: z.string().min(2),
  password: z.string().min(8, "Use at least 8 characters"),
  confirm: z.string().min(8, "Confirm your password"),
}).refine((values) => values.password === values.confirm, { path: ["confirm"], message: "Passwords do not match" });

export function RegisterScreen() {
  const router = useRouter();
  const login = useSessionStore((state) => state.login);
  const session = useSessionStore((state) => state.session);
  const hydrated = useSessionStore((state) => state.hasHydrated);
  const remote = isSupabaseConfigured();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", department: "Computer Science", password: "", confirm: "" } });

  useEffect(() => {
    if (hydrated && session) router.replace("/dashboard");
  }, [hydrated, session, router]);

  return (
    <AuthFrame
      title="Create your faculty account"
      subtitle={remote ? "This creates a UniPilot account. It does not create a university login." : "This demo signs you in locally. It does not create a university login."}
    >
      <form
        className="space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          setPending(true);
          setFormError(null);
          try {
            if (remote) await signUp({ name: values.name, email: values.email, department: values.department, password: values.password });
            else login(values.email, true);
            router.push("/dashboard");
          } catch (error) {
            setFormError(error instanceof Error ? error.message : "Could not create the account");
            setPending(false);
          }
        })}
      >
        <Label htmlFor="name">Full name</Label>
        <Input id="name" autoComplete="name" {...form.register("name")} />
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        <Label htmlFor="department">Department</Label>
        <Input id="department" {...form.register("department")} />
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password ? <p className="text-xs text-rose-500">{form.formState.errors.password.message}</p> : null}
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" type="password" autoComplete="new-password" {...form.register("confirm")} />
        {form.formState.errors.confirm ? <p className="text-xs text-rose-500">{form.formState.errors.confirm.message}</p> : null}
        {formError ? <p className="text-sm text-rose-500">{formError}</p> : null}
        <Button className="w-full" type="submit" disabled={pending}>{pending ? "Creating account..." : "Create Account"}</Button>
        <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="text-primary hover:underline">Login</Link></p>
      </form>
    </AuthFrame>
  );
}

const forgotSchema = z.object({ email: z.email("Enter a valid email") });

export function ForgotScreen() {
  const remote = isSupabaseConfigured();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  return (
    <AuthFrame
      title="Reset your password"
      subtitle={remote ? "Supabase will email a reset link if this account exists." : "A simulated reset note is enough for this frontend. No email is sent."}
    >
      {sent ? (
        <p className="text-sm">If an account exists for that email, a reset link is on its way. You can return to login.</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(async (values) => {
            setFormError(null);
            try {
              if (remote) await sendPasswordReset(values.email);
              setSent(true);
            } catch (error) {
              setFormError(error instanceof Error ? error.message : "Could not send the reset link");
            }
          })}
        >
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          {form.formState.errors.email ? <p className="text-xs text-rose-500">{form.formState.errors.email.message}</p> : null}
          {formError ? <p className="text-sm text-rose-500">{formError}</p> : null}
          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>Send reset link</Button>
        </form>
      )}
      <Button variant="outline" className="mt-3 w-full" asChild><Link href="/login">Back to login</Link></Button>
    </AuthFrame>
  );
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <AmbientBackground variant="hero" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Link href="/" aria-label="UniPilot AI home"><Logo /></Link>
        <div className="glass-panel mt-6 rounded-3xl p-6 text-foreground">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
