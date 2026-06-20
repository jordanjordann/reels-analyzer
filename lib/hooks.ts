"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  deleteSession,
  getAuthStatus,
  getSession,
  getSessions,
  submitPin,
  type SessionListItem,
} from "@/lib/api";

export const SESSION_KEYS = {
  all: ["sessions"] as const,
  lists: () => [...SESSION_KEYS.all, "list"] as const,
  details: () => [...SESSION_KEYS.all, "detail"] as const,
  detail: (id: string) => [...SESSION_KEYS.details(), id] as const,
};

export const AUTH_KEYS = {
  all: ["auth"] as const,
  status: () => [...AUTH_KEYS.all, "status"] as const,
};

export function useAuthStatus() {
  return useQuery({
    queryKey: AUTH_KEYS.status(),
    queryFn: getAuthStatus,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSubmitPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pin, pinConfigured }: { pin: string; pinConfigured: boolean }) =>
      submitPin(pin, pinConfigured),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AUTH_KEYS.status() });
    },
  });
}

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
