"use client";

import { Suspense, useState } from "react";
import {
  ArrowLeftIcon,
  LayoutGridIcon,
  UserIcon,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAnalysisUserReels, useAnalysisUserProfile } from "@/api/analyses/hooks";
import { ReelGrid } from "@/components/analyses/reel-grid";
import { AnalysisModal } from "@/components/analyses/analysis-modal";
import { NewAnalysisModal } from "@/components/analyses/new-analysis-modal";
import { ProfileAnalysisTab } from "@/components/analyses/profile-analysis-tab";
import { cn } from "@/shared/utils";
import type { AnalysisReelSummary } from "@/api/analyses/types";

const TABS = [
  { key: "reels", icon: LayoutGridIcon, label: "Reels" },
  { key: "profile", icon: UserIcon, label: "Profile Analysis" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return count.toLocaleString();
}

function UserReelsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = params.username as string;

  const viewShortcode = searchParams.get("v");
  const isNewAnalysis = searchParams.get("new") === "true";

  const [activeTab, setActiveTab] = useState<TabKey>("reels");

  const { data, isFetching } = useAnalysisUserReels(username);
  const { data: profileData } = useAnalysisUserProfile(username);
  const reels = data?.reels ?? [];
  const profile = profileData?.profile ?? null;

  function handleReelClick(reel: AnalysisReelSummary) {
    router.push(`/analyses/${username}?v=${reel.igShortcode}`);
  }

  return (
    <div className="flex min-h-dvh flex-col p-6 lg:p-8">
      <header className="flex flex-col gap-4 pb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/analyses")}
            className="flex size-10 items-center justify-center rounded-xl border bg-secondary text-foreground transition-colors hover:bg-secondary/80"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
          </button>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em]">
            @{username}
          </h1>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-lg font-mono font-bold">{reels.length}</p>
            <p className="text-xs text-muted-foreground">reels</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-mono font-bold">
              {profile?.followerCount != null ? formatCount(profile.followerCount) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-mono font-bold">
              {profile?.followingCount != null ? formatCount(profile.followingCount) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">following</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-mono font-bold">
              {profile?.postCount != null ? formatCount(profile.postCount) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">posts</p>
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
          <ProfileAnalysisTab username={username} />
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
