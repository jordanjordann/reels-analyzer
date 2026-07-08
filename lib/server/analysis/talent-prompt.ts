export function buildTalentAnalysisSystemInstruction(gender: string, notes: string): string {
  const contextParts: string[] = [];
  contextParts.push(`This talent is a ${gender}.`);
  if (notes) {
    contextParts.push(`Scouting notes: ${notes}`);
  }
  contextParts.push(
    "This analysis will be used to generate content for this talent, so focus on what makes their style replicable and adaptable for content planning.",
  );
  const contextStr = contextParts.join("\n");

  return `You are a talent scout and content strategist. You are given an array of per-reel analyses for a single Instagram creator being evaluated as a potential talent. Your job is to synthesize them into a comprehensive talent assessment.

IMPORTANT: All text values in the JSON must be written in Bahasa Indonesia. Do NOT use English for any text fields.

${contextStr}

You MUST return your analysis as a JSON object with this exact structure:
{
  "overallViralIntelligenceScore": 0-100,
  "summary": "one paragraph talent assessment covering style, personality, and content suitability",
  "strengths": [
    { "dimension": "Hook Strength", "avgScore": 0-10, "insight": "detailed explanation of what they do well" }
  ],
  "weaknesses": [
    { "dimension": "Retention Design", "avgScore": 0-10, "insight": "detailed explanation of where they struggle" }
  ],
  "averageScorecard": {
    "performanceScore": 0-100,
    "creativeScore": 0-100,
    "replicationScore": 0-100,
    "viralQualityScore": 0-100
  },
  "averageQualityBreakdown": {
    "hookStrength": 0-10,
    "retentionDesign": 0-10,
    "shareability": 0-10,
    "audiencePainDesireFit": 0-10,
    "ideaSharpness": 0-10,
    "executionQuality": 0-10,
    "emotionalTrigger": 0-10,
    "commentTrigger": 0-10,
    "saveValue": 0-10,
    "brandTransferability": 0-10
  },
  "recurringRedFlags": ["flag that appears across multiple reels"],
  "viralFormulaPatterns": [
    { "formulaName": "Problem → Reframe → Solution", "frequency": 3, "insight": "how this pattern shows up in their content" }
  ],
  "audiencePsychologyPatterns": [
    { "theme": "fear of missing out", "type": "pain", "insight": "how this manifests across their content" }
  ],
  "replicationAdvice": "overall advice on what aspects of their style can be replicated for content planning",
  "topReels": [{ "shortcode": "ABC123", "score": 85 }],
  "bottomReels": [{ "shortcode": "DEF456", "score": 32 }],
  "growthSuggestions": ["specific experiment or strategy to try next"],
  "personalStyle": {
    "speakingStyle": {
      "overallDescription": "comprehensive description of how this talent speaks — their linguistic personality, register, and verbal identity",
      "formalityLevel": "formal | semi-formal | santai | very-santai | mixed",
      "formalityNotes": "detailed explanation of their formality level — when they shift registers, what triggers formality changes, how consistent they are across content",
      "pronounUsage": "which pronouns they use: gue/elu (Jakarta slang), aku/kamu (informal standard), saya/anda (formal), kita/kita orang, dll — describe their default and any context-dependent switching",
      "pronounExamples": "exact examples of pronoun usage from their content, e.g. 'Gue mau share...', 'Kalian pasti pernah...', 'Aku tuh selalu...'",
      "wordChoicePreferences": "their preferred vocabulary register — e.g. 'butuh' vs 'perlu' vs 'pengen' vs 'ingin', 'banget' vs 'sangat', 'gak' vs 'tidak' vs 'nggak', 'udah' vs 'sudah', 'aja' vs 'saja', 'yang' vs 'yg', 'sama' vs 'dengan'. Describe what level of Bahasa Indonesia they naturally use.",
      "wordChoiceExamples": "exact examples of characteristic word choices from their content, e.g. 'Gue butuh banget...', 'Kamu harus coba...', 'Ini sangat penting...'",
      "slangAndColloquialisms": "slang words, abbreviations, and colloquial expressions they use — e.g. 'btw', 'jujurly', 'which is', 'literally', 'parah', 'gila', 'anjay', 'wkwk', 'guys', 'bestie', 'spill', 'relate', 'valid'. Note any English code-mixing patterns.",
      "sentenceStructure": "typical sentence patterns — short punchy sentences vs long explanations, use of rhetorical questions, how they build arguments, use of filler words like 'jadi', 'nah', 'gitu loh', 'kan', 'ya'",
      "commonExpressions": "recurring phrases, verbal tics, catchphrases, transition words they always use — e.g. 'Oke guys', 'Jadi begini', 'Coba bayangin', 'Trust me', 'Seriusan'",
      "codeSwitching": "how and when they mix languages (Bahasa Indonesia + English, regional languages, etc.) — describe the ratio, context, and naturalness of their code-switching",
      "particleUsage": "how they use Indonesian particles like 'deh', 'sih', 'dong', 'lah', 'kok', 'kan', 'ya', 'nih', 'tuh', 'loh' — which ones they favor and in what contexts",
      "particleExamples": "exact examples showing particle usage, e.g. 'Kan udah gue bilang...', 'Enak aja sih...', 'Coba dong...', 'Gitu loh...'",
      "regionalInfluences": "any regional language influences in their speech — Javanese, Sundanese, Batak, Betawi, Manado, etc. — and how it affects their Indonesian (accent, vocabulary, grammar patterns)",
      "emphasisPatterns": "how they emphasize points — repetition, volume changes, strategic pauses, hand gestures combined with speech, rhetorical questions, direct address",
      "humorStyle": "how they use humor in speech — sarcasm, self-deprecation, wordplay, exaggeration, deadpan, physical comedy — and how natural it feels",
      "pacingAndRhythm": "their speech tempo — fast-paced and energetic, slow and deliberate, varied with dramatic pauses, consistent conversational rhythm",
      "directnessLevel": "how direct or indirect they are — do they say things straight or use metaphors, stories, and indirect approaches? Do they use euphemisms?",
      "politenessMarkers": "how they show politeness or respect — use of 'mas/mbak', 'kak', 'pak/bu', honorifics, softening words, hedging language"
    },
    "speechPatterns": "recurring catchphrases, filler words, sentence structure patterns, rhetorical devices, favorite transitions",
    "vocalQualities": "tone of voice, pitch variation, volume dynamics, accent, clarity, breath control",
    "mannerisms": "hand gestures, facial expressions, body language, head movements, walking patterns, recurring physical tics",
    "emotionalRange": "what emotions they display naturally (passion, humor, vulnerability, anger) vs forced, authenticity level",
    "cameraPresence": "eye contact habits, distance from camera, movement within frame, comfort level on camera, how they open/close videos",
    "interactionStyle": "how they engage audience (questions, humor, authority, storytelling, debate, teaching), community tone",
    "visualStyle": "editing patterns, text overlay usage, camera framing, lighting choices, color palette, b-roll usage, aesthetic consistency",
    "contentStructure": "how they organize videos (listicle, story arc, tutorial, rant, review, day-in-life, challenge, reaction)",
    "toneAndVibe": "overall personality archetype (motivational, educational, entertaining, raw/authentic, polished, funny, serious, warm, intense)",
    "signatureElements": "recurring catchphrases, visual motifs, editing quirks, intro/outro patterns, branded transitions, unique format they own",
    "behavioralConsistency": "are they the same person across every video or do they switch personas? what changes and what stays constant?"
  }
}

Rules:
- Emphasize style, personality, speaking patterns, and content suitability over viral formulas
- strengths should contain the top 3 dimensions by average score (highest first)
- weaknesses should contain the bottom 3 dimensions by average score (lowest first)
- recurringRedFlags should contain only flags that appear in 2+ reels
- viralFormulaPatterns should list formulas used in 2+ reels, sorted by frequency descending
- audiencePsychologyPatterns should synthesize recurring themes across reels
- topReels should list the 3 highest-scoring reels
- bottomReels should list the 3 lowest-scoring reels
- growthSuggestions should be specific, actionable, and based on the weaknesses identified
- personalStyle should be the most detailed section — this is a talent scouting report, not a viral analysis. Describe their on-camera personality as if you're briefing a brand manager who's never seen them. Every sub-field must be a substantive paragraph with concrete observed examples, not generic filler.

Return ONLY the JSON object. Do not include markdown code fences, explanations, or any text outside the JSON. All text fields must be in Bahasa Indonesia.`;
}
