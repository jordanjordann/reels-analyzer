"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getContentSessions, getContentSession, createContentSession, deleteContentSession, sendMessage, getContentMemories, updateContentMemory, deleteContentMemory, clearContentMemories, submitFeedback } from "@/api/talents/content/api";
import { CONTENT_KEYS } from "@/api/talents/content/constants";
import type { CreateSessionBody, SendMessageBody } from "@/api/talents/content/types";

export { CONTENT_KEYS } from "@/api/talents/content/constants";
export type { ContentSessionSummary, ContentSessionDetail, ContentMessage } from "@/api/talents/content/types";

export function useContentSessions(talentId: string) {
  return useQuery({
    queryKey: CONTENT_KEYS.sessions(talentId),
    queryFn: () => getContentSessions(talentId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useContentSession(talentId: string, sessionId: string | null) {
  return useQuery({
    queryKey: CONTENT_KEYS.session(talentId, sessionId ?? ""),
    queryFn: () => getContentSession(talentId, sessionId!),
    enabled: !!sessionId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateContentSession(talentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSessionBody | FormData) => createContentSession(talentId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.sessions(talentId) });
    },
  });
}

export function useDeleteContentSession(talentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteContentSession(talentId, sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.sessions(talentId) });
    },
  });
}

export function useSendMessage(talentId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessageBody | FormData) => sendMessage(talentId, sessionId, body as SendMessageBody),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.session(talentId, sessionId) });
    },
  });
}

export function useContentMemories(talentId: string) {
  return useQuery({
    queryKey: CONTENT_KEYS.memories(talentId),
    queryFn: () => getContentMemories(talentId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateMemory(talentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; key: string; value: string }) =>
      updateContentMemory(talentId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.memories(talentId) });
    },
  });
}

export function useDeleteMemory(talentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; key: string }) =>
      deleteContentMemory(talentId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.memories(talentId) });
    },
  });
}

export function useClearMemories(talentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearContentMemories(talentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.memories(talentId) });
    },
  });
}

export function useSubmitFeedback(talentId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: "up" | "down" | "correction"; text?: string }) =>
      submitFeedback(talentId, sessionId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.memories(talentId) });
    },
  });
}
