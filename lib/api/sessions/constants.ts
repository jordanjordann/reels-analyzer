export const SESSION_KEYS = {
  all: ["sessions"] as const,
  lists: () => [...SESSION_KEYS.all, "list"] as const,
  details: () => [...SESSION_KEYS.all, "detail"] as const,
  detail: (id: string) => [...SESSION_KEYS.details(), id] as const,
};
