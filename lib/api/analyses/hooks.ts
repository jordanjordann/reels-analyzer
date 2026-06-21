"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAnalysisUsers, getAnalysisUserReels, getAnalysisReelDetail, getAnalysisUserProfile, deleteAnalysisReel } from "@/api/analyses/api";
import { ANALYSES_KEYS } from "@/api/analyses/constants";

export { ANALYSES_KEYS } from "@/api/analyses/constants";
export type {
  AnalysisUserSummary,
  AnalysisReelSummary,
  AnalysisReelDetail,
} from "@/api/analyses/types";

export function useAnalysisUsers() {
  return useQuery({
    queryKey: ANALYSES_KEYS.userList(),
    queryFn: getAnalysisUsers,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

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

export function useAnalysisUserProfile(username: string | null) {
  return useQuery({
    queryKey: ANALYSES_KEYS.userProfile(username ?? ""),
    queryFn: () => getAnalysisUserProfile(username!),
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
