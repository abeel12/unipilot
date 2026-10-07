import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground shadow-inner outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
