"use client";

import { useCallback, useState } from "react";
import {
  ActivityIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  BotIcon,
  ClockIcon,
  DatabaseIcon,
  FilmIcon,
  HistoryIcon,
  LockKeyholeIcon,
  MessageSquareTextIcon,
  RadarIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PinScreen } from "@/components/pin-screen";

const phaseCards = [
  {
    title: "PIN auth",
    detail: "Setup, verify, cookie persistence",
    status: "Live",
    icon: ShieldCheckIcon,
  },
  {
    title: "SQLite schema",
    detail: "Settings, sessions, reels, messages",
    status: "Migrated",
    icon: DatabaseIcon,
  },
  {
    title: "App shell",
    detail: "Sidebar and analysis surface scaffold",
    status: "Ready",
    icon: RadarIcon,
  },
];

const upcoming = [
  { label: "Session history", icon: HistoryIcon },
  { label: "Prompt composer", icon: MessageSquareTextIcon },
  { label: "Gemini video context", icon: BotIcon },
];

export function AppShell() {
  const [unlocked, setUnlocked] = useState(false);
  const handleUnlocked = useCallback(() => setUnlocked(true), []);

  if (!unlocked) {
    return <PinScreen onUnlocked={handleUnlocked} />;
  }

  return (
    <main className="lab-frame relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="lab-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative flex min-h-dvh flex-col lg:flex-row">
        <aside className="flex border-b bg-sidebar/80 p-5 text-sidebar-foreground lab-panel lg:min-h-dvh lg:w-88 lg:flex-col lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex w-full flex-col gap-6">
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
              <div className="rounded-full border bg-sidebar-accent px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Phase 01
              </div>
            </div>

            <div className="hidden flex-col gap-3 lg:flex">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Session rail</p>
              <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent p-4">
                <div className="flex items-start gap-3">
                  <HistoryIcon className="mt-0.5 size-4 text-accent" aria-hidden="true" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">No saved conversations yet</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Phase 2 will hydrate this rail from persisted sessions.
                    </p>
                  </div>
                </div>
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
                    DB mode
                  </span>
                  <span className="font-mono text-xs text-foreground">local</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex flex-1 flex-col gap-6 p-5 sm:p-6 lg:p-8">
          <header className="enter-rise flex flex-col justify-between gap-5 rounded-3xl border p-5 lab-panel md:flex-row md:items-center">
            <div className="flex max-w-2xl flex-col gap-2">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Authenticated workspace</p>
              <h2 className="font-heading text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                Foundation is online.
              </h2>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                The lock screen, PIN setup, signed cookie session, shadcn foundation, and SQLite migrations are ready
                for the persistence layer.
              </p>
            </div>
            <Button disabled variant="secondary">
              Phase 2 starts next
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          </header>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
            <Card className="enter-rise scanline border lab-panel-strong">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="font-heading text-2xl tracking-[-0.04em]">Phase 1 systems</CardTitle>
                    <CardDescription>Verified primitives that the rest of the analyzer depends on.</CardDescription>
                  </div>
                  <BadgeCheckIcon className="size-5 text-accent" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {phaseCards.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="rounded-2xl border bg-secondary/45 p-4" key={item.title}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl border bg-background/40 text-accent">
                          <Icon className="size-4" aria-hidden="true" />
                        </div>
                        <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {item.status}
                        </span>
                      </div>
                      <h3 className="mt-5 font-heading text-lg font-semibold tracking-[-0.03em]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="enter-rise border lab-panel">
              <CardHeader>
                <CardTitle className="font-heading text-2xl tracking-[-0.04em]">Next build vector</CardTitle>
                <CardDescription>Phase 2 turns this shell into a persistent chat workspace.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {upcoming.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="flex items-center justify-between rounded-2xl border bg-secondary/45 p-4" key={item.label}>
                      <span className="flex items-center gap-3 text-sm font-medium">
                        <Icon className="size-4 text-primary" aria-hidden="true" />
                        {item.label}
                      </span>
                      <ClockIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="enter-rise grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border p-5 lab-panel">
              <ActivityIcon className="size-5 text-accent" aria-hidden="true" />
              <p className="mt-4 font-mono text-2xl font-semibold">0</p>
              <p className="text-sm text-muted-foreground">Temp files active</p>
            </div>
            <div className="rounded-3xl border p-5 lab-panel">
              <SparklesIcon className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-4 font-mono text-2xl font-semibold">Gemini</p>
              <p className="text-sm text-muted-foreground">Video analysis target</p>
            </div>
            <div className="rounded-3xl border p-5 lab-panel">
              <ShieldCheckIcon className="size-5 text-accent" aria-hidden="true" />
              <p className="mt-4 font-mono text-2xl font-semibold">Private</p>
              <p className="text-sm text-muted-foreground">Single operator mode</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
