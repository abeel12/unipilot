"use client";

import Link from "next/link";
import { FileSpreadsheet, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import type { AICard } from "@/types";

export function AIResponseCard({ card, onAction }: { card: AICard; onAction?: (id: string) => void }) {
  if (card.type === "subject") {
    return (
      <article className="rounded-2xl border border-border bg-background/40 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Subject detected</p>
        <h3 className="mt-2 text-xl font-semibold">{card.code}</h3>
        <p>{card.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {card.semester}
          {card.section}
        </p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-semibold text-primary">{card.confidence}%</span>
        </div>
      </article>
    );
  }

  if (card.type === "assessments") {
    return (
      <article className="rounded-2xl border border-border bg-background/40 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Assessments detected</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {card.items.map((item) => (
            <li key={item.name} className="rounded-xl border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.confidence}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.type} · Max {item.maxMarks} · {item.weightage == null ? "Weightage missing" : `${item.weightage}%`}
              </p>
            </li>
          ))}
        </ul>
      </article>
    );
  }

  if (card.type === "weightage") {
    return (
      <article className="rounded-2xl border border-border bg-background/40 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Weightage</p>
        <ul className="mt-3 space-y-2">
          {card.items.map((item) => (
            <li key={item.name} className="flex items-center justify-between text-sm">
              <span>{item.name}</span>
              <span>{item.weightage == null ? "Not found" : `${item.weightage}%`}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span>Total {card.total}%</span>
          <StatusBadge status={card.valid ? "Valid" : "Needs Review"} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{card.message}</p>
      </article>
    );
  }

  if (card.type === "warning") {
    return (
      <article className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <h3 className="font-semibold">{card.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{card.message}</p>
      </article>
    );
  }

  if (card.type === "error") {
    return (
      <article className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
        <h3 className="font-semibold">{card.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{card.message}</p>
      </article>
    );
  }

  if (card.type === "success") {
    return (
      <article className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <h3 className="font-semibold">{card.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{card.message}</p>
      </article>
    );
  }

  if (card.type === "confirmation") {
    return (
      <article className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
        <h3 className="font-semibold">{card.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{card.message}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {card.actions.map((action) =>
            action.href ? (
              <Button key={action.id} asChild size="sm" variant={action.id === "cancel" ? "outline" : "default"}>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button key={action.id} size="sm" variant="outline" onClick={() => onAction?.(action.id)}>
                {action.label}
              </Button>
            ),
          )}
        </div>
      </article>
    );
  }

  if (card.type === "university") {
    return (
      <article className="rounded-2xl border border-border bg-background/40 p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <ShieldCheck className="size-3.5" /> University status
        </div>
        <h3 className="mt-2 font-semibold">{card.university}</h3>
        <p className="text-sm text-muted-foreground">{card.account}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge status={card.status} pulse={card.status === "Connected"} />
          <StatusBadge status={card.session} />
        </div>
      </article>
    );
  }

  if (card.type === "progress") {
    return (
      <article className="rounded-2xl border border-border bg-background/40 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{card.label}</span>
          <span>{card.percent}%</span>
        </div>
        <Progress value={card.percent} />
        <p className="mt-2 text-xs text-muted-foreground">{card.detail}</p>
      </article>
    );
  }

  if (card.type === "file") {
    return (
      <article className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
          <FileSpreadsheet className="size-4" />
        </span>
        <div>
          <p className="font-medium">{card.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(card.size)} · {card.status}
          </p>
        </div>
      </article>
    );
  }

  if (card.type === "courses") {
    return (
      <article className="grid gap-2">
        {card.items.map((item) => (
          <div key={item.code} className="rounded-xl border border-border bg-background/40 px-3 py-2">
            <p className="font-medium">
              {item.code} — {item.name}
            </p>
            <p className="text-xs text-muted-foreground">{item.meta}</p>
          </div>
        ))}
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-border bg-background/40 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{card.title}</p>
      <ul className="mt-3 space-y-2">
        {card.items.map((item) => (
          <li key={item.title} className="flex items-start justify-between gap-3 text-sm">
            <span>
              <span className="block font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.meta}</span>
            </span>
            {item.status ? <StatusBadge status={item.status} /> : null}
          </li>
        ))}
      </ul>
    </article>
  );
}
