"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getProfileAnalysis, refreshProfileAnalysis } from "@/api/profile-analysis/api";
import { PROFILE_ANALYSIS_KEYS } from "@/api/profile-analysis/constants";

export { PROFILE_ANALYSIS_KEYS } from "@/api/profile-analysis/constants";
export type { ProfileAnalysisResponse } from "@/api/profile-analysis/api";

export function useProfileAnalysis(username: string | null) {
  return useQuery({
    queryKey: PROFILE_ANALYSIS_KEYS.detail(username ?? ""),
    queryFn: () => getProfileAnalysis(username!),
    enabled: !!username,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useRefreshProfileAnalysis(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...PROFILE_ANALYSIS_KEYS.all, "refresh", username],
    mutationFn: () => refreshProfileAnalysis(username),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_ANALYSIS_KEYS.detail(username) });
    },
  });
}
