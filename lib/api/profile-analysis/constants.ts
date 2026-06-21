export const PROFILE_ANALYSIS_KEYS = {
  all: ["profile-analysis"] as const,
  detail: (username: string) => [...PROFILE_ANALYSIS_KEYS.all, username] as const,
};
