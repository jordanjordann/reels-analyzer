"use client";

import { CalendarIcon, UserIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { formatDate, scoreColor } from "../../helpers";
import type { TalentCardProps } from "../../types";

export function TalentCard({ talent }: TalentCardProps) {
  return (
    <Link
      href={`/talents/${talent.id}`}
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-secondary/50"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-secondary text-accent">
          <UsersIcon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-semibold text-foreground">@{talent.instagramUsername}</p>
          <p className="text-xs text-muted-foreground">{talent.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <UserIcon className="size-3" aria-hidden="true" />
          {talent.gender}
        </span>
        {talent.overallScore != null && (
          <span className={`ml-auto font-mono text-sm font-semibold ${scoreColor(talent.overallScore)}`}>
            {talent.overallScore}
          </span>
        )}
      </div>

      {talent.notes && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{talent.notes}</p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarIcon className="size-3.5" aria-hidden="true" />
        {formatDate(talent.lastAnalyzedAt)}
      </div>
    </Link>
  );
}
