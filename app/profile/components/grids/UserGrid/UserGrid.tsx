"use client";

import { LoaderCircleIcon, UsersIcon } from "lucide-react";
import { UserCard } from "../../cards/UserCard";
import type { UserGridProps } from "./types";

export function UserGrid({ profiles, loading }: UserGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border bg-secondary text-accent">
          <UsersIcon className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-heading text-xl font-semibold tracking-[-0.04em]">No analyses yet</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Run your first analysis to see accounts grouped here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {profiles.map((profile) => (
        <UserCard key={profile.username} profile={profile} />
      ))}
    </div>
  );
}
