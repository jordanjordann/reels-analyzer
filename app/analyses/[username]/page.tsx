"use client";

import { Suspense, useState } from "react";
import {
  ArrowLeftIcon,
  LayoutGridIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAnalysisUserReels } from "@/api/analyses/hooks";
import { ReelGrid } from "@/components/analyses/reel-grid";
import { AnalysisModal } from "@/components/analyses/analysis-modal";
import { NewAnalysisModal } from "@/components/analyses/new-analysis-modal";
import { cn } from "@/shared/utils";
import type { AnalysisReelSummary } from "@/api/analyses/types";

const TABS = [
  { key: "reels", icon: LayoutGridIcon, label: "Reels" },
  { key: "profile", icon: UserIcon, label: "Profile Analysis" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function UserReelsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = params.username as string;

  const viewShortcode = searchParams.get("v");
  const isNewAnalysis = searchParams.get("new") === "true";

  const [activeTab, setActiveTab] = useState<TabKey>("reels");

  const { data, isFetching } = useAnalysisUserReels(username);
  const reels = data?.reels ?? [];

  function handleReelClick(reel: AnalysisReelSummary) {
    router.push(`/analyses/${username}?v=${reel.igShortcode}`);
  }

  return (
    <div className="flex min-h-dvh flex-col p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/analyses")}
            className="flex size-10 items-center justify-center rounded-xl border bg-secondary text-foreground transition-colors hover:bg-secondary/80"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em]">
              @{username}
            </h1>
            <p className="text-sm text-muted-foreground">
              {reels.length} reel{reels.length === 1 ? "" : "s"} analyzed
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-6 border-b border-border">
        {TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-1 pb-3 pt-2 text-xs font-semibold uppercase tracking-widest transition-colors",
              activeTab === key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex-1">
        {activeTab === "reels" && (
          <ReelGrid
            reels={reels}
            loading={isFetching && reels.length === 0}
            onReelClick={handleReelClick}
          />
        )}

        {activeTab === "profile" && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
            <UserIcon className="size-10" aria-hidden="true" />
            <p className="text-sm">Profile analysis coming soon</p>
          </div>
        )}
      </div>

      {viewShortcode && (
        <AnalysisModal shortcode={viewShortcode} username={username} />
      )}

      {isNewAnalysis && <NewAnalysisModal defaultUsername={username} />}
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
