export type QualityBreakdown = {
  hookStrength: number;
  retentionDesign: number;
  shareability: number;
  audiencePainDesireFit: number;
  ideaSharpness: number;
  executionQuality: number;
  emotionalTrigger: number;
  commentTrigger: number;
  saveValue: number;
  brandTransferability: number;
};

export type Scorecard = {
  performanceScore: number;
  creativeScore: number;
  replicationScore: number;
  viralIntelligenceScore: number;
  viralQualityScore: number;
};

export type CreativeBreakdown = {
  hook: string;
  retentionDesign: string;
  narrativeStructure: string;
  emotionalTrigger: string;
  executionNotes: string;
};

export type AudiencePsychology = {
  pain: string;
  desire: string;
  identity: string;
  enemyOrObstacle: string;
  emotionalPayoff: string;
};

export type ViralFormulaCard = {
  formulaName: string;
  templateHook: string;
  structure: string[];
  whyItWorks: string;
  bestFor: string[];
  notBestFor: string[];
  adaptationNotes: string;
};

export type ReplicationAnalysis = {
  replicationLabel: "replicable" | "partially_replicable" | "not_replicable";
  whatCanBeCopied: string[];
  whatShouldNotBeCopied: string[];
  risks: string[];
  brandSafetyNotes: string;
};

export type AdaptationIdea = {
  targetCreatorOrBrand: string;
  adaptedHook: string;
  adaptedStructure: string[];
  contentAngle: string;
  commercialBridge: string;
};

export type ReelAnalysis = {
  shortcode: string;
  oneLineDiagnosis: string;
  scorecard: Scorecard;
  qualityBreakdown: QualityBreakdown;
  creativeBreakdown: CreativeBreakdown;
  audiencePsychology: AudiencePsychology;
  viralFormulaCard: ViralFormulaCard;
  replicationAnalysis: ReplicationAnalysis;
  adaptationIdeas: AdaptationIdea[];
  redFlags: string[];
  recommendedNextExperiments: string[];
};

export type StructuredAnalysis = {
  reel: ReelAnalysis;
  viralIntelligenceScore: number;
};
