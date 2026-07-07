export const PROFILE_KEYS = {
  all: ["profiles"] as const,
  list: () => [...PROFILE_KEYS.all, "list"] as const,
  detail: (username: string) => [...PROFILE_KEYS.all, "detail", username] as const,
};
