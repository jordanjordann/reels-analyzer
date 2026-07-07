"use client";

import { Suspense } from "react";
import { LayoutGridIcon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfileList } from "@/api/profiles/hooks";
import { UserGrid } from "@/app/profile/components/grids/UserGrid";
import { NewAnalysisModal } from "@/app/profile/components/modals/NewAnalysisModal";

function AnalysesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewAnalysis = searchParams.get("new") === "true";

  const { data, isFetching } = useProfileList();
  const profiles = data?.profiles ?? [];

  return (
    <div className="flex min-h-dvh flex-col gap-6 p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-xl border bg-secondary text-accent">
            <LayoutGridIcon className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em]">Analyses</h1>
            <p className="text-sm text-muted-foreground">
              {profiles.length} account{profiles.length === 1 ? "" : "s"} analyzed
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/profile?new=true")}
          className="flex items-center gap-2 rounded-xl border bg-secondary px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary/80"
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          New analysis
        </button>
      </header>

      <UserGrid profiles={profiles} loading={isFetching && profiles.length === 0} />

      {isNewAnalysis && (
        <NewAnalysisModal />
      )}
    </div>
  );
}

export default function AnalysesPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh p-6 lg:p-8" />}>
      <AnalysesContent />
    </Suspense>
  );
}
