"use client";

import { Check } from "lucide-react";
import { summarizeWeightage } from "@/features/upload/weightage";
import { cn } from "@/lib/utils";
import type { DetectedAssessment } from "@/types";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";

export function WeightageEditor({
  items,
  editing,
  onEdit,
  onChange,
  onConfirm,
}: {
  items: DetectedAssessment[];
  editing: boolean;
  onEdit: () => void;
  onChange: (id: string, value: number | null) => void;
  onConfirm: () => void;
}) {
  const summary = summarizeWeightage(items);
  const detectedComplete =
    summary.valid && !editing && items.every((item) => item.source === "Document" && item.weightage != null);

  return (
    <div className="space-y-4">
      {detectedComplete ? (
        <section className="glass-panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Weightage detected</p>
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                <span>{item.name}</span>
                <span className="inline-flex items-center gap-2 font-medium">
                  {item.weightage}% <Check className="size-4 text-primary" />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm">Total: 100%</p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Valid <Check className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Weightage was detected from your document.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={onEdit}>
              Edit Weightage
            </Button>
            <Button onClick={onConfirm}>Confirm & Continue</Button>
          </div>
        </section>
      ) : (
        <section className="glass-panel rounded-3xl p-5">
          {summary.mode === "none" ? <p className="text-sm">No weightage was found in this document.</p> : null}
          {summary.mode === "partial" ? (
            <p className="text-sm text-muted-foreground">Only the missing weightage needs your input. Detected values stay as they are.</p>
          ) : null}
          {summary.mode === "invalid" || summary.total > 100 ? (
            <div className="mb-4">
              <ErrorState
                title="Weightage Validation Failed"
                message={`Current total is ${summary.total}%. Required total is 100%.`}
                shake
              />
            </div>
          ) : null}
          <ul className="mt-4 space-y-3">
            {items.map((item) => {
              const locked = item.weightage != null && item.source === "Document" && summary.mode === "partial" && !editing;
              const bad = summary.total > 100 ? item.weightage != null && !locked : item.weightage == null;
              return (
                <li key={item.id} className="grid items-center gap-3 rounded-2xl border border-border px-3 py-3 sm:grid-cols-[1fr_140px]">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{locked ? "Detected from document" : "Required"}</p>
                  </div>
                  {locked ? (
                    <p className="inline-flex items-center justify-end gap-2 text-sm font-medium">
                      {item.weightage}% <Check className="size-4 text-primary" />
                    </p>
                  ) : (
                    <label className="flex items-center justify-end gap-2 text-sm">
                      <span className="sr-only">{item.name} weightage</span>
                      <input
                        inputMode="numeric"
                        value={item.weightage ?? ""}
                        onChange={(event) => {
                          const raw = event.target.value.trim();
                          if (raw === "") onChange(item.id, null);
                          else if (/^\d{1,3}$/.test(raw)) onChange(item.id, Number(raw));
                        }}
                        className={cn(
                          "h-10 w-24 rounded-xl border bg-background/60 px-3 text-right outline-none focus:ring-2 focus:ring-ring/40",
                          bad ? "border-rose-500" : "border-border",
                        )}
                      />
                      %
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-5 rounded-2xl bg-secondary/70 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Current total</span>
              <span className={cn("font-semibold", summary.valid ? "text-primary" : summary.total > 100 ? "text-rose-500" : "")}>
                {summary.total}% {summary.valid ? "✓" : ""}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-muted-foreground">
              <span>{summary.remaining > 0 ? `${summary.remaining}% remaining` : summary.remaining < 0 ? `${Math.abs(summary.remaining)}% over` : "Balanced"}</span>
              <span>Required 100%</span>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={onConfirm} disabled={!summary.valid}>
              Continue
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
