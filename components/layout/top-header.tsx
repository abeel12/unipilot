"use client";

import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet } from "@/components/ui/sheet";
import { PAGE_META } from "@/lib/navigation";
import { greeting } from "@/lib/utils";
import { getTeacher, searchPortal } from "@/services/api";
import { useUiStore } from "@/store/ui-store";
import { SidebarNav, TeacherCard } from "./app-sidebar";
import { ProfileButton } from "./profile-button";

const NOTES = [
  { title: "Weightage still open", body: "CS-305 is waiting on a missing percentage.", time: "2h" },
  { title: "Session verified", body: "ABC University portal is active.", time: "1d" },
  { title: "Sections created", body: "SE-401 Assignment 2 is on the portal.", time: "2d" },
];

export function TopHeader() {
  const pathname = usePathname();
  const setMobileOpen = useUiStore((state) => state.setMobileOpen);
  const [searchOpen, setSearchOpen] = useState(false);
  const teacher = useQuery({ queryKey: ["teacher"], queryFn: getTeacher });
  const meta = PAGE_META[pathname] ?? inferMeta(pathname);
  const hello = pathname === "/dashboard" ? (teacher.data ? greeting(teacher.data.name) : null) : meta.subtitle;

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 md:px-6 lg:px-8">
      <div className="glass-panel flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 md:px-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold md:text-base">{meta.title}</p>
          {hello ? <p className="truncate text-xs text-muted-foreground">{hello}</p> : null}
        </div>
        <Button variant="outline" className="hidden h-10 min-w-0 max-w-56 flex-1 justify-start overflow-hidden text-muted-foreground lg:flex" onClick={() => setSearchOpen(true)}>
          <Search className="shrink-0" />
          <span className="truncate">Search courses, students...</span>
        </Button>
        <Button variant="outline" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
          <Search />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Notifications">
              <Bell />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            {NOTES.map((note) => (
              <DropdownMenuItem key={note.title} className="items-start">
                <span>
                  <span className="block font-medium">{note.title}</span>
                  <span className="block text-xs text-muted-foreground">{note.body}</span>
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">{note.time}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
        <ProfileButton />
      </div>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

function inferMeta(pathname: string) {
  if (pathname.startsWith("/courses/")) return { title: "Course", subtitle: "Courses / Details" };
  if (pathname.startsWith("/students/")) return { title: "Student", subtitle: "Students / Profile" };
  if (pathname.startsWith("/history/")) return { title: "Upload details", subtitle: "History / Record" };
  return { title: "UniPilot AI", subtitle: "AI Assistant for University Faculty" };
}

export function MobileDrawer() {
  const open = useUiStore((state) => state.mobileOpen);
  const setOpen = useUiStore((state) => state.setMobileOpen);
  return (
    <Sheet open={open} onOpenChange={setOpen} title="Navigation">
      <Link href="/" aria-label="UniPilot AI home" onClick={() => setOpen(false)}>
        <Logo />
      </Link>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <SidebarNav onNavigate={() => setOpen(false)} />
        <TeacherCard />
      </div>
    </Sheet>
  );
}

function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchPortal>>>([]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  useEffect(() => {
    let cancelled = false;
    searchPortal(query).then((items) => {
      if (!cancelled) setResults(items);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const grouped = useMemo(() => results, [results]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-[#070816]/55 px-4 pt-[12vh] backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div
        role="dialog"
        aria-label="Search UniPilot"
        className="glass-panel w-full max-w-xl rounded-2xl p-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 rounded-xl border border-border px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages, courses, students"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="mt-2 max-h-80 overflow-auto">
          {grouped.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches yet.</p>
          ) : (
            grouped.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-accent"
              >
                <span>
                  <span className="block font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.meta}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.kind}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
