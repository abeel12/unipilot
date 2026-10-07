"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LogOut, PanelLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/lib/navigation";
import { liveUniversityConnection, universityConnectionLabel } from "@/lib/university-connection";
import { cn } from "@/lib/utils";
import { getTeacher, getUniversityConnection } from "@/services/api";
import { signOut } from "@/services/auth";
import { useUiStore } from "@/store/ui-store";
import { ProfileButton } from "./profile-button";

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground",
              active && "bg-accent text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {active ? <span className="absolute inset-0 rounded-xl border border-primary/30 bg-primary/10" /> : null}
            <Icon className={cn("relative size-4", active && "text-primary")} />
            {collapsed ? null : <span className="relative truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function TeacherCard({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const teacher = useQuery({ queryKey: ["teacher"], queryFn: getTeacher });
  const connection = useQuery({ queryKey: ["connection"], queryFn: getUniversityConnection });
  const name = teacher.data?.name ?? "Loading";
  const department = teacher.data?.department ?? "";
  const connected = liveUniversityConnection(connection.data);
  const connectionLabel = universityConnectionLabel(connection.data);

  return (
    <div className={cn("shrink-0 rounded-2xl border border-border bg-background/40 p-3", collapsed && "px-2")}>
      <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
        <ProfileButton className="size-9 text-xs" side={collapsed ? "right" : "top"} align="start" />
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{department}</p>
          </div>
        )}
      </div>
      {collapsed ? null : (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0 truncate text-muted-foreground">University Portal</span>
          <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium", connected ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300")}>
            <span className="relative flex size-1.5">
              {connected ? <span className="status-ping absolute inline-flex size-full rounded-full bg-emerald-400" /> : null}
              <span className={cn("relative size-1.5 rounded-full", connected ? "bg-emerald-400" : "bg-amber-400")} />
            </span>
            {connectionLabel}
          </span>
        </div>
      )}
      <Button
        variant="ghost"
        size={collapsed ? "icon" : "sm"}
        className={cn("mt-2 w-full", collapsed && "mx-auto")}
        onClick={() => {
          void signOut().then(() => router.replace("/"));
        }}
      >
        <LogOut />
        {collapsed ? <span className="sr-only">Logout</span> : "Logout"}
      </Button>
    </div>
  );
}

export function AppSidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggle = useUiStore((state) => state.toggleSidebar);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 84 : 268 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel fixed inset-y-3 left-3 z-30 hidden flex-col overflow-hidden rounded-3xl p-3 lg:flex"
    >
      <div className={cn("mb-4 flex items-center gap-2 px-1", collapsed ? "flex-col" : "justify-between")}>
        <Link href="/" aria-label="UniPilot AI home">
          <Logo collapsed={collapsed} />
        </Link>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <PanelLeft className={cn("transition", collapsed && "rotate-180")} />
        </Button>
      </div>
      <SidebarNav collapsed={collapsed} />
      <TeacherCard collapsed={collapsed} />
    </motion.aside>
  );
}
