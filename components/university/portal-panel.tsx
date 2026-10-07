"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchPortalFrame, sendPortalInput } from "@/services/agent";

export function PortalPanel({ viewToken, pageLabel }: { viewToken: string; pageLabel?: string | null }) {
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [scroll, setScroll] = useState({ scrollY: 0, scrollHeight: 0, clientHeight: 0 });
  const scroller = useRef<HTMLDivElement>(null);
  const ignoreScroll = useRef(false);
  const userScroll = useRef(0);
  const scrollTimer = useRef<number | null>(null);
  const [address, setAddress] = useState("");
  const [prompt, setPrompt] = useState("");
  const [note, setNote] = useState("After the university connects, the agent learns its sections. Approve a marks file, then ask it to upload those marks. The password is not saved.");

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;
    async function refresh() {
      try {
        const frame = await fetchPortalFrame(viewToken);
        if (cancelled) return;
        setScroll({ scrollY: frame.scrollY, scrollHeight: frame.scrollHeight, clientHeight: frame.clientHeight });
        const next = URL.createObjectURL(frame.blob);
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = next;
        setFrameUrl(next);
      } catch {
        // Keep the last frame while the university page is changing.
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 800);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [viewToken]);

  useEffect(() => {
    const element = scroller.current;
    if (!element || Date.now() - userScroll.current < 700) return;
    const maxPage = Math.max(scroll.scrollHeight - scroll.clientHeight, 1);
    const maxBar = Math.max(element.scrollHeight - element.clientHeight, 1);
    const next = (scroll.scrollY / maxPage) * maxBar;
    if (Math.abs(element.scrollTop - next) < 4) return;
    ignoreScroll.current = true;
    element.scrollTop = next;
    ignoreScroll.current = false;
  }, [scroll]);

  async function openAddress(event: FormEvent) {
    event.preventDefault();
    try {
      setNote(await sendPortalInput(viewToken, { kind: "open", address }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The university page did not open.");
    }
  }

  async function runPrompt(event: FormEvent) {
    event.preventDefault();
    try {
      setNote("Working on the university page...");
      setNote(await sendPortalInput(viewToken, { kind: "prompt", prompt }));
      setPrompt("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "That prompt could not be followed.";
      setNote(message);
      toast.error(message);
    }
  }

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-background/40">
      <form className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row" onSubmit={(event) => void openAddress(event)}>
        <Input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="University web address, such as https://portal.university.edu"
          aria-label="University web address"
        />
        <Button type="submit" className="sm:w-28">Open</Button>
      </form>
      <div
        ref={scroller}
        aria-label="University page scroll"
        className="max-h-[32rem] overflow-y-scroll bg-black/40 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-400 [&::-webkit-scrollbar-track]:bg-zinc-800"
        onScroll={(event) => {
          if (ignoreScroll.current) return;
          const element = event.currentTarget;
          userScroll.current = Date.now();
          const maxBar = Math.max(element.scrollHeight - element.clientHeight, 1);
          const maxPage = Math.max(scroll.scrollHeight - scroll.clientHeight, 0);
          const top = (element.scrollTop / maxBar) * maxPage;
          if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
          scrollTimer.current = window.setTimeout(() => {
            void sendPortalInput(viewToken, { kind: "scroll", y: top }).catch(() => undefined);
          }, 80);
        }}
      >
        {frameUrl ? (
          // The frame is a live local screenshot, so the Next image optimizer cannot load it.
          // eslint-disable-next-line @next/next/no-img-element
          <div style={{ height: Math.max(512, scroll.clientHeight > 0 ? Math.round(512 * (scroll.scrollHeight / scroll.clientHeight)) : 512) }}>
          <img
            src={frameUrl}
            alt="University portal"
            className="sticky top-0 block h-auto w-full cursor-pointer"
            onClick={(event) => {
              const image = event.currentTarget;
              const x = (event.nativeEvent.offsetX / image.clientWidth) * image.naturalWidth;
              const y = (event.nativeEvent.offsetY / image.clientHeight) * image.naturalHeight;
              void sendPortalInput(viewToken, { kind: "click", x, y }).catch((error: unknown) => {
                toast.error(error instanceof Error ? error.message : "The click did not reach the university page.");
              });
            }}
            onKeyDown={(event) => {
              const key = event.key;
              if (key === "Enter" || key === "Tab" || key === "Backspace" || key === "Escape" || key.startsWith("Arrow")) {
                event.preventDefault();
                void sendPortalInput(viewToken, { kind: "press", key });
                return;
              }
              if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
                event.preventDefault();
                void sendPortalInput(viewToken, { kind: "type", text: key });
              }
            }}
            tabIndex={0}
          />
          </div>
        ) : (
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">Opening the university panel...</div>
        )}
      </div>
      <form className="flex flex-col gap-2 border-t border-border p-3 sm:flex-row" onSubmit={(event) => void runPrompt(event)}>
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Click on Course Management, then click on a course, and tell me the assessments"
          aria-label="Ask the agent"
          className="min-h-16"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" variant="outline" className="sm:w-36">Ask agent</Button>
      </form>
      <p className="px-3 pb-3 text-sm text-foreground">{note}</p>
    </div>
  );
}
