"use client";

import { Button } from "@/components/ui/button";

export default function PortalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="glass-panel rounded-3xl p-8">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">The page could not finish loading. Your university credentials were not involved.</p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
