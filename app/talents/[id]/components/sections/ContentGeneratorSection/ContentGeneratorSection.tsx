"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
import type { ContentGeneratorSectionProps } from "./types";
import { SessionList } from "./components/lists/SessionList";
import { ChatSection } from "./components/sections/ChatSection";
import { MemorySettingsSection } from "./components/sections/MemorySettingsSection";

export function ContentGeneratorSection({ talentId }: ContentGeneratorSectionProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSwitchingSession, startSessionTransition] = useTransition();

  function handleSessionCreated(sessionId: string) {
    setActiveSessionId(sessionId);
  }

  function handleNewSession() {
    setActiveSessionId(null);
  }

  function handleSelectSession(sessionId: string) {
    startSessionTransition(() => {
      setActiveSessionId(sessionId);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Content Generator</h2>
        <button
          type="button"
          onClick={handleNewSession}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
          New Session
        </button>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 280px)" }}>
        <div className="w-64 shrink-0 overflow-y-auto rounded-xl border bg-background/50">
          <SessionList
            talentId={talentId}
            activeSessionId={activeSessionId}
            onSelect={handleSelectSession}
            onDelete={(id: string) => {
              if (activeSessionId === id) setActiveSessionId(null);
            }}
          />
        </div>
        <div className="flex-1 overflow-hidden rounded-xl border bg-background/50">
          <ChatSection
            talentId={talentId}
            sessionId={activeSessionId}
            onSessionCreated={handleSessionCreated}
            isSwitchingSession={isSwitchingSession}
          />
        </div>
      </div>

      <MemorySettingsSection talentId={talentId} />
    </div>
  );
}
