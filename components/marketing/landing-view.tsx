"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AcademicNetwork } from "./academic-network";
import { AuthActions, useAccountEntryHref } from "./site-header";

const FEATURES = [
  { title: "AI marks upload", text: "Bring in an Excel, CSV, PDF, or DOCX marksheet. UniPilot treats that file as the start of a review, not an automatic send." },
  { title: "Smart subject detection", text: "It looks for the course code, name, semester, and section. CS-301 Artificial Intelligence, BSCS 5A is the kind of match it proposes." },
  { title: "Assessment detection", text: "Assignments, quizzes, projects, presentations, midterms, and finals are read from the columns and headings in the file." },
  { title: "Automatic weightage detection", text: "Weightage already in the document is kept. If Assignment 3 is the missing 5%, UniPilot asks only for that piece." },
  { title: "University section preparation", text: "Document assessments are compared with portal sections. A section that already exists is not created again." },
  { title: "Teacher review and approval", text: "The final screen shows exactly what will happen. Nothing important is submitted until you confirm it." },
  { title: "Upload history", text: "Each completed review stays on a record: course, assessments, student count, and the result you approved." },
  { title: "University connection", text: "Portal status lives on its own page. The assistant can describe that status. It never asks for the portal password." },
];

const STEPS = [
  { title: "Upload", text: "A teacher adds the academic document." },
  { title: "Understand", text: "AI reads subject, students, assessments, marks, maximum marks, and weightage." },
  { title: "Validate", text: "Missing students, bad marks, and incomplete weightage are called out." },
  { title: "Review", text: "You check the plan before any university change." },
  { title: "Automate", text: "UniPilot prepares the portal sections and the mark entries you approved." },
  { title: "Verify", text: "The result is checked and written to upload history." },
];

const STAGES = [
  { title: "CS301_Marks.xlsx", lines: ["Marks file received", "BSCS 5A · 42 students"] },
  { title: "AI analysis", lines: ["CS-301 — Artificial Intelligence", "6 assessments detected"] },
  { title: "Weightage", lines: ["95% detected in the file", "Assignment 3 is the missing 5%"] },
  { title: "Teacher review", lines: ["Subject confirmed", "Waiting for your approval"] },
  { title: "University setup", lines: ["Midterm and Final already exist", "4 sections will be created"] },
  { title: "Upload complete", lines: ["42 / 42 students", "Recorded in upload history"] },
];

const QUESTIONS = [
  ["What is UniPilot AI?", "An assistant for university faculty. It turns a marksheet into a structured review of the course, assessments, students, and the portal steps around an upload."],
  ["Can UniPilot read Excel and PDF marksheets?", "Yes. The upload flow accepts Excel, CSV, PDF, and DOCX, then looks for the subject, students, assessments, marks, and weightage."],
  ["Does AI automatically submit grades?", "No. UniPilot prepares the action. The upload starts only after you confirm the subject, the weightage, and the sections."],
  ["What happens if weightage is missing?", "Found weightage is kept. UniPilot asks only for the missing items, and the total must be exactly 100% before you can approve."],
  ["Can it identify subjects automatically?", "It proposes a match, such as CS-301 Artificial Intelligence. If the file could belong to more than one subject, it waits for you to choose."],
  ["Can it work with existing university software?", "It sits beside the portal. Sections that already exist, such as Midterm and Final, are left in place."],
  ["Does the teacher review changes first?", "Yes. The last step lists exactly what will be created and what will be filled. You approve that list yourself."],
];

function Block({
  id,
  eyebrow,
  title,
  text,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  text?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 py-16 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45 }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold sm:text-4xl">{title}</h2>
        {text ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{text}</p> : null}
        <div className="mt-8">{children}</div>
      </motion.div>
    </section>
  );
}

export function LandingView() {
  const [stage, setStage] = useState(0);
  const [tab, setTab] = useState("Dashboard");
  const [openFaq, setOpenFaq] = useState(0);
  const entryHref = useAccountEntryHref();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setStage((value) => (value + 1) % STAGES.length), 2800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <section id="hero" className="relative scroll-mt-28 overflow-hidden py-14 md:py-20">
        <AcademicNetwork className="pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/88 to-background/35" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Your AI copilot for university work</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold sm:text-6xl">Your university work. Automated by AI.</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              UniPilot AI helps faculty turn marksheets, academic documents, and repetitive portal work into safe, reviewable workflows. Upload. Review. Approve.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild>
                <Link href={entryHref}>Get started</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="#how-it-works" onClick={(event) => {
                  event.preventDefault();
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.history.replaceState(null, "", "#how-it-works");
                }}>See how it works</a>
              </Button>
            </div>
          </div>
          <div className="glass-panel rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Upload marks</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                <span className="relative flex size-1.5">
                  <span className="status-ping absolute inline-flex size-full rounded-full bg-primary" />
                  <span className="relative size-1.5 rounded-full bg-primary" />
                </span>
                Ready for review
              </span>
            </div>
            <p className="mt-4 text-lg font-semibold">CS-301 Artificial Intelligence</p>
            <p className="text-sm text-muted-foreground">BSCS 5A · 42 students</p>
            <ul className="mt-5 space-y-2 text-sm">
              {["Document analyzed", "6 assessments detected", "Weightage found", "42 students detected"].map((item) => (
                <li key={item} className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2">
                  <Check className="size-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Save time", "Reduce repetitive marks entry and portal clicks."],
          ["Stay in control", "AI prepares the action. You approve the change."],
          ["Understand documents", "Spreadsheets become a course, assessments, and marks."],
          ["Work beside the portal", "UniPilot is built to sit next to university software."],
        ].map(([title, text]) => (
          <article key={title} className="glass-panel rounded-3xl p-5 transition hover:-translate-y-0.5">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>

      <Block id="features" eyebrow="Features" title="Everything faculty need in one AI workspace" text="These tools open after you sign in. The public page only shows how they fit a real course.">
        <div className="grid gap-3 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="glass-panel rounded-3xl p-5 transition hover:-translate-y-0.5">
              <Sparkles className="size-4 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
            </article>
          ))}
        </div>
      </Block>

      <Block id="how-it-works" eyebrow="How it works" title="From marksheet to university portal in a few steps">
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-3xl border border-border bg-background/40 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-primary">Step {index + 1}</p>
              <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </Block>

      <Block id="workflow" eyebrow="AI workflow" title="One file, reviewed before it reaches the portal" text="CS301_Marks.xlsx moves through analysis, a missing-weightage check, your review, then the university setup.">
        <div className="glass-panel min-h-56 rounded-3xl p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {STAGES.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setStage(index)}
                className={index === stage ? "rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground" : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={STAGES[stage].title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
            >
              <h3 className="text-2xl font-semibold">{STAGES[stage].title}</h3>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {STAGES[stage].lines.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </Block>

      <Block eyebrow="Document intelligence" title="The file becomes a grading plan">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            [FileSpreadsheet, "Excel and CSV", "A1 | A2 | Mid | Final", "Assignment 1, Assignment 2, Midterm, Final"],
            [FileText, "PDF reports", "CS-301 · 42 rows", "Course, roster, and marks in one review"],
            [Upload, "DOCX documents", "Project 15% · Final 40%", "Weightage pulled out of the prose"],
          ].map(([Icon, title, from, to]) => (
            <article key={String(title)} className="glass-panel rounded-3xl p-5">
              <Icon className="size-5 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{String(title)}</h3>
              <p className="mt-3 font-mono text-xs text-muted-foreground">{String(from)}</p>
              <p className="mt-2 text-sm">{String(to)}</p>
            </article>
          ))}
        </div>
      </Block>

      <Block eyebrow="Teacher control" title="AI prepares. Teachers decide.">
        <div className="glass-panel max-w-xl rounded-3xl p-6">
          <p className="text-sm text-muted-foreground">Detected for CS-301</p>
          <ul className="mt-4 space-y-2 text-sm">
            {["Assignment 1 — 5%", "Assignment 2 — 5%", "Project — 15%", "Midterm — 30%", "Final — 40%"].map((row) => (
              <li key={row} className="flex justify-between rounded-xl border border-border px-3 py-2">
                <span>{row.split(" — ")[0]}</span>
                <span className="text-muted-foreground">{row.split(" — ")[1]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">Total detected: 95%. Missing: Assignment 3.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-xl border border-border px-3 py-2 text-sm">Enter weightage</span>
            <span className="rounded-xl border border-border px-3 py-2 text-sm">Review</span>
            <span className="rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">Approve</span>
          </div>
        </div>
      </Block>

      <Block eyebrow="University connection" title="The portal stays on its own page">
        <div className="glass-panel max-w-md rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">University portal</p>
          <h3 className="mt-2 text-2xl font-semibold">ABC University</h3>
          <div className="mt-5 space-y-3 text-sm">
            <p className="flex items-center justify-between"><span>Status</span><span className="text-emerald-500">Connected</span></p>
            <p className="flex items-center justify-between"><span>Session</span><span>Active</span></p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Teachers connect the university portal separately from the assistant. A portal password is never shown here.</p>
        </div>
      </Block>

      <Block id="security" eyebrow="Security" title="Academic data deserves serious handling">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Teacher-controlled actions", "An upload does not start until the review is approved."],
            ["Secure authentication", "The UniPilot account is separate from the university login."],
            ["Private faculty records", "Courses, students, and uploads belong to the signed-in teacher."],
            ["Permission-aware access", "Each account sees its own workspace rows."],
            ["University session isolation", "Portal status is not mixed into the assistant transcript."],
            ["Audit history", "Completed uploads and connection checks stay in the activity record."],
          ].map(([title, text]) => (
            <article key={title} className="rounded-3xl border border-border bg-background/40 p-5">
              <ShieldCheck className="size-4 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </Block>

      <Block eyebrow="Workspace" title="The desk you open after login">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="size-2.5 rounded-full bg-rose-400/80" />
            <span className="size-2.5 rounded-full bg-amber-400/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
            <span className="ml-2 text-xs text-muted-foreground">UniPilot workspace</span>
          </div>
          <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
            {["Dashboard", "AI Assistant", "Upload Marks", "University Connection"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={tab === item ? "rounded-xl bg-accent px-3 py-1.5 text-sm" : "rounded-xl px-3 py-1.5 text-sm text-muted-foreground"}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-[180px_1fr]">
            <div className="hidden space-y-2 text-sm text-muted-foreground sm:block">
              {["Dashboard", "AI Assistant", "Upload Marks", "Courses", "Students"].map((item) => (
                <p key={item} className={item === tab ? "text-foreground" : undefined}>{item}</p>
              ))}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{tab}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {tab === "Dashboard" && "6 courses · 248 students · CS-301 still open on Assignment 3."}
                {tab === "AI Assistant" && "Ask about missing marks or recent uploads. Credentials stay out of the chat."}
                {tab === "Upload Marks" && "Nine review steps, then your confirmation, then the portal action."}
                {tab === "University Connection" && "ABC University · Connected · session active. No password on this screen."}
              </p>
            </div>
          </div>
        </div>
      </Block>

      <section id="pricing" className="scroll-mt-28 py-16 md:py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Pricing</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold sm:text-4xl">Three memberships for the faculty desk</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          A try is one guided mark upload. Start with 3 free tries on a course like CS-301, then keep the desk that matches your teaching load.
        </p>
        <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-3">
          {[
            {
              name: "Test membership",
              price: "$0",
              mark: "03",
              cadence: "free tries",
              detail: "See the upload review before you pay.",
              points: ["3 mark-upload reviews", "AI assistant on those reviews", "Weightage must total 100%", "You confirm the subject first"],
              label: "Start 3 free tries",
              tone: "trial",
            },
            {
              name: "Faculty",
              price: "$20",
              mark: "20",
              cadence: "per month",
              detail: "The everyday desk for one teacher after the free tries.",
              points: ["Courses, assessments, and rosters", "Uploads beyond the 3 tries", "History and the activity log", "Same confirmation on every send"],
              label: "Choose Faculty",
              tone: "daily",
            },
            {
              name: "Campus",
              price: "$30",
              mark: "30",
              cadence: "per month",
              detail: "The full sample workspace: 6 courses and 248 students.",
              points: ["Everything in Faculty", "Midterm, final, and assignments", "University connection status", "Workspace opens after login"],
              label: "Choose Campus",
              tone: "campus",
            },
          ].map((plan) => (
            <article
              key={plan.name}
              className={
                plan.tone === "daily"
                  ? "relative flex flex-col overflow-hidden rounded-3xl border border-primary/50 bg-card shadow-[0_24px_60px_-36px_var(--glow)] lg:-translate-y-3"
                  : "relative flex flex-col overflow-hidden rounded-3xl border border-border bg-background/40"
              }
            >
              <div className="flex items-stretch">
                <div className="grid w-24 shrink-0 place-items-center border-r border-dashed border-border bg-accent/40 px-2 text-center">
                  <div>
                    <p className="text-3xl font-semibold tracking-tight text-primary">{plan.mark}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{plan.tone === "trial" ? "tries" : "desk"}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {plan.tone === "daily" ? (
                    <span className="mb-2 w-fit rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">Everyday plan</span>
                  ) : null}
                  <p className="text-sm text-muted-foreground">{plan.name}</p>
                  <p className="mt-1 text-4xl font-semibold">{plan.price}</p>
                  <p className="text-sm text-primary">{plan.cadence}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{plan.detail}</p>
                </div>
              </div>
              <ul className="flex-1 space-y-2 border-t border-border px-5 py-4 text-sm">
                {plan.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              {plan.tone === "campus" ? (
                <div className="flex items-center gap-2 px-5 pb-2 text-[11px] text-muted-foreground">
                  {["CS-301", "CS-305", "SE-401", "CS-410", "CS-302", "CS-401"].map((code) => (
                    <span key={code} className="rounded-full border border-border px-2 py-0.5">{code}</span>
                  ))}
                </div>
              ) : null}
              <div className="p-5 pt-2">
                <Button className="w-full" variant={plan.tone === "daily" ? "default" : "outline"} asChild>
                  <Link href={entryHref}>{plan.label}</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Block id="faq" eyebrow="FAQ" title="Questions faculty ask first">
        <div className="space-y-2">
          {QUESTIONS.map(([question, answer], index) => {
            const open = openFaq === index;
            return (
              <div key={question} className="overflow-hidden rounded-2xl border border-border bg-card/60">
                <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium" aria-expanded={open} onClick={() => setOpenFaq(open ? -1 : index)}>
                  {question}
                  <span className="text-muted-foreground">{open ? "−" : "+"}</span>
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                      <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{answer}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Block>

      <section className="glass-panel mb-6 rounded-3xl p-6 sm:p-10">
        <h2 className="max-w-2xl text-3xl font-semibold sm:text-4xl">Spend less time entering data. Spend more time teaching.</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Let UniPilot handle the repetitive university workflow while you stay in control.
        </p>
        <div className="mt-6">
          <AuthActions />
        </div>
      </section>
    </div>
  );
}
