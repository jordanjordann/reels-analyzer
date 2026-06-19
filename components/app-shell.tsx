"use client";

import { FormEvent, useCallback, useState } from "react";
import {
  AlertCircleIcon,
  BotIcon,
  DatabaseIcon,
  FilmIcon,
  HistoryIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  MessageSquareTextIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";

import { PinScreen } from "@/components/pin-screen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SessionListItem = {
  id: string;
  username: string;
  title: string | null;
  lastPromptPreview: string | null;
  updatedAt: string;
};

type MessageRecord = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  rawGemini: string | null;
  createdAt: string;
};

type SessionDetail = {
  id: string;
  username: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: MessageRecord[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function AppShell() {
  const [unlocked, setUnlocked] = useState(false);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [username, setUsername] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSession = useCallback(async (sessionId: string) => {
    setError(null);
    setLoadingSessionId(sessionId);

    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      const data = (await response.json()) as { session?: SessionDetail; error?: string };

      if (!response.ok || !data.session) {
        setError(data.error ?? "Unable to load session.");
        return null;
      }

      setActiveSession(data.session);
      setUsername(data.session.username);
      return data.session;
    } catch {
      setError("Unable to connect to the sessions endpoint.");
      return null;
    } finally {
      setLoadingSessionId(null);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions");
      const data = (await response.json()) as { sessions?: SessionListItem[]; error?: string };

      if (!response.ok || !data.sessions) {
        setError(data.error ?? "Unable to load sessions.");
        return;
      }

      setSessions(data.sessions);
      if (!activeSession && data.sessions[0]) {
        await loadSession(data.sessions[0].id);
      }
    } catch {
      setError("Unable to connect to the sessions endpoint.");
    } finally {
      setLoadingSessions(false);
    }
  }, [activeSession, loadSession]);

  const handleUnlocked = useCallback(() => {
    setUnlocked(true);
    void loadSessions();
  }, [loadSessions]);

  function startNewSession() {
    setActiveSession(null);
    setUsername("");
    setPrompt("");
    setError(null);
  }

  async function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanUsername = username.trim().replace(/^@+/, "");
    const cleanPrompt = prompt.trim();

    if (!cleanUsername) {
      setError("Enter an Instagram username before sending a prompt.");
      return;
    }

    if (!cleanPrompt) {
      setError("Enter a prompt to analyze.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          prompt: cleanPrompt,
          sessionId: activeSession?.username === cleanUsername.toLowerCase() ? activeSession.id : undefined,
        }),
      });
      const data = (await response.json()) as { sessionId?: string; error?: string };

      if (!response.ok || !data.sessionId) {
        setError(data.error ?? "Unable to save prompt.");
        return;
      }

      setPrompt("");
      await loadSession(data.sessionId);
      await loadSessions();
    } catch {
      setError("Unable to connect to the analyze endpoint.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!unlocked) {
    return <PinScreen onUnlocked={handleUnlocked} />;
  }

  return (
    <main className="lab-frame relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div className="lab-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative flex min-h-dvh flex-col lg:flex-row">
        <aside className="flex border-b bg-sidebar/80 p-5 text-sidebar-foreground lab-panel lg:min-h-dvh lg:w-92 lg:flex-col lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex w-full flex-col gap-6 lg:min-h-0 lg:flex-1">
            <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-start">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border bg-sidebar-accent text-accent">
                  <FilmIcon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Reels</p>
                  <h1 className="font-heading text-xl font-semibold tracking-[-0.04em]">Analyzer</h1>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={startNewSession}>
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                New analysis
              </Button>
            </div>

            <div className="flex min-h-0 flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Session rail</p>
                {loadingSessions ? <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
              </div>

              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1 lg:max-h-none lg:min-h-0 lg:flex-1">
                {sessions.length === 0 ? (
                  <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent p-4">
                    <div className="flex items-start gap-3">
                      <HistoryIcon className="mt-0.5 size-4 text-accent" aria-hidden="true" />
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">No saved conversations yet</p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Submit a username and prompt to create the first persistent session.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {sessions.map((session) => {
                  const active = activeSession?.id === session.id;

                  return (
                    <button
                      className={cn(
                        "rounded-2xl border border-sidebar-border bg-sidebar-accent p-4 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        active && "border-accent bg-secondary",
                      )}
                      disabled={loadingSessionId === session.id}
                      key={session.id}
                      type="button"
                      onClick={() => loadSession(session.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-semibold text-foreground">@{session.username}</p>
                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                            {session.lastPromptPreview ?? session.title ?? "Manual session"}
                          </p>
                        </div>
                        {loadingSessionId === session.id ? (
                          <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
                        ) : null}
                      </div>
                      <p className="mt-3 font-mono text-xs text-muted-foreground">{formatDate(session.updatedAt)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden flex-col gap-3 lg:flex">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Secure state</p>
              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <LockKeyholeIcon className="size-4 text-accent" aria-hidden="true" />
                    PIN cookie
                  </span>
                  <span className="font-mono text-xs text-foreground">active</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <DatabaseIcon className="size-4 text-primary" aria-hidden="true" />
                    Messages
                  </span>
                  <span className="font-mono text-xs text-foreground">persisted</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-dvh flex-1 flex-col gap-5 p-5 sm:p-6 lg:p-8">
          <header className="enter-rise flex flex-col justify-between gap-5 rounded-3xl border p-5 lab-panel md:flex-row md:items-center">
            <div className="flex max-w-3xl flex-col gap-2">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Persistence + UI</p>
              <h2 className="font-heading text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                {activeSession ? `@${activeSession.username}` : "Start a Reels analysis session"}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                Prompts and placeholder assistant responses are persisted now. Instagram scraping and Gemini video
                analysis will plug into this same flow in later phases.
              </p>
            </div>
            <div className="rounded-full border bg-secondary px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Phase 02
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1fr_0.42fr]">
            <Card className="enter-rise flex min-h-[28rem] flex-col border lab-panel-strong lg:min-h-0">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="font-heading text-2xl tracking-[-0.04em]">Conversation</CardTitle>
                    <CardDescription>
                      {activeSession
                        ? `${activeSession.messages.length} persisted message${activeSession.messages.length === 1 ? "" : "s"}`
                        : "No active session yet"}
                    </CardDescription>
                  </div>
                  <MessageSquareTextIcon className="size-5 text-accent" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border bg-background/35 p-4">
                  {!activeSession || activeSession.messages.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center text-center">
                      <div className="flex max-w-md flex-col items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-2xl border bg-secondary text-accent">
                          <SparklesIcon className="size-5" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-heading text-xl font-semibold tracking-[-0.04em]">Ready for a prompt</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Enter an Instagram username, ask a question, and Phase 2 will save the exchange to SQLite.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeSession?.messages.map((message) => (
                    <article
                      className={cn(
                        "max-w-[88%] rounded-2xl border p-4",
                        message.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-secondary/70 text-secondary-foreground",
                      )}
                      key={message.id}
                    >
                      <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] opacity-80">
                        {message.role === "user" ? (
                          <UserIcon className="size-3.5" aria-hidden="true" />
                        ) : (
                          <BotIcon className="size-3.5" aria-hidden="true" />
                        )}
                        {message.role === "user" ? "You" : "Analyzer"}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                      <p className="mt-3 font-mono text-xs opacity-70">{formatDate(message.createdAt)}</p>
                    </article>
                  ))}
                </div>
              </CardContent>
            </Card>

            <form className="enter-rise flex flex-col gap-5" onSubmit={submitPrompt}>
              <Card className="border lab-panel">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl tracking-[-0.04em]">Prompt panel</CardTitle>
                  <CardDescription>Phase 2 saves the chat. Phase 4 will replace placeholders with Gemini.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={Boolean(error?.includes("username"))}>
                      <FieldLabel htmlFor="username">Instagram username</FieldLabel>
                      <Input
                        id="username"
                        placeholder="kyliejenner"
                        value={username}
                        aria-invalid={Boolean(error?.includes("username"))}
                        disabled={submitting}
                        onChange={(event) => setUsername(event.target.value.replace(/^@+/, ""))}
                      />
                      <FieldDescription>Use the handle only. The scraper arrives in Phase 3.</FieldDescription>
                    </Field>

                    <Field data-invalid={Boolean(error && !error.includes("username"))}>
                      <FieldLabel htmlFor="prompt">Analysis prompt</FieldLabel>
                      <Textarea
                        id="prompt"
                        className="min-h-36 resize-none"
                        placeholder="What recurring hook patterns does this creator use?"
                        value={prompt}
                        aria-invalid={Boolean(error && !error.includes("username"))}
                        disabled={submitting}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                      />
                      <FieldDescription>Press Enter to submit. Use Shift+Enter for a new line.</FieldDescription>
                      <div aria-live="polite">{error ? <FieldError>{error}</FieldError> : null}</div>
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              <Button className="h-12" disabled={submitting} type="submit">
                {submitting ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <SendIcon data-icon="inline-start" aria-hidden="true" />}
                {submitting ? "Saving analysis" : "Send prompt"}
              </Button>

              <div className="flex items-start gap-3 rounded-2xl border bg-secondary/45 p-4 text-sm leading-6 text-muted-foreground">
                <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                This phase intentionally uses a placeholder assistant response. It validates persistence before external
                scraping and model calls are introduced.
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}
