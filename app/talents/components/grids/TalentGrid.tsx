"use client";

import { LoaderCircleIcon, UserPlusIcon } from "lucide-react";
import { TalentCard } from "../cards/TalentCard";
import type { TalentGridProps } from "../../types";

export function TalentGrid({ talents, loading }: TalentGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (talents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border bg-secondary text-accent">
          <UserPlusIcon className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-heading text-xl font-semibold tracking-[-0.04em]">No talents yet</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Add your first talent to start scouting creators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {talents.map((talent) => (
        <TalentCard key={talent.id} talent={talent} />
      ))}
    </div>
  );
}
