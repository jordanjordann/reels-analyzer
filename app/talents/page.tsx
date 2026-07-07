"use client";

import { Suspense } from "react";
import { LayoutGridIcon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTalentList } from "@/api/talents/hooks";
import { TalentGrid } from "./components/grids/TalentGrid";
import { AddTalentModal } from "./components/modals/AddTalentModal";

function TalentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewTalent = searchParams.get("new") === "true";

  const { data, isFetching } = useTalentList();
  const talents = data?.talents ?? [];

  return (
    <div className="flex min-h-dvh flex-col gap-6 p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-xl border bg-secondary text-accent">
            <LayoutGridIcon className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em]">Talents</h1>
            <p className="text-sm text-muted-foreground">
              {talents.length} talent{talents.length === 1 ? "" : "s"} added
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/talents?new=true")}
          className="flex items-center gap-2 rounded-xl border bg-secondary px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary/80"
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          Add Talent
        </button>
      </header>

      <TalentGrid talents={talents} loading={isFetching && talents.length === 0} />

      {isNewTalent && (
        <AddTalentModal />
      )}
    </div>
  );
}

export default function TalentsPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh p-6 lg:p-8" />}>
      <TalentsContent />
    </Suspense>
  );
}
