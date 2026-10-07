"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { rise } from "@/lib/motion";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <motion.article variants={rise} className="glass-panel rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_var(--glow)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </motion.article>
  );
}

export function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-primary/40"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      {label}
    </Link>
  );
}
