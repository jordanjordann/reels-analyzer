"use client";

import { FilmIcon, MessageSquareTextIcon } from "lucide-react";
import Link from "next/link";
import { formatDate } from "./helpers";
import type { UserCardProps } from "./types";

export function UserCard({ profile }: UserCardProps) {
  return (
    <Link
      href={`/profile/${profile.username}`}
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-secondary/50"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-secondary text-accent">
          <span className="font-mono text-sm font-semibold">@</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-foreground">@{profile.username}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {profile.reelCount} reel{profile.reelCount === 1 ? "" : "s"} · {profile.sessionCount} session{profile.sessionCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <FilmIcon className="size-3.5" aria-hidden="true" />
          {profile.reelCount}
        </div>
        <div className="flex items-center gap-1.5">
          <MessageSquareTextIcon className="size-3.5" aria-hidden="true" />
          {profile.sessionCount}
        </div>
        <span className="ml-auto font-mono">{formatDate(profile.lastAnalyzedAt)}</span>
      </div>
    </Link>
  );
}
