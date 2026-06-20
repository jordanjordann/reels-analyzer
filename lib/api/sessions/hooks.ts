"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteSession, getSessions, getSession } from "@/api/sessions/api";
import type { SessionListItem } from "@/api/sessions/types";
import { SESSION_KEYS } from "@/api/sessions/constants";

export { SESSION_KEYS } from "@/api/sessions/constants";
export type { SessionListItem, MessageRecord, SessionDetail } from "@/api/sessions/types";

export function useSessions() {
  return useQuery({
    queryKey: SESSION_KEYS.lists(),
    queryFn: getSessions,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: SESSION_KEYS.detail(id ?? ""),
    queryFn: () => getSession(id!),
    enabled: !!id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSession,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: SESSION_KEYS.lists() });
      const previous = queryClient.getQueryData(SESSION_KEYS.lists());

      queryClient.setQueryData(SESSION_KEYS.lists(), (old: SessionListItem[] | undefined) =>
        old ? old.filter((s) => s.id !== id) : old,
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SESSION_KEYS.lists(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: SESSION_KEYS.lists() });
    },
  });
}
