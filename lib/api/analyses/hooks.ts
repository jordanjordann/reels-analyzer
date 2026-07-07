"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAnalysisUserReels, getAnalysisReelDetail, deleteAnalysisReel } from "@/api/analyses/api";
import { ANALYSES_KEYS } from "@/api/analyses/constants";
import { parseStructuredAnalysis } from "@/analysis/analysis-parser";

export { ANALYSES_KEYS } from "@/api/analyses/constants";
export type {
  AnalysisReelSummary,
  AnalysisReelDetail,
} from "@/api/analyses/types";

export function useAnalysisUserReels(username: string | null) {
  return useQuery({
    queryKey: ANALYSES_KEYS.userReels(username ?? ""),
    queryFn: () => getAnalysisUserReels(username!),
    enabled: !!username,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAnalysisReelDetail(shortcode: string | null) {
  return useQuery({
    queryKey: ANALYSES_KEYS.reelDetail(shortcode ?? ""),
    queryFn: () => getAnalysisReelDetail(shortcode!),
    enabled: !!shortcode,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    select: (data) => ({
      ...data,
      reel: {
        ...data.reel,
        analysis: data.reel.analysis ? parseStructuredAnalysis(data.reel.analysis) : null,
      },
    }),
  });
}

export function useDeleteAnalysisReel(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAnalysisReel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ANALYSES_KEYS.userReels(username) });
    },
  });
}
