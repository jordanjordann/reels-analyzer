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
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { AnalysisResults } from "@/components/analysis-results";
import { BudgetWarning, FailedReelsList } from "@/components/analysis-progress";
import type { BudgetWarningData, FailedReelData } from "@/components/analysis-progress";
import { parseStructuredAnalysis } from "@/shared/analysis/analysis-parser";
import { exportAnalysisToMarkdown, downloadMarkdown } from "@/shared/analysis/export-analysis";
import { cn } from "@/shared/utils";
import { useDeleteSession, useSession, useSessions, SESSION_KEYS } from "@/api/sessions/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { SessionDetail, SessionListItem } from "@/api/sessions/api";
import { PromptForm, type AnalysisStage, STAGE_LABELS } from "@/components/prompt-form";

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
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
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

const ConversationPanel = function ConversationPanel({
  activeSession,
  analysisStage,
  lastError,
  onRetry,
  onClearError,
  budgetWarning,
  onBudgetContinue,
  onBudgetCancel,
  failedReels,
  onRetryFailed,
}: {
  activeSession: SessionDetail | null;
  analysisStage: AnalysisStage;
  lastError: string | null;
  onRetry: () => void;
  onClearError: () => void;
  budgetWarning: BudgetWarningData | null;
  onBudgetContinue: () => void;
  onBudgetCancel: () => void;
  failedReels: FailedReelData[];
  onRetryFailed: (urls: string[]) => void;
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

        {failedReels.length > 0 && analysisStage === "idle" ? (
          <FailedReelsList failedReels={failedReels} onRetry={onRetryFailed} />
        ) : null}

        {budgetWarning ? (
          <BudgetWarning
            data={budgetWarning}
            onContinue={onBudgetContinue}
            onCancel={onBudgetCancel}
          />
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
                    Paste reel URLs and a prompt. Reels will be fetched and analyzed by Gemini 2.5 Flash.
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

export function AppShell() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [budgetWarning, setBudgetWarning] = useState<BudgetWarningData | null>(null);
  const [failedReels, setFailedReels] = useState<FailedReelData[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<{ urls: string[]; prompt: string; sessionId: string } | null>(null);

  const sessionsQuery = useSessions();
  const sessionQuery = useSession(activeSessionId);
  const deleteMutation = useDeleteSession();
  const queryClient = useQueryClient();

  const activeSession = sessionQuery.data ?? null;
  const loadingSessionId = sessionQuery.isFetching ? activeSessionId : null;

  function loadSession(id: string) {
    setError(null);
    setActiveSessionId(id);
    setBudgetWarning(null);
    setFailedReels([]);
    setPendingConfirm(null);
  }

  function handleDeleteSession(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (activeSessionId === id) {
          setActiveSessionId(null);
        }
      },
    });
  }

  function handleUnlocked() {
    setUnlocked(true);
  }

  function startNewSession() {
    setActiveSessionId(null);
    setUrls([]);
    setPrompt("");
    setError(null);
    setLastError(null);
    setBudgetWarning(null);
    setFailedReels([]);
    setPendingConfirm(null);
  }

  function handleClearError() {
    setLastError(null);
  }

  function handleBudgetContinue() {
    if (pendingConfirm) {
      void runAnalysis(pendingConfirm.urls, pendingConfirm.prompt, pendingConfirm.sessionId, true);
      setBudgetWarning(null);
      setPendingConfirm(null);
    }
  }

  function handleBudgetCancel() {
    setBudgetWarning(null);
    setPendingConfirm(null);
    setSubmitting(false);
    setAnalysisStage("idle");
  }

  function handleRetryFailed(failedUrls: string[]) {
    setUrls(failedUrls);
    setFailedReels([]);
    const userMessage = activeSession?.messages.find((m) => m.role === "user");
    if (userMessage) {
      void runAnalysis(failedUrls, userMessage.content);
    }
  }

  const runAnalysis = useCallback(async (cleanUrls: string[], cleanPrompt: string, existingSessionId?: string, confirmBudget?: boolean) => {
    setError(null);
    setLastError(null);
    setSubmitting(true);
    setAnalysisStage("fetching");
    setBudgetWarning(null);
    setFailedReels([]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: cleanUrls,
          prompt: cleanPrompt,
          sessionId: existingSessionId ?? activeSession?.id ?? undefined,
          confirmBudget,
        }),
      });
      const data = (await response.json()) as {
        sessionId?: string;
        error?: string;
        reelsAnalyzed?: number;
        username?: string;
        failedReels?: FailedReelData[];
        budgetWarning?: BudgetWarningData;
      };

      if (!response.ok || !data.sessionId) {
        const errMsg = data.error ?? "Unable to save prompt.";
        setError(errMsg);
        setLastError(errMsg);
        return;
      }

      // Handle budget warning
      if (data.budgetWarning) {
        setBudgetWarning(data.budgetWarning);
        setPendingConfirm({ urls: cleanUrls, prompt: cleanPrompt, sessionId: data.sessionId });
        if (data.failedReels && data.failedReels.length > 0) {
          setFailedReels(data.failedReels);
        }
        setSubmitting(false);
        setAnalysisStage("idle");
        return;
      }

      // Handle failed reels
      if (data.failedReels && data.failedReels.length > 0) {
        setFailedReels(data.failedReels);
      }

      if (data.reelsAnalyzed === 0) {
        setLastError("Found 0 usable reels. URLs may be invalid or reels are unavailable.");
      } else if (data.error) {
        setLastError(data.error);
      }

      setPrompt("");
      void queryClient.invalidateQueries({ queryKey: SESSION_KEYS.lists() });
      void queryClient.invalidateQueries({ queryKey: SESSION_KEYS.detail(data.sessionId) });
      setActiveSessionId(data.sessionId);
    } catch {
      const errMsg = "Unable to connect to the analyze endpoint.";
      setError(errMsg);
      setLastError(errMsg);
    } finally {
      if (!budgetWarning) {
        setSubmitting(false);
        setAnalysisStage("idle");
      }
    }
  }, [activeSession, queryClient, budgetWarning]);

  async function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUrls = urls.filter((u) => u.trim());
    const cleanPrompt = prompt.trim();

    if (cleanUrls.length === 0) {
      setError("Add at least one Instagram reel URL before sending a prompt.");
      return;
    }

    if (!cleanPrompt) {
      setError("Enter a prompt to analyze.");
      return;
    }

    void runAnalysis(cleanUrls, cleanPrompt);
  }

  const handleRetry = useCallback(() => {
    if (!activeSession) return;
    const userMessage = activeSession.messages.find((m) => m.role === "user");
    if (!userMessage) return;
    const retryUrls = urls.length > 0 ? urls : activeSession.reels.map((r) => r.igUrl).filter(Boolean);
    void runAnalysis(retryUrls, userMessage.content);
  }, [activeSession, runAnalysis, urls]);

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
              sessions={sessionsQuery.data ?? []}
              activeSession={activeSession}
              loadingSessions={sessionsQuery.isFetching}
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
              budgetWarning={budgetWarning}
              onBudgetContinue={handleBudgetContinue}
              onBudgetCancel={handleBudgetCancel}
              failedReels={failedReels}
              onRetryFailed={handleRetryFailed}
            />
            <PromptForm
              urls={urls}
              setUrls={setUrls}
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
