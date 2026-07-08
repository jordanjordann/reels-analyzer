"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getProfileList, getProfileDetail, refreshProfileAnalysis } from "@/api/profiles/api";
import { PROFILE_KEYS } from "@/api/profiles/constants";

export { PROFILE_KEYS } from "@/api/profiles/constants";
export type { ProfileSummary, ProfileDetail } from "@/api/profiles/types";

export function useProfileList() {
  return useQuery({
    queryKey: PROFILE_KEYS.list(),
    queryFn: getProfileList,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useProfileDetail(username: string | null) {
  return useQuery({
    queryKey: PROFILE_KEYS.detail(username ?? ""),
    queryFn: () => getProfileDetail(username!),
    enabled: !!username,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useRefreshProfileAnalysis(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refreshProfileAnalysis(username),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_KEYS.detail(username), data);
    },
  });
}
