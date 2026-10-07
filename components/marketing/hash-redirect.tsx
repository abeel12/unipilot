"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function HashRedirect({ hash }: { hash: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/#${hash}`);
  }, [hash, router]);

  return (
    <p className="px-6 py-16 text-sm text-muted-foreground">
      <a href={`/#${hash}`}>Continue</a>
    </p>
  );
}
