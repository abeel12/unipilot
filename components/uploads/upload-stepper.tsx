"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const UPLOAD_STEPS = [
  "Upload File",
  "Analyze",
  "Subject",
  "Assessments",
  "Weightage",
  "University",
  "Review",
  "Upload",
  "Complete",
] as const;

export function UploadStepper({ step }: { step: number }) {
  const progress = (step / (UPLOAD_STEPS.length - 1)) * 100;
  return (
    <div className="glass-panel rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
        <div>
          <p className="text-xs text-muted-foreground">
            Step {step + 1} of {UPLOAD_STEPS.length}
          </p>
          <p className="font-medium">{UPLOAD_STEPS[step]}</p>
        </div>
        <p className="text-sm text-primary">{Math.round(progress)}%</p>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-secondary lg:hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <ol className="hidden gap-2 lg:grid lg:grid-cols-9">
        {UPLOAD_STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label} className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border text-xs transition",
                    done && "border-primary bg-primary text-primary-foreground",
                    current && "border-primary text-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_18%,transparent)]",
                    !done && !current && "border-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
                {index < UPLOAD_STEPS.length - 1 ? <span className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} /> : null}
              </div>
              <p className={cn("mt-2 truncate text-[11px]", current ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
