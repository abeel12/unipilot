import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-border bg-secondary text-secondary-foreground",
        success: "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        warning: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-200",
        danger: "border-rose-500/25 bg-rose-500/12 text-rose-700 dark:text-rose-200",
        info: "border-cyan-500/25 bg-cyan-500/12 text-cyan-800 dark:text-cyan-200",
        violet: "border-violet-500/25 bg-violet-500/12 text-violet-800 dark:text-violet-200",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
