export const CONTENT_KEYS = {
  all: (talentId: string) => ["talents", talentId, "content"] as const,
  sessions: (talentId: string) => [...CONTENT_KEYS.all(talentId), "sessions"] as const,
  session: (talentId: string, sessionId: string) => [...CONTENT_KEYS.sessions(talentId), sessionId] as const,
};
