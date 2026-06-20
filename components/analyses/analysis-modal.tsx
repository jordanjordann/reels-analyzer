"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon, LoaderCircleIcon, AlertTriangleIcon, CalendarIcon, EyeIcon, FilmIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseStructuredAnalysis } from "@/shared/analysis/analysis-parser";
import { exportAnalysisToMarkdown, downloadMarkdown } from "@/shared/analysis/export-analysis";
import { AnalysisResults } from "@/components/analysis-results";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { useAnalysisReelDetail } from "@/api/analyses/hooks";

function formatViews(count: number | null) {
  if (count == null) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export function AnalysisModal({
  shortcode,
  username,
}: {
  shortcode: string;
  username: string;
}) {
  const router = useRouter();
  const { data, isFetching, error } = useAnalysisReelDetail(shortcode);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      router.back();
    }, 150);
  }, [router]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [handleClose]);

  const reel = data?.reel ?? null;
  const fullStructured = reel?.analysis ? parseStructuredAnalysis(reel.analysis) : null;
  const structured = fullStructured
    ? {
        reels: fullStructured.reels.filter((r) => r.shortcode === shortcode),
        crossReel: fullStructured.crossReel,
        overallViralIntelligenceScore: fullStructured.overallViralIntelligenceScore,
      }
    : null;
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
        {/* Header */}
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

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 lg:flex-row lg:gap-6">
          {/* Left: Thumbnail */}
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

          {/* Right: Analysis */}
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
                <AnalysisResults analysis={structured} />
              </div>
            ) : reel?.analysis ? (
              <MarkdownRenderer content={reel.analysis} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                <AlertTriangleIcon className="size-8" aria-hidden="true" />
                <p>No analysis available for this reel.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
