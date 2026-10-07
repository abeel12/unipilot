"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { rise } from "@/lib/motion";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <motion.div variants={rise} initial="hidden" animate="show" className="glass-panel flex flex-col items-center rounded-3xl px-6 py-16 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-primary">
        <Icon className="size-6" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      {action && onAction ? (
        <Button className="mt-6" onClick={onAction}>
          {action}
        </Button>
      ) : null}
    </motion.div>
  );
}
