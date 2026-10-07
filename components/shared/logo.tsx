import { cn } from "@/lib/utils";

export function Logo({ collapsed = false, light = false }: { collapsed?: boolean; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", light && "text-white")}>
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-xl bg-[#101426] text-white shadow-[0_0_24px_-8px_var(--glow)]">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path d="M3 16c2.2-4.2 4.6-6.2 9-6.2S18.8 11.8 21 16" fill="none" stroke="#8eb6ff" strokeWidth="1.4" />
          <path d="M6.5 16c1.3-2.2 2.7-3.2 5.5-3.2s4.2 1 5.5 3.2" fill="none" stroke="#8eb4ff" strokeWidth="1.5" />
          <circle cx="12" cy="8.2" r="1.25" fill="#8eb4ff" />
        </svg>
      </span>
      {collapsed ? null : (
        <span className="min-w-0 leading-tight">
          <span className="block text-sm font-semibold tracking-tight">UniPilot AI</span>
          <span className={cn("block text-[11px]", light ? "text-white/70" : "text-muted-foreground")}>
            AI copilot
          </span>
        </span>
      )}
    </div>
  );
}
