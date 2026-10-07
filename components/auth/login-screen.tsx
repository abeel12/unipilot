"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AmbientBackground } from "@/components/shared/ambient-background";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { signIn } from "@/services/auth";
import { useSessionStore } from "@/store/session-store";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
  remember: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function LoginScreen() {
  const router = useRouter();
  const login = useSessionStore((state) => state.login);
  const session = useSessionStore((state) => state.session);
  const hydrated = useSessionStore((state) => state.hasHydrated);
  const [pending, setPending] = useState(false);
  const [remember, setRemember] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const remote = isSupabaseConfigured();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  useEffect(() => {
    if (hydrated && session) router.replace("/dashboard");
  }, [hydrated, session, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    setFormError(null);
    try {
      if (remote) await signIn(values.email, values.password, remember);
      else {
        await new Promise((resolve) => setTimeout(resolve, 500));
        login(values.email, remember);
      }
      router.push("/dashboard");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not sign in");
      setPending(false);
    }
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <AmbientBackground variant="hero" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="max-w-xl">
            <Link href="/" aria-label="UniPilot AI home"><Logo /></Link>
            <h1 className="mt-8 text-4xl font-semibold sm:text-5xl">Your AI copilot for university work</h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              From marksheets to university portals. Sign in, then the workspace opens.
            </p>
          </div>
          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel w-full rounded-3xl p-6 text-foreground sm:p-8"
            noValidate
          >
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {remote ? "Sign in with your UniPilot account." : "This demo accepts any valid email and password."}
            </p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="ahmed.khan@abc.edu" {...form.register("email")} />
                {form.formState.errors.email ? <p className="text-xs text-rose-500">{form.formState.errors.email.message}</p> : null}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password
                  </Link>
                </div>
                <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
                {form.formState.errors.password ? (
                  <p className="text-xs text-rose-500">{form.formState.errors.password.message}</p>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={remember} onCheckedChange={(checked) => setRemember(checked === true)} />
                Remember me
              </label>
            </div>
            {formError ? <p className="mt-4 text-sm text-rose-500">{formError}</p> : null}
            <Button type="submit" className="mt-6 h-11 w-full" disabled={pending}>
              {pending ? "Signing in..." : "Login"}
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don&apos;t have an account? <Link href="/register" className="text-primary hover:underline">Sign up</Link>
            </p>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Back to home</Link>
            </p>
          </motion.form>
        </motion.section>
      </div>
    </div>
  );
}
