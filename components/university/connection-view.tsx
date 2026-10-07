"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/shared/confirmation-modal";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { liveUniversityConnection } from "@/lib/university-connection";
import { formatDate } from "@/lib/utils";
import {
  disconnectUniversityAgent,
  openUniversityPortal,
  pairAgent,
  readAgentHealth,
  readAgentStatus,
  readUniversityCourses,
  startUniversityConnection,
  verifyUniversitySession,
  type AgentCourse,
  type AgentSnapshot,
} from "@/services/agent";
import { getUniversityConnection } from "@/services/api";
import { PortalPanel } from "./portal-panel";

const WAITING = new Set(["BROWSER_OPENING", "LMS_OPENED", "WAITING_FOR_LOGIN", "READING"]);

export function ConnectionView() {
  const queryClient = useQueryClient();
  const connection = useQuery({ queryKey: ["connection"], queryFn: getUniversityConnection });
  const agent = useQuery({ queryKey: ["agent-health"], queryFn: readAgentHealth, refetchInterval: 4000, retry: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [live, setLive] = useState<AgentSnapshot | null>(null);
  const [courses, setCourses] = useState<AgentCourse[] | null>(null);

  const watching = live ? WAITING.has(live.phase) : false;

  useEffect(() => {
    if (!agent.data?.running || !agent.data.paired) return;
    const timer = window.setInterval(() => {
      void readAgentStatus()
        .then((status) => setLive(status))
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [agent.data?.running, agent.data?.paired]);

  useEffect(() => {
    if (!watching) return;
    const timer = window.setInterval(() => {
      void readAgentStatus()
        .then((status) => {
          setLive(status);
          if (status.courses) setCourses(status.courses);
          if (!WAITING.has(status.phase)) {
            void queryClient.invalidateQueries({ queryKey: ["connection"] });
            void queryClient.invalidateQueries({ queryKey: ["activity"] });
          }
        })
        .catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [watching, queryClient]);

  async function run(label: string, task: () => Promise<AgentSnapshot | null | undefined>) {
    setBusy(label);
    try {
      const next = await task();
      if (next) {
        setLive(next);
        if (next.courses) setCourses(next.courses);
      }
      await queryClient.invalidateQueries({ queryKey: ["connection"] });
      await queryClient.invalidateQueries({ queryKey: ["agent-health"] });
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The university request failed.");
    } finally {
      setBusy(null);
    }
  }

  if (connection.isLoading || !connection.data || agent.isLoading) return <Skeleton className="h-80" />;
  const data = connection.data;
  const connected = liveUniversityConnection(data);
  const expired = data.connectionMethod === "local_agent_browser" && (data.status === "Session Expired" || live?.phase === "SESSION_EXPIRED");
  const agentRunning = agent.data?.running === true;
  const agentPaired = agentRunning && agent.data?.paired === true;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="glass-panel rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">University connection</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-sm text-muted-foreground">UniPilot Agent</p>
            <p className="mt-1 font-medium">{agentRunning ? (agentPaired ? "● Connected" : "● Running, not paired") : "○ Not detected"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-sm text-muted-foreground">University LMS</p>
            <p className="mt-1 font-medium">{connected ? `● ${data.university}` : expired ? "○ Session expired" : "○ Not connected"}</p>
          </div>
        </div>

        {!agentRunning ? (
          <div className="mt-5">
            <h2 className="text-xl font-semibold">UniPilot Agent required</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The UniPilot Agent allows UniPilot to work with your university portal through a dedicated browser. UniPilot does not receive your university password.
            </p>
            <p className="mt-3 rounded-2xl bg-background/50 p-3 text-sm">
              In the unipilot-app folder, run <span className="font-medium">npm run dev:agent</span>
            </p>
            <Button className="mt-4" variant="outline" onClick={() => void agent.refetch()}>
              Check again
            </Button>
          </div>
        ) : null}

        {agentRunning && !agentPaired ? (
          <div className="mt-5">
            <h2 className="text-xl font-semibold">Pair this computer</h2>
            <p className="mt-2 text-sm text-muted-foreground">UniPilot Agent is running. Link it to your account before opening the university portal.</p>
            <Button className="mt-4" disabled={busy != null} onClick={() => void run("pair", async () => { await pairAgent(); return null; })}>
              {busy === "pair" ? "Pairing..." : "Pair UniPilot Agent"}
            </Button>
          </div>
        ) : null}

        {agentPaired && !connected && !expired && !watching ? (
          <div className="mt-5">
            <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Link2 className="size-5" />
            </div>
            <h2 className="text-xl font-semibold">No university connected</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect opens the university inside this page. Enter its web address, sign in on the panel, and type a prompt such as Click Courses. You see each change in that panel. UniPilot does not keep the password.
            </p>
            <Button className="mt-4" disabled={busy != null} onClick={() => void run("connect", async () => { await startUniversityConnection(); return readAgentStatus(); })}>
              {busy === "connect" ? "Starting..." : "Connect University"}
            </Button>
          </div>
        ) : null}

        {watching ? (
          <div className="mt-5 rounded-2xl border border-border bg-background/40 p-4 text-sm">
            <h2 className="text-lg font-semibold">Connecting to university</h2>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              <li>✓ UniPilot Agent detected</li>
              <li>{live?.phase === "BROWSER_OPENING" ? "• Dedicated browser opening" : "✓ Dedicated browser opened"}</li>
              <li>{live?.phase === "WAITING_FOR_LOGIN" || live?.phase === "LMS_OPENED" || live?.phase === "READING" ? "✓ University portal loaded" : "• University portal loading"}</li>
            </ul>
            <p className="mt-3">{live?.message ?? "Waiting for university authentication inside the panel."}</p>
          </div>
        ) : null}

        {live?.viewToken ? <PortalPanel viewToken={live.viewToken} pageLabel={live.pageLabel} /> : null}

        {expired && !watching ? (
          <div className="mt-5">
            <ErrorState
              title="University Session Expired"
              message="Please reconnect your university account. You will sign in on the university page. UniPilot does not ask for the password."
              primary={busy === "reconnect" ? "Reconnecting..." : "Reconnect University"}
              onPrimary={() => void run("reconnect", async () => { await startUniversityConnection(); return readAgentStatus(); })}
            />
          </div>
        ) : null}

        {connected && !watching ? (
          <div className="mt-5">
            <h2 className="text-2xl font-semibold">University Connected</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status="Connected" pulse />
              <StatusBadge status={data.session} />
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Account</dt>
                <dd>{data.accountName || live?.accountName || "Signed in on the university portal"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Session</dt>
                <dd>{data.session === "Active" ? "Active" : data.session}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Connection method</dt>
                <dd>Secure local browser</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last verified</dt>
                <dd>{data.lastVerified ? formatDate(data.lastVerified) : data.lastAuthentication ? formatDate(data.lastAuthentication) : "Just now"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">UniPilot never needs your university password.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy != null || !agentPaired} onClick={() => void run("open", async () => { await openUniversityPortal(); return readAgentStatus(); })}>
                Open University
              </Button>
              <Button variant="outline" disabled={busy != null || !agentPaired} onClick={() => void run("check", verifyUniversitySession)}>
                {busy === "check" ? "Checking..." : "Check Connection"}
              </Button>
              <Button variant="outline" disabled={busy != null || !agentPaired} onClick={() => void run("courses", readUniversityCourses)}>
                {busy === "courses" ? "Reading..." : "Read Courses"}
              </Button>
              <Button variant="outline" disabled={busy != null || !agentPaired} onClick={() => void run("reconnect", async () => { await startUniversityConnection(); return readAgentStatus(); })}>
                Reconnect
              </Button>
              <Button variant="ghost" disabled={!agentPaired} onClick={() => setConfirm(true)}>
                Disconnect
              </Button>
            </div>
            {courses && courses.length > 0 ? (
              <ul className="mt-5 space-y-2 text-sm">
                {courses.map((course) => (
                  <li key={course.portalId} className="rounded-2xl border border-border px-3 py-2">
                    <span className="font-medium">{course.code}</span>
                    <span className="text-muted-foreground"> · {course.name} · {course.semester} {course.section}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {live?.phase === "FAILED" && !watching ? <p className="mt-4 text-sm text-rose-600">{live.message}</p> : null}
      </section>
      <ConfirmationModal
        open={confirm}
        onOpenChange={setConfirm}
        title="Disconnect university account?"
        description="This closes the dedicated browser and removes its saved university session from this computer. Your password is not stored in UniPilot."
        confirmLabel="Disconnect"
        destructive
        onConfirm={() => void run("disconnect", disconnectUniversityAgent)}
      />
    </div>
  );
}
