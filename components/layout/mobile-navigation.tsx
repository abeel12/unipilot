"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

export function MobileNavigation() {
  const pathname = usePathname();
  const setMobileOpen = useUiStore((state) => state.setMobileOpen);
  const primary = NAV_ITEMS.filter((item) => item.mobile);

  return (
    <nav
      className="glass-panel fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl px-2 py-2 lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Mobile"
    >
      {primary.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] text-muted-foreground",
              active && "text-primary",
            )}
          >
            <Icon className="size-4" />
            <span className="truncate">{item.label.replace("AI ", "")}</span>
          </Link>
        );
      })}
      <button type="button" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] text-muted-foreground" onClick={() => setMobileOpen(true)}>
        <Menu className="size-4" />
        More
      </button>
    </nav>
  );
}
