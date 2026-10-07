"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { hydrateAuthSession } from "@/services/auth";
import { useSessionStore } from "@/store/session-store";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme === "light" ? "light" : "dark"} position="top-right" richColors />;
}

function SessionHydration() {
  useEffect(() => {
    let active = true;
    const finish = async () => {
      await hydrateAuthSession();
      if (active) useSessionStore.getState().setHasHydrated(true);
    };
    if (useSessionStore.persist.hasHydrated()) void finish();
    const unsubscribe = useSessionStore.persist.onFinishHydration(() => {
      void finish();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <MotionConfig reducedMotion="user">
            <SessionHydration />
            {children}
            <ThemedToaster />
          </MotionConfig>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
