"use client";

import { motion } from "framer-motion";
import { rise, stagger } from "@/lib/motion";

export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={stagger} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={rise}>
      {children}
    </motion.div>
  );
}
