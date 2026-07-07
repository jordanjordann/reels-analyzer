export interface ProfileAnalysisSectionProps {
  username: string;
}

export interface ScoreRingCardProps {
  score: number;
  size?: number;
}

export interface ScoreCardProps {
  label: string;
  score: number;
  description?: string;
}

export interface DimensionBarProps {
  label: string;
  score: number;
}

export interface StrengthWeaknessColumnProps {
  title: string;
  items: Array<{ dimension: string; avgScore: number; insight: string }>;
  color: string;
}

export interface RecurringRedFlagsCardProps {
  flags: string[];
}

export interface PersonalStyleSectionProps {
  style: Record<string, string>;
}

export interface AverageScorecardSectionProps {
  scorecard: {
    performanceScore: number;
    creativeScore: number;
    replicationScore: number;
    viralQualityScore: number;
  };
}

export interface StrengthsWeaknessesSectionProps {
  strengths: Array<{ dimension: string; avgScore: number; insight: string }>;
  weaknesses: Array<{ dimension: string; avgScore: number; insight: string }>;
}

export interface QualityBreakdownSectionProps {
  breakdown: Record<string, number>;
}

export interface ViralFormulaSectionProps {
  patterns: Array<{ formulaName: string; frequency: number; insight: string }>;
}

export interface AudiencePsychologySectionProps {
  patterns: Array<{ theme: string; type: string; insight: string }>;
}

export interface ReplicationAdviceSectionProps {
  advice: string;
}

export interface TopBottomReelsSectionProps {
  topReels: Array<{ shortcode: string; score: number }>;
  bottomReels: Array<{ shortcode: string; score: number }>;
}

export interface GrowthSuggestionsSectionProps {
  suggestions: string[];
}
