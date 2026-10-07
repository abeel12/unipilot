"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { AcademicNetwork } from "@/components/marketing/academic-network";
import { ParticleField } from "@/components/shared/particle-field";

const subscribe = () => () => {};

export function AmbientBackground({ variant = "app" }: { variant?: "app" | "hero" }) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = !mounted || resolvedTheme !== "light";

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background" aria-hidden>
      {variant === "hero" ? (
        <AcademicNetwork className="absolute inset-0" />
      ) : dark ? (
        <ParticleField className="absolute inset-0" intensity={0.85} />
      ) : (
        <div className="absolute inset-0">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan/20 blur-3xl" />
          <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-violet/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-96 rounded-full bg-mint/20 blur-3xl" />
        </div>
      )}
      <div
        className={
          variant === "hero"
            ? "absolute inset-0 bg-gradient-to-b from-background/15 via-background/35 to-background/50"
            : "absolute inset-0 bg-gradient-to-b from-background/20 via-background/62 to-background"
        }
      />
    </div>
  );
}
