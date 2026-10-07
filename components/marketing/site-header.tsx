"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { LayoutGroup, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/services/auth";
import { useSessionStore } from "@/store/session-store";
import { MARKETING_LINKS } from "./links";

function scrollToId(hash: string) {
  const target = document.getElementById(hash.replace("#", ""));
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", hash);
  return true;
}

function useScrolled() {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("scroll", onStoreChange, { passive: true });
      return () => window.removeEventListener("scroll", onStoreChange);
    },
    () => window.scrollY > 8,
    () => false,
  );
}

function useScrollProgress() {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("scroll", onStoreChange, { passive: true });
      window.addEventListener("resize", onStoreChange);
      return () => {
        window.removeEventListener("scroll", onStoreChange);
        window.removeEventListener("resize", onStoreChange);
      };
    },
    () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.round((window.scrollY / max) * 1000) / 1000;
    },
    () => 0,
  );
}

export function useAccountEntryHref() {
  const session = useSessionStore((state) => state.session);
  const hydrated = useSessionStore((state) => state.hasHydrated);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  return mounted && hydrated && session ? "/dashboard" : "/register";
}

export function AuthActions({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const hydrated = useSessionStore((state) => state.hasHydrated);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [pending, setPending] = useState(false);
  const entryHref = useAccountEntryHref();
  const wide = compact ? "w-full" : undefined;

  if (mounted && hydrated && session) {
    return (
      <div className={cn("flex items-center gap-2", compact && "flex-col")}>
        <Button asChild size="sm" className={wide}>
          <Link href="/dashboard">Open workspace</Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={wide}
          disabled={pending}
          onClick={() => {
            setPending(true);
            void signOut()
              .then(() => router.replace("/"))
              .finally(() => setPending(false));
          }}
        >
          Log out
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", compact && "flex-col")}>
      <Button variant="ghost" size="sm" asChild className={wide}>
        <Link href="/login">Login</Link>
      </Button>
      <Button variant="outline" size="sm" asChild className={wide}>
        <Link href="/register">Sign up</Link>
      </Button>
      <Button size="sm" asChild className={wide}>
        <Link href={entryHref}>Get started</Link>
      </Button>
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#hero");
  const scrolled = useScrolled();
  const progress = useScrollProgress();

  useEffect(() => {
    const sections = MARKETING_LINKS.map((item) => document.getElementById(item.href.slice(1))).filter(
      (section): section is HTMLElement => section instanceof HTMLElement,
    );
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.35] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function go(hash: string) {
    setActive(hash);
    setOpen(false);
    window.setTimeout(() => scrollToId(hash), 40);
  }

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 md:px-6">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-0.5 bg-transparent"
        aria-hidden
      >
        <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
      </div>
      <div
        className={cn(
          "mx-auto flex max-w-6xl flex-col rounded-2xl border transition-colors",
          scrolled ? "border-border bg-card/80 shadow-[var(--shadow-soft)] backdrop-blur-xl" : "border-transparent bg-card/35 backdrop-blur-md",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 md:px-4">
          <Link
            href="/"
            aria-label="UniPilot AI home"
            onClick={(event) => {
              if (window.location.pathname === "/") {
                event.preventDefault();
                go("#hero");
              }
            }}
          >
            <Logo />
          </Link>
          <LayoutGroup>
            <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Site">
              {MARKETING_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    go(item.href);
                  }}
                  className={cn(
                    "relative rounded-xl px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground",
                    active === item.href && "text-foreground",
                  )}
                >
                  {active === item.href ? (
                    <motion.span layoutId="nav-indicator" className="absolute inset-x-2 bottom-1 h-px bg-primary" />
                  ) : null}
                  {item.label}
                </a>
              ))}
            </nav>
          </LayoutGroup>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden xl:block">
              <AuthActions />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="xl:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {open ? (
          <div className="space-y-3 border-t border-border px-3 py-3 xl:hidden">
            <nav className="grid gap-1" aria-label="Mobile">
              {MARKETING_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    go(item.href);
                  }}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm",
                    active === item.href ? "bg-accent text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <AuthActions compact />
          </div>
        ) : null}
      </div>
    </header>
  );
}
