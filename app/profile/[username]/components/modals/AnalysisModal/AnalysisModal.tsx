"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon, LoaderCircleIcon, AlertTriangleIcon, CalendarIcon, EyeIcon, FilmIcon, Trash2Icon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { exportAnalysisToMarkdown, downloadMarkdown } from "./helpers";
import { AnalysisResultsSection } from "@/app/profile/components/sections/AnalysisResultsSection";
import { useAnalysisReelDetail, useDeleteAnalysisReel } from "@/api/analyses/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { ANALYSES_KEYS } from "@/api/analyses/hooks";
import { PROFILE_KEYS } from "@/api/profiles/hooks";
import type { AnalysisModalProps } from "./types";
import { formatViews, formatDate } from "./helpers";

export function AnalysisModal({ shortcode, username }: AnalysisModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isFetching, error } = useAnalysisReelDetail(shortcode);
  const deleteMutation = useDeleteAnalysisReel(username);
  const [isClosing, setIsClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [reAnalyzeError, setReAnalyzeError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      router.back();
    }, 150);
  }, [router]);

  const handleReAnalyze = useCallback(async () => {
    const reelUrl = data?.reel?.igUrl ?? null;
    if (!reelUrl) return;

    setIsReAnalyzing(true);
    setReAnalyzeError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [reelUrl],
        }),
      });
      const data = (await response.json()) as {
        sessionId?: string;
        error?: string;
        reelsAnalyzed?: number;
      };

      if (!response.ok || !data.sessionId) {
        setReAnalyzeError(data.error ?? "Unable to re-analyze.");
        return;
      }

      if (data.reelsAnalyzed === 0) {
        setReAnalyzeError("Found 0 usable reels. URL may be invalid or reel is unavailable.");
      } else if (data.error) {
        setReAnalyzeError(data.error);
      } else {
        void queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.list() });
        void queryClient.invalidateQueries({ queryKey: ANALYSES_KEYS.userReels(username) });
        void queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.detail(username) });
        void queryClient.invalidateQueries({ queryKey: ANALYSES_KEYS.reelDetail(shortcode) });
      }
    } catch {
      setReAnalyzeError("Unable to connect to the analyze endpoint.");
    } finally {
      setIsReAnalyzing(false);
    }
  }, [data, queryClient, shortcode, username]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(shortcode);
      router.back();
    } catch {
      setIsDeleting(false);
    }
  }, [deleteMutation, shortcode, router]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [handleClose]);

  const structured = data?.reel.analysis ?? null;
  const reel = data?.reel ?? null;

  const title = reel?.caption?.trim() || `Reel ${shortcode}`;
  const views = formatViews(reel?.viewCount ?? null);
  const date = formatDate(reel?.postDate ?? null);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-150 ${isClosing ? "opacity-0" : "opacity-100"}`}
      onClick={handleClose}
    >
      <div
        className={`relative flex h-[90vh] w-[95vw] max-w-6xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl transition-transform duration-150 ${isClosing ? "scale-95" : "scale-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="line-clamp-1 font-heading text-lg font-semibold tracking-[-0.04em]">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-secondary"
          >
            <XIcon className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 lg:flex-row lg:gap-6">
          <div className="mb-6 w-full shrink-0 lg:mb-0 lg:w-72">
            <div className="aspect-[9/16] overflow-hidden rounded-xl border bg-secondary">
              {reel?.thumbnailUrl ? (
                <img
                  src={reel.thumbnailUrl}
                  alt={`Reel ${shortcode}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <FilmIcon className="size-8" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              {views && (
                <div className="flex items-center gap-2">
                  <EyeIcon className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>{views} views</span>
                </div>
              )}
              {date && (
                <div className="flex items-center gap-2">
                  <CalendarIcon className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>{date}</span>
                </div>
              )}
              {reel?.caption && (
                <p className="line-clamp-3 text-xs leading-relaxed">{reel.caption}</p>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {isFetching ? (
              <div className="flex items-center justify-center py-16">
                <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            ) : error ? (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error.message}
              </div>
            ) : structured ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-base font-semibold">Analysis Results</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const md = exportAnalysisToMarkdown(structured, username, reel?.userPrompt ?? undefined);
                      downloadMarkdown(md, `analysis-${username}-${shortcode}.md`);
                    }}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Export Markdown
                  </button>
                </div>
                <AnalysisResultsSection analysis={structured} />
              </div>
            ) : reel?.analysis ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <AlertTriangleIcon className="size-8 text-orange-400" aria-hidden="true" />
                <p className="text-muted-foreground">Analysis response was malformed and could not be parsed.</p>
                <p className="text-xs text-muted-foreground">Try re-analyzing this reel.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                <AlertTriangleIcon className="size-8" aria-hidden="true" />
                <p>No analysis available for this reel.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReAnalyze}
              disabled={isReAnalyzing}
              className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary/80 disabled:opacity-50"
            >
              {isReAnalyzing ? (
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCwIcon className="size-4" aria-hidden="true" />
              )}
              {isReAnalyzing ? "Re-analyzing..." : "Re-analyze"}
            </button>
            {reAnalyzeError && (
              <span className="text-xs text-destructive">{reAnalyzeError}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {isDeleting ? (
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2Icon className="size-4" aria-hidden="true" />
            )}
            {isDeleting ? "Deleting..." : "Delete Reel"}
          </button>
        </div>
      </div>
    </div>
  );
}
