"use client";

import { Suspense, useState } from "react";
import { ArrowLeftIcon, RefreshCwIcon, Trash2Icon, UserIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTalentDetail, useRefreshTalentAnalysis, useDeleteTalent } from "@/api/talents/hooks";
import { TalentAnalysisSection } from "./components/sections/TalentAnalysisSection";
import { cn } from "@/shared/utils";
import { scoreColor } from "../helpers";

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return count.toLocaleString();
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function TalentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isFetching } = useTalentDetail(id);
  const { mutate: refreshAnalysis } = useRefreshTalentAnalysis(id);
  const { mutate: deleteTalent } = useDeleteTalent();

  const talent = data?.talent ?? null;
  const isLoading = isFetching && !talent;

  async function handleRefresh() {
    setRefreshing(true);
    refreshAnalysis(undefined, {
      onSettled: () => setRefreshing(false),
    });
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this talent?")) return;
    setDeleting(true);
    deleteTalent(id, {
      onSuccess: () => router.push("/talents"),
      onSettled: () => setDeleting(false),
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 lg:p-8">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <UserIcon className="size-10 animate-pulse" aria-hidden="true" />
          <p className="text-sm">Loading talent...</p>
        </div>
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 lg:p-8">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <UserIcon className="size-10" aria-hidden="true" />
          <p className="text-sm">Talent not found</p>
          <button
            type="button"
            onClick={() => router.push("/talents")}
            className="mt-2 rounded-lg border bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/80"
          >
            Back to Talents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col p-6 lg:p-8">
      <header className="flex flex-col gap-4 pb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/talents")}
            className="flex size-10 items-center justify-center rounded-xl border bg-secondary text-foreground transition-colors hover:bg-secondary/80"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em]">{talent.name}</h1>
            <span className="inline-flex items-center rounded-md border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {talent.gender}
            </span>
            {talent.overallScore != null && (
              <span className={`font-mono text-lg font-semibold ${scoreColor(talent.overallScore)}`}>
                {talent.overallScore}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-lg font-mono font-bold">{talent.analysisReelCount}</p>
            <p className="text-xs text-muted-foreground">reels analyzed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-mono font-bold">
              {talent.lastAnalyzedAt ? formatTimeAgo(talent.lastAnalyzedAt) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">last analyzed</p>
          </div>
        </div>

        {talent.notes && (
          <div className="rounded-xl border bg-secondary/50 p-3">
            <p className="text-sm text-muted-foreground">{talent.notes}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            <RefreshCwIcon
              className={cn("size-4", refreshing && "animate-spin")}
              aria-hidden="true"
            />
            {refreshing ? "Refreshing..." : "Refresh Analysis"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
            {deleting ? "Deleting..." : "Delete Talent"}
          </button>
        </div>
      </header>

      <div className="flex-1">
        <TalentAnalysisSection talentId={id} />
      </div>
    </div>
  );
}

export default function TalentDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh p-6 lg:p-8" />}>
      <TalentDetailContent />
    </Suspense>
  );
}
