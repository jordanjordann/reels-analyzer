import type { TalentSummary } from "@/api/talents/types";

export type TalentGridProps = {
  talents: TalentSummary[];
  loading: boolean;
};

export type TalentCardProps = {
  talent: TalentSummary;
};

export type AddTalentModalProps = Record<string, never>;

export type TalentAnalysisSectionProps = {
  talentId: string;
};
