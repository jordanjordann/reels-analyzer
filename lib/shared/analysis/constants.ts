export const DIMENSION_LABELS: Record<string, string> = {
  hookStrength: "Hook Strength",
  retentionDesign: "Retention Design",
  shareability: "Shareability",
  audiencePainDesireFit: "Audience Pain / Desire Fit",
  ideaSharpness: "Idea Sharpness",
  executionQuality: "Execution Quality",
  emotionalTrigger: "Emotional Trigger",
  commentTrigger: "Comment Trigger",
  saveValue: "Save Value",
  brandTransferability: "Brand Transferability",
};

export const SCORING_SCALE = {
  defaultMin: 0,
  defaultMax: 10,
  interpretation: {
    "0_2": "very weak / absent",
    "3_4": "weak",
    "5_6": "average",
    "7_8": "strong",
    "9_10": "exceptional",
  },
} as const;

export const VIRAL_QUALITY_DIMENSIONS = [
  {
    id: "hookStrength",
    name: "Hook Strength",
    weight: 15,
    whatToEvaluate: [
      "first 1-3 seconds",
      "first frame",
      "first sentence",
      "pattern interrupt",
      "curiosity gap",
      "specificity",
      "tension",
    ],
  },
  {
    id: "retentionDesign",
    name: "Retention Design",
    weight: 15,
    whatToEvaluate: [
      "open loop",
      "progressive reveal",
      "scene changes",
      "micro cliffhangers",
      "pacing",
      "payoff timing",
      "loop closure",
    ],
  },
  {
    id: "shareability",
    name: "Shareability",
    weight: 15,
    whatToEvaluate: [
      "who would share this",
      "why someone would send this",
      "social currency",
      "relatability",
      "usefulness to others",
      "identity signaling",
    ],
  },
  {
    id: "audiencePainDesireFit",
    name: "Audience Pain / Desire Fit",
    weight: 12,
    whatToEvaluate: [
      "core pain",
      "core desire",
      "audience identity",
      "enemy or obstacle",
      "aspiration",
      "timing relevance",
    ],
  },
  {
    id: "ideaSharpness",
    name: "Idea Sharpness",
    weight: 10,
    whatToEvaluate: [
      "clarity",
      "specificity",
      "freshness",
      "strength of angle",
      "degree of contrast",
      "single-minded message",
    ],
  },
  {
    id: "executionQuality",
    name: "Execution Quality",
    weight: 10,
    whatToEvaluate: [
      "editing",
      "pacing",
      "audio clarity",
      "subtitle clarity",
      "framing",
      "lighting",
      "visual composition",
    ],
  },
  {
    id: "emotionalTrigger",
    name: "Emotional Trigger",
    weight: 8,
    whatToEvaluate: [
      "humor",
      "anger",
      "relatability",
      "awe",
      "shame",
      "inspiration",
      "fear of missing out",
      "empathy",
    ],
  },
  {
    id: "commentTrigger",
    name: "Comment Trigger",
    weight: 5,
    whatToEvaluate: [
      "debate potential",
      "confession potential",
      "identity defense",
      "question prompt",
      "polarization",
      "missing detail that invites comments",
    ],
  },
  {
    id: "saveValue",
    name: "Save Value",
    weight: 5,
    whatToEvaluate: [
      "checklist value",
      "framework value",
      "tutorial value",
      "template value",
      "reference value",
      "repeat-use value",
    ],
  },
  {
    id: "brandTransferability",
    name: "Brand Transferability",
    weight: 5,
    whatToEvaluate: [
      "fit for other creators",
      "fit for other brands",
      "brand safety",
      "tone adaptability",
      "production feasibility",
      "commercial bridge",
    ],
  },
] as const;

export const VIRAL_QUALITY_WEIGHT_TOTAL = 100;

export const FINAL_SCORE_WEIGHTS = {
  performanceScore: 0.4,
  creativeScore: 0.35,
  replicationScore: 0.25,
} as const;

export const SCORE_GROUPS = {
  performanceScore: {
    description: "Measures whether the content performed abnormally well relative to account size and baseline.",
    weights: {
      viewToFollowerRatio: 0.4,
      commentRate: 0.35,
      engagementSignal: 0.25,
    },
  },
  creativeScore: {
    description: "Measures the creative mechanics that made the content work.",
    weights: {
      hook: 0.2,
      topicTension: 0.2,
      narrativeStructure: 0.2,
      retentionDesign: 0.15,
      emotionalTrigger: 0.15,
      executionQuality: 0.1,
    },
  },
  replicationScore: {
    description: "Measures whether the viral formula can be adapted to another creator or brand.",
    weights: {
      audienceTransferability: 0.25,
      personaFit: 0.2,
      brandOrProductFit: 0.2,
      productionFeasibility: 0.15,
      repeatability: 0.1,
      riskLevel: 0.1,
    },
  },
} as const;

export const QUANTITATIVE_METRICS = [
  {
    id: "views",
    name: "Views",
    description: "Total views. Should not be evaluated alone without account baseline.",
  },
  {
    id: "followers",
    name: "Followers",
    description: "Follower count at or near posting time. Requires visiting profile page.",
  },
  {
    id: "viewToFollowerRatio",
    name: "View-to-Follower Ratio",
    formula: "views / followers",
    description: "Measures virality relative to account size.",
  },
  {
    id: "commentRate",
    name: "Comment Rate",
    formula: "comments / views",
    description: "Conversation or debate signal.",
  },
  {
    id: "engagementRateByView",
    name: "Engagement Rate by View",
    formula: "(likes + comments) / views",
    description: "Overall engagement quality relative to views (excludes private metrics).",
  },
] as const;

export const NARRATIVE_FORMULAS = [
  { name: "Problem → Reframe → Solution", structure: "name problem, challenge assumption, offer better solution" },
  { name: "Story → Lesson", structure: "personal story followed by insight" },
  { name: "Myth Busting", structure: "common belief, correction, proof" },
  { name: "Before After Bridge", structure: "current state, desired state, bridge" },
  { name: "Listicle", structure: "numbered points or ranked insights" },
  { name: "Challenge / Experiment", structure: "attempt, stakes, process, result" },
  { name: "Public Interaction", structure: "street interview, challenge, reaction, payoff" },
  { name: "Authority Breakdown", structure: "analyze a known person, brand, event, or case" },
  { name: "Confession", structure: "admission, mistake, lesson, change" },
  { name: "Contrarian Take", structure: "popular advice, disagreement, sharper replacement" },
] as const;

export const RETENTION_DEVICES = [
  "open_loop",
  "progressive_reveal",
  "pattern_interrupt",
  "stakes_escalation",
  "curiosity_gap",
  "fast_payoff",
  "micro_cliffhanger",
  "visual_change",
  "subtitle_change",
  "camera_movement",
  "scene_change",
] as const;

export const SAVE_DRIVERS = [
  "checklist",
  "framework",
  "template",
  "tutorial",
  "reference",
  "deep_insight",
  "step_by_step",
] as const;

export const COMMENT_TRIGGERS = [
  "debate",
  "confession",
  "identity_defense",
  "question",
  "polarization",
  "missing_detail",
  "correction",
  "hot_take",
] as const;

export const RED_FLAGS = [
  {
    id: "controversy_only",
    name: "Viral because of controversy only",
    risk: "Can damage brand trust if copied blindly.",
  },
  {
    id: "public_figure_dependency",
    name: "Viral because of public figure",
    risk: "Low replicability unless the creator or brand has similar fame or access.",
  },
  {
    id: "audio_trend_dependency",
    name: "Viral because of trending audio",
    risk: "Formula may expire quickly.",
  },
  {
    id: "misinformation",
    name: "Misinformation or misleading claim",
    risk: "Do not replicate. Requires fact-checking.",
  },
  {
    id: "hate_comments",
    name: "High engagement from hate comments",
    risk: "May inflate performance while hurting brand.",
  },
  {
    id: "low_follow_conversion",
    name: "Viral but low follow conversion",
    risk: "May entertain without building audience.",
  },
  {
    id: "no_product_bridge",
    name: "No product or commercial bridge",
    risk: "May not convert into leads, trust, or sales.",
  },
  {
    id: "high_production_dependency",
    name: "Requires expensive or complex production",
    risk: "Hard to repeat consistently.",
  },
  {
    id: "creator_charisma_dependency",
    name: "Depends heavily on creator charisma",
    risk: "Difficult to adapt to weaker hosts or brand accounts.",
  },
] as const;

export const ANALYSIS_METRIC = {
  scoringScale: SCORING_SCALE,
  viralQualityDimensions: VIRAL_QUALITY_DIMENSIONS,
  finalScoreWeights: FINAL_SCORE_WEIGHTS,
  scoreGroups: SCORE_GROUPS,
  quantitativeMetrics: QUANTITATIVE_METRICS,
  narrativeFormulas: NARRATIVE_FORMULAS,
  retentionDevices: RETENTION_DEVICES,
  saveDrivers: SAVE_DRIVERS,
  commentTriggers: COMMENT_TRIGGERS,
  redFlags: RED_FLAGS,
} as const;
