"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface Session {
  email: string;
  remember: boolean;
}

interface SessionState {
  session: Session | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (email: string, remember: boolean) => void;
  logout: () => void;
}

const memory = new Map<string, string>();

const browserStorage = {
  getItem: (name: string) => {
    if (typeof window === "undefined") return memory.get(name) ?? null;
    return window.localStorage.getItem(name) ?? window.sessionStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (typeof window === "undefined") {
      memory.set(name, value);
      return;
    }
    const remember = (JSON.parse(value) as { state?: { session?: Session | null } }).state?.session?.remember;
    if (remember === false) {
      window.sessionStorage.setItem(name, value);
      window.localStorage.removeItem(name);
    } else {
      window.localStorage.setItem(name, value);
      window.sessionStorage.removeItem(name);
    }
  },
  removeItem: (name: string) => {
    memory.delete(name);
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      login: (email, remember) => set({ session: { email, remember } }),
      logout: () => set({ session: null }),
    }),
    {
      name: "unipilot-session",
      storage: createJSONStorage(() => browserStorage),
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => () => undefined,
    },
  ),
);
