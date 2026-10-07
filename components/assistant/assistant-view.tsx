"use client";

import { motion } from "framer-motion";
import { Mic, Paperclip, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AIResponseCard } from "@/components/ai/response-cards";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { buildAssistantReply } from "@/features/assistant/replies";
import { fileKind, uid } from "@/lib/utils";
import type { AIMessage } from "@/types";

const SUGGESTIONS = [
  "Upload these marks for Artificial Intelligence.",
  "Show my current courses.",
  "Which students are missing marks?",
  "Create assessment sections from this file.",
  "Check my university connection.",
  "Show my recent uploads.",
];

export function AssistantView() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ask me to manage your university academic workflow. I can detect subjects, assessments, and weightage, then prepare an upload for your review.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const started = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  async function send(text: string, attachment?: string | null) {
    const content = text.trim();
    if (!content && !attachment) return;
    const user: AIMessage = {
      id: uid("user"),
      role: "user",
      content: content || `Attached ${attachment}`,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, user]);
    setDraft("");
    setTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const reply = await buildAssistantReply(content, attachment ?? undefined);
    setMessages((current) => [...current, reply]);
    setTyping(false);
    setFileName(null);
  }

  useEffect(() => {
    const query = params.get("q");
    if (query && !started.current) {
      started.current = true;
      void send(query);
    }
  }, [params]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">UniPilot AI Assistant</h1>
        <p className="text-sm text-muted-foreground">Ask me to manage your university academic workflow.</p>
      </div>
      <div className="flex-1 space-y-4 pb-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={message.role === "user" ? "ml-auto max-w-[85%]" : "max-w-full"}
          >
            <div className={message.role === "user" ? "rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground" : "space-y-3"}>
              <p className={message.role === "assistant" ? "text-sm leading-6" : ""}>{message.content}</p>
              {message.cards?.map((card, index) => (
                <AIResponseCard key={`${message.id}-${index}`} card={card} onAction={() => setMessages((current) => current.slice(0, -1))} />
              ))}
            </div>
          </motion.div>
        ))}
        {typing ? (
          <div className="flex w-16 items-center justify-center gap-1 rounded-2xl bg-secondary px-3 py-3" aria-label="UniPilot is writing">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="size-1.5 rounded-full bg-muted-foreground"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
              />
            ))}
          </div>
        ) : null}
        <div ref={bottom} />
      </div>
      {messages.length < 3 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((item) => (
            <button key={item} type="button" className="rounded-full border border-border bg-card/50 px-3 py-1.5 text-left text-xs hover:border-primary/40" onClick={() => void send(item, fileName)}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="glass-panel sticky bottom-20 z-10 rounded-3xl p-3 lg:bottom-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft, fileName);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (!file || !fileKind(file.name)) return;
          setFileName(file.name);
        }}
      >
        {fileName ? <p className="mb-2 text-xs text-muted-foreground">Attached: {fileName}</p> : null}
        <div className="flex items-end gap-2">
          <label className="grid size-10 cursor-pointer place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground">
            <Paperclip className="size-4" />
            <span className="sr-only">Upload Excel, CSV, PDF, or DOCX</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.docx"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && fileKind(file.name)) setFileName(file.name);
              }}
            />
          </label>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft, fileName);
              }
            }}
            rows={1}
            placeholder="Ask UniPilot to do something..."
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none"
          />
          <Tooltip label="Voice input is coming soon">
            <span className="inline-flex">
              <Button type="button" variant="outline" size="icon" aria-label="Voice input placeholder" disabled>
                <Mic />
              </Button>
            </span>
          </Tooltip>
          <Button type="submit" size="icon" aria-label="Send" disabled={typing || (!draft.trim() && !fileName)}>
            <Send />
          </Button>
        </div>
      </form>
    </div>
  );
}
