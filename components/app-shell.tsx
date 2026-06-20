"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  BotIcon,
  DatabaseIcon,
  DownloadIcon,
  FilmIcon,
  HistoryIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  MessageSquareTextIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
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
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { AnalysisResults } from "@/components/analysis-results";
import { parseStructuredAnalysis } from "@/lib/analysis-parser";
import { exportAnalysisToMarkdown, downloadMarkdown } from "@/lib/export-analysis";
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

const SessionRail = function SessionRail({
  sessions,
  activeSession,
  loadingSessions,
  loadingSessionId,
  loadSession,
  deleteSession,
}: {
  sessions: SessionListItem[];
  activeSession: SessionDetail | null;
  loadingSessions: boolean;
  loadingSessionId: string | null;
  loadSession: (id: string) => Promise<SessionDetail | null>;
  deleteSession: (id: string) => Promise<void>;
}) {
  return (
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
            <div
              className={cn(
                "group relative rounded-2xl border border-sidebar-border bg-sidebar-accent p-4 text-left transition-colors hover:bg-secondary focus-within:border-accent",
                active && "border-accent bg-secondary",
              )}
              key={session.id}
            >
              <button
                className="w-full text-left"
                disabled={loadingSessionId === session.id}
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
              <button
                className="absolute right-2 top-2 rounded-md p-1.5 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                title="Delete session"
              >
                <Trash2Icon className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type AnalysisStage = "idle" | "scraping" | "uploading" | "analyzing";

const STAGE_LABELS: Record<AnalysisStage, string> = {
  idle: "",
  scraping: "Scraping Reels from Instagram...",
  uploading: "Uploading videos to Gemini...",
  analyzing: "Running analysis against rubric...",
};

const ConversationPanel = function ConversationPanel({
  activeSession,
  analysisStage,
  lastError,
  onRetry,
  onClearError,
}: {
  activeSession: SessionDetail | null;
  analysisStage: AnalysisStage;
  lastError: string | null;
  onRetry: () => void;
  onClearError: () => void;
}) {

  const messageElements = useMemo(() => {
    if (!activeSession || activeSession.messages.length === 0) return null;
    return activeSession.messages.map((message) => {
      const structured = message.role === "assistant"
        ? parseStructuredAnalysis(message.content)
        : null;

      const hasError = message.content.startsWith("Failed to scrape") || message.content.startsWith("Analysis failed:");

      return (
        <article
          className={cn(
            "max-w-[88%] rounded-2xl border p-4",
            message.role === "user"
              ? "ml-auto bg-primary text-primary-foreground"
              : hasError
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "bg-secondary/70 text-secondary-foreground",
          )}
          key={message.id}
        >
          <div className="mb-2 flex items-center justify-between gap-2 font-mono text-xs uppercase tracking-[0.16em] opacity-80">
            <div className="flex items-center gap-2">
              {message.role === "user" ? (
                <UserIcon className="size-3.5" aria-hidden="true" />
              ) : (
                <BotIcon className="size-3.5" aria-hidden="true" />
              )}
              {message.role === "user" ? "You" : "Analyzer"}
            </div>
            {structured && message.role === "assistant" ? (
              <button
                className="rounded-md p-1 hover:bg-accent/20"
                type="button"
                onClick={() => {
                  const md = exportAnalysisToMarkdown(structured, activeSession.username, activeSession.messages.find(m => m.role === "user")?.content);
                  downloadMarkdown(md, `analysis-${activeSession.username}-${message.createdAt.slice(0, 10)}.md`);
                }}
                title="Export as Markdown"
              >
                <DownloadIcon className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          {message.role === "user" ? (
            <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
          ) : hasError ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p className="text-sm leading-6">{message.content}</p>
              </div>
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry analysis
              </Button>
            </div>
          ) : structured ? (
            <AnalysisResults analysis={structured} />
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
          <p className="mt-3 font-mono text-xs opacity-70">{formatDate(message.createdAt)}</p>
        </article>
      );
    });
  }, [activeSession, onRetry]);

  return (
    <Card className="enter-rise flex min-h-[28rem] flex-col border lab-panel-strong lg:min-h-0 lg:max-h-[65vh]">
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
        {lastError && analysisStage === "idle" ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{lastError}</span>
            </div>
            <button
              className="rounded-md p-1 hover:bg-destructive/20"
              type="button"
              onClick={onClearError}
            >
              <XIcon className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {analysisStage !== "idle" ? (
          <div className="flex items-center gap-3 rounded-xl border bg-accent/10 p-3">
            <LoaderCircleIcon className="size-4 animate-spin text-accent" aria-hidden="true" />
            <span className="text-sm text-accent">{STAGE_LABELS[analysisStage]}</span>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border bg-background/35 p-4">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-center">
              <div className="flex max-w-md flex-col items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl border bg-secondary text-accent">
                  <SparklesIcon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold tracking-[-0.04em]">Ready for analysis</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Enter an Instagram username and prompt. Reels will be scraped and analyzed by Gemini 2.5 Flash.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          {messageElements}
        </div>
      </CardContent>
    </Card>
  );
};

const PromptForm = function PromptForm({
  username,
  setUsername,
  prompt,
  setPrompt,
  error,
  submitting,
  analysisStage,
  onSubmit,
}: {
  username: string;
  setUsername: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  error: string | null;
  submitting: boolean;
  analysisStage: AnalysisStage;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const isWorking = submitting || analysisStage !== "idle";
  const buttonLabel = analysisStage !== "idle"
    ? STAGE_LABELS[analysisStage]
    : submitting
      ? "Saving analysis"
      : "Send prompt";

  return (
    <form className="enter-rise flex flex-col gap-5" onSubmit={onSubmit}>
      <Card className="border lab-panel">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-[-0.04em]">Prompt panel</CardTitle>
          <CardDescription>Reels are scraped and analyzed by Gemini 2.5 Flash with a structured rubric.</CardDescription>
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
                disabled={isWorking}
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
                disabled={isWorking}
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

      <Button className="h-12" disabled={isWorking} type="submit">
        {isWorking ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <SendIcon data-icon="inline-start" aria-hidden="true" />}
        {buttonLabel}
      </Button>

      <div className="flex items-start gap-3 rounded-2xl border bg-secondary/45 p-4 text-sm leading-6 text-muted-foreground">
        <SparklesIcon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        Powered by Gemini 2.5 Flash — videos are uploaded to the File API for analysis against the hidden rubric.
      </div>
    </form>
  );
};

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
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingRetry, setPendingRetry] = useState<{ username: string; prompt: string } | null>(null);

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

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!response.ok) return;

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
    } catch {
      // Silently fail
    }
  }, [activeSession]);

  const handleUnlocked = useCallback(() => {
    setUnlocked(true);
    void loadSessions();
  }, [loadSessions]);

  function startNewSession() {
    setActiveSession(null);
    setUsername("");
    setPrompt("");
    setError(null);
    setLastError(null);
    setPendingRetry(null);
  }

  function handleClearError() {
    setLastError(null);
  }

  const runAnalysis = useCallback(async (cleanUsername: string, cleanPrompt: string) => {
    setError(null);
    setLastError(null);
    setSubmitting(true);
    setAnalysisStage("scraping");

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
      const data = (await response.json()) as { sessionId?: string; error?: string; reelsAnalyzed?: number };

      if (!response.ok || !data.sessionId) {
        const errMsg = data.error ?? "Unable to save prompt.";
        setError(errMsg);
        setLastError(errMsg);
        setPendingRetry({ username: cleanUsername, prompt: cleanPrompt });
        return;
      }

      if (data.reelsAnalyzed === -1) {
        setLastError("Scraping found 0 Reels. The account may have no Reels or is unavailable.");
        setPendingRetry({ username: cleanUsername, prompt: cleanPrompt });
      } else if (data.error) {
        setLastError(data.error);
        setPendingRetry({ username: cleanUsername, prompt: cleanPrompt });
      }

      setPrompt("");
      await loadSession(data.sessionId);
      await loadSessions();
    } catch {
      const errMsg = "Unable to connect to the analyze endpoint.";
      setError(errMsg);
      setLastError(errMsg);
      setPendingRetry({ username: cleanUsername, prompt: cleanPrompt });
    } finally {
      setSubmitting(false);
      setAnalysisStage("idle");
    }
  }, [activeSession, loadSession, loadSessions]);

  async function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

    void runAnalysis(cleanUsername, cleanPrompt);
  }

  const handleRetry = useCallback(() => {
    if (pendingRetry) {
      setLastError(null);
      void runAnalysis(pendingRetry.username, pendingRetry.prompt);
    }
  }, [pendingRetry, runAnalysis]);

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

            <SessionRail
              sessions={sessions}
              activeSession={activeSession}
              loadingSessions={loadingSessions}
              loadingSessionId={loadingSessionId}
              loadSession={loadSession}
              deleteSession={handleDeleteSession}
            />

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
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Gemini Analysis</p>
              <h2 className="font-heading text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                {activeSession ? `@${activeSession.username}` : "Start a Reels analysis session"}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                Reels are scraped, uploaded to the Gemini File API, and analyzed by Gemini 2.5 Flash using a structured
                rubric. Analysis results and raw Gemini responses are persisted to SQLite.
              </p>
            </div>
            <div className="rounded-full border bg-secondary px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Phase 06
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1fr_0.42fr]">
            <ConversationPanel
              activeSession={activeSession}
              analysisStage={analysisStage}
              lastError={lastError}
              onRetry={handleRetry}
              onClearError={handleClearError}
            />
            <PromptForm
              username={username}
              setUsername={setUsername}
              prompt={prompt}
              setPrompt={setPrompt}
              error={error}
              submitting={submitting}
              analysisStage={analysisStage}
              onSubmit={submitPrompt}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
