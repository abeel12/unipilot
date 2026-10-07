"use client";

import { useEffect } from "react";

export function HashScroll() {
  useEffect(() => {
    const scroll = () => {
      const id = window.location.hash.replace("#", "");
      if (!id) return;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    scroll();
    window.addEventListener("hashchange", scroll);
    return () => window.removeEventListener("hashchange", scroll);
  }, []);

  return null;
}
