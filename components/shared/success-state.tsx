"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function SuccessState({
  title,
  message,
  children,
  primary,
  secondary,
  onPrimary,
  onSecondary,
}: {
  title: string;
  message?: string;
  children?: React.ReactNode;
  primary?: string;
  secondary?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel mx-auto max-w-2xl rounded-3xl px-6 py-10 text-center"
    >
      <div className="relative mx-auto mb-5 grid size-20 place-items-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-primary/20"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        />
        <svg viewBox="0 0 72 72" className="relative size-16" aria-hidden>
          <motion.circle
            cx="36"
            cy="36"
            r="28"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55 }}
          />
          <motion.path
            d="M22 37.5 31.5 47 50 27"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
      {children ? <div className="mt-6 text-left">{children}</div> : null}
      {primary || secondary ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {secondary ? (
            <Button variant="outline" onClick={onSecondary}>
              {secondary}
            </Button>
          ) : null}
          {primary ? <Button onClick={onPrimary}>{primary}</Button> : null}
        </div>
      ) : null}
    </motion.div>
  );
}
