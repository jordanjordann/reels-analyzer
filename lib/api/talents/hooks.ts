"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getTalentList, getTalentDetail, createTalent, refreshTalentAnalysis, deleteTalent } from "@/api/talents/api";
import { TALENT_KEYS } from "@/api/talents/constants";
import type { AddTalentFormData } from "@/api/talents/types";

export { TALENT_KEYS } from "@/api/talents/constants";
export type { TalentSummary, TalentDetail } from "@/api/talents/types";

export function useTalentList() {
  return useQuery({
    queryKey: TALENT_KEYS.list(),
    queryFn: getTalentList,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useTalentDetail(id: string | null) {
  return useQuery({
    queryKey: TALENT_KEYS.detail(id ?? ""),
    queryFn: () => getTalentDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddTalentFormData) => createTalent(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TALENT_KEYS.list() });
    },
  });
}

export function useRefreshTalentAnalysis(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refreshTalentAnalysis(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TALENT_KEYS.detail(id) });
    },
  });
}

export function useDeleteTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTalent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TALENT_KEYS.list() });
    },
  });
}
