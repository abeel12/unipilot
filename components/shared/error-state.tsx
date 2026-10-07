"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title,
  message,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  shake = false,
}: {
  title: string;
  message: string;
  primary?: string;
  secondary?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  shake?: boolean;
}) {
  return (
    <motion.div
      role="alert"
      animate={shake ? { x: [0, -7, 7, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.42 }}
      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 place-items-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-200">
          <AlertTriangle className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          {primary || secondary ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {primary ? (
                <Button size="sm" onClick={onPrimary}>
                  {primary}
                </Button>
              ) : null}
              {secondary ? (
                <Button size="sm" variant="outline" onClick={onSecondary}>
                  {secondary}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
