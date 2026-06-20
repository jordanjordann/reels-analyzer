"use client";

import { Suspense } from "react";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAnalysisUserReels } from "@/api/analyses/hooks";
import { ReelGrid } from "@/components/analyses/reel-grid";
import { AnalysisModal } from "@/components/analyses/analysis-modal";
import { NewAnalysisModal } from "@/components/analyses/new-analysis-modal";
import type { AnalysisReelSummary } from "@/api/analyses/types";

function UserReelsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = params.username as string;

  const viewShortcode = searchParams.get("v");
  const isNewAnalysis = searchParams.get("new") === "true";

  const { data, isFetching } = useAnalysisUserReels(username);
  const reels = data?.reels ?? [];

  function handleReelClick(reel: AnalysisReelSummary) {
    router.push(`/analyses/${username}?v=${reel.igShortcode}`);
  }

  return (
    <div className="flex min-h-dvh flex-col gap-6 p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/analyses")}
            className="flex size-10 items-center justify-center rounded-xl border bg-secondary text-foreground transition-colors hover:bg-secondary/80"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border bg-secondary text-accent">
              <span className="font-mono text-sm font-semibold">@</span>
            </div>
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em]">@{username}</h1>
              <p className="text-sm text-muted-foreground">
                {reels.length} reel{reels.length === 1 ? "" : "s"} analyzed
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/analyses/${username}?new=true`)}
          className="flex items-center gap-2 rounded-xl border bg-secondary px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary/80"
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          New analysis
        </button>
      </header>

      <ReelGrid
        reels={reels}
        loading={isFetching && reels.length === 0}
        onReelClick={handleReelClick}
      />

      {viewShortcode && (
        <AnalysisModal shortcode={viewShortcode} username={username} />
      )}

      {isNewAnalysis && (
        <NewAnalysisModal defaultUsername={username} />
      )}
    </div>
  );
}

export default function UserReelsPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh p-6 lg:p-8" />}>
      <UserReelsContent />
    </Suspense>
  );
}
