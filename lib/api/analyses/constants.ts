export const ANALYSES_KEYS = {
  all: ["analyses"] as const,
  userList: () => [...ANALYSES_KEYS.all, "user-list"] as const,
  userReels: (username: string) => [...ANALYSES_KEYS.all, "user-reels", username] as const,
  reelDetail: (shortcode: string) => [...ANALYSES_KEYS.all, "reel-detail", shortcode] as const,
};
