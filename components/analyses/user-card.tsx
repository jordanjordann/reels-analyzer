"use client";

import { FilmIcon, MessageSquareTextIcon } from "lucide-react";
import Link from "next/link";
import type { AnalysisUserSummary } from "@/api/analyses/types";

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

export function UserCard({ user }: { user: AnalysisUserSummary }) {
  return (
    <Link
      href={`/analyses/${user.username}`}
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-secondary/50"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-secondary text-accent">
          <span className="font-mono text-sm font-semibold">@</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-foreground">@{user.username}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {user.reelCount} reel{user.reelCount === 1 ? "" : "s"} · {user.sessionCount} session{user.sessionCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <FilmIcon className="size-3.5" aria-hidden="true" />
          {user.reelCount}
        </div>
        <div className="flex items-center gap-1.5">
          <MessageSquareTextIcon className="size-3.5" aria-hidden="true" />
          {user.sessionCount}
        </div>
        <span className="ml-auto font-mono">{formatDate(user.lastAnalyzedAt)}</span>
      </div>
    </Link>
  );
}
