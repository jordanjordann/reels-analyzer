import type { ProfileSummary } from "@/api/profiles/types";

export type UserGridProps = {
  profiles: ProfileSummary[];
  loading: boolean;
};
