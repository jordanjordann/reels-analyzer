export const TALENT_KEYS = {
  all: ["talents"] as const,
  list: () => [...TALENT_KEYS.all, "list"] as const,
  detail: (id: string) => [...TALENT_KEYS.all, "detail", id] as const,
};
