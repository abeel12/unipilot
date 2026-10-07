"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AmbientBackground } from "@/components/shared/ambient-background";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";
import { useUiStore } from "@/store/ui-store";
import { AppSidebar } from "./app-sidebar";
import { MobileNavigation } from "./mobile-navigation";
import { MobileDrawer, TopHeader } from "./top-header";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const session = useSessionStore((state) => state.session);
  const hydrated = useSessionStore((state) => state.hasHydrated);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !session) router.replace("/login");
  }, [hydrated, session, router]);

  if (!hydrated || !session) {
    return (
      <div className="grid min-h-screen place-items-center">
        <AmbientBackground variant="hero" />
        <Link href="/" className="relative z-10" aria-label="UniPilot AI home"><Logo /></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <AmbientBackground variant="hero" />
      <div className={cn("relative z-10", collapsed ? "lg:pl-[108px]" : "lg:pl-[292px]")}>
        <TopHeader />
        <main id="main" className="px-4 pb-28 md:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <AppSidebar />
      <MobileDrawer />
      <MobileNavigation />
    </div>
  );
}
