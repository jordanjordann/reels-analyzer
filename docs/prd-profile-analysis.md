# PRD: Reels Analyzer — Profile Analysis

## 1. Executive Summary

- **Problem**: The Profile Analysis tab on the user page shows an empty placeholder. Users cannot see aggregated insights across all their analyzed reels.
- **Solution**: A server-generated Gemini synthesis of all per-reel analyses, stored in a new `profile_analyses` table, displayed in a stats-heavy tab with strengths, weaknesses, patterns, and recommendations.
- **Success Criteria**:
  - Profile analysis generates automatically after each batch completes
  - Display renders within 2s (cached result, no network wait for Gemini)
  - Manual "Refresh" button allows on-demand regeneration
  - All 10 quality dimensions, 5 scorecard metrics, red flags, viral formulas, and audience psychology patterns are surfaced in the UI

## 2. Database

**New migration `005_profile_analyses.sql`**:
```sql
CREATE TABLE IF NOT EXISTS profile_analyses (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  raw_gemini TEXT,
  user_prompt TEXT,
  reel_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profile_analyses_username ON profile_analyses(username);
```

## 3. Gemini Output Schema

Gemini will receive an array of all `ReelAnalysis` JSON objects for a user and must return:

```typescript
type ProfileAnalysis = {
  overallViralIntelligenceScore: number;
  summary: string;
  strengths: Array<{ dimension: string; avgScore: number; insight: string }>;
  weaknesses: Array<{ dimension: string; avgScore: number; insight: string }>;
  averageScorecard: {
    performanceScore: number;
    creativeScore: number;
    replicationScore: number;
    viralQualityScore: number;
  };
  averageQualityBreakdown: Record<string, number>;
  recurringRedFlags: string[];
  viralFormulaPatterns: Array<{
    formulaName: string;
    frequency: number;
    insight: string;
  }>;
  audiencePsychologyPatterns: Array<{
    theme: string;
    type: "pain" | "desire" | "identity";
    insight: string;
  }>;
  replicationAdvice: string;
  topReels: Array<{ shortcode: string; score: number }>;
  bottomReels: Array<{ shortcode: string; score: number }>;
  growthSuggestions: string[];
};
```

## 4. Architecture

### Data Flow
1. **After batch analysis completes** → trigger `generateProfileAnalysis(username)` in `analyze/route.ts`
2. **Server function** fetches all `analyses.content` rows for that user, parses them into `ReelAnalysis[]`, sends to Gemini
3. **Gemini response** parsed + validated → upserted into `profile_analyses` table
4. **Profile Analysis tab** fetches via `GET /api/profile-analysis?username=...` (new route), renders the cached result
5. **Manual refresh** calls `POST /api/profile-analysis?username=...` to re-trigger Gemini

### New Files
| File | Purpose |
|------|---------|
| `migrations/005_profile_analyses.sql` | New table |
| `lib/shared/analysis/profile-types.ts` | `ProfileAnalysis` type definition |
| `lib/server/analysis/profile-analysis.ts` | Gemini prompt + generation logic |
| `app/api/profile-analysis/route.ts` | GET + POST endpoints |
| `lib/api/profile-analysis/hooks.ts` | React Query hooks |
| `lib/api/profile-analysis/api.ts` | Fetch functions |
| `lib/api/profile-analysis/constants.ts` | Query keys |
| `components/analyses/profile-analysis-tab.tsx` | Full tab UI component |

### Modified Files
| File | Change |
|------|--------|
| `app/api/analyze/route.ts` | Fire-and-forget `generateProfileAnalysis()` after storing analyses |
| `app/analyses/[username]/page.tsx` | Wire `ProfileAnalysisTab` component into the profile tab |

## 5. UI Layout

The Profile Analysis tab will show:
- **Header**: Overall score ring (same style as AnalysisResults) + summary paragraph
- **Scorecard averages**: 4 mini score cards (performance, creative, replication, viral quality)
- **Strengths & Weaknesses**: Top 3 / Bottom 3 dimensions with bar charts + Gemini-written insight for each
- **Quality Breakdown**: 10-dimension bar chart (averaged)
- **Viral Formula Patterns**: Frequency distribution of formula names with insights
- **Audience Psychology**: Themes grouped by pain/desire/identity
- **Recurring Red Flags**: Tag list with frequency
- **Replication Advice**: Text block
- **Top / Bottom Reels**: Mini reel cards with scores
- **Growth Suggestions**: Ordered list
- **Footer**: "Refresh Analysis" button + last updated timestamp + reel count

## 6. Trigger Integration

In `app/api/analyze/route.ts`, after storing all per-reel analyses (line ~199), add:

```typescript
import { generateProfileAnalysis } from "@/server/analysis/profile-analysis";
// Fire and forget - don't block the response
void generateProfileAnalysis(username).catch(console.error);
```

## 7. Non-Goals
- No re-analysis history (only current snapshot)
- No charts/graphs library (pure CSS/SVG bars)
- No comparison between users
- No per-reel detail in the profile tab (modal still handles that)

## 8. Implementation Plan

### Phase 1: Backend Foundation
1. Create migration `005_profile_analyses.sql`
2. Create `lib/shared/analysis/profile-types.ts` with `ProfileAnalysis` type
3. Create `lib/server/analysis/profile-analysis.ts` with Gemini prompt logic and `generateProfileAnalysis()`
4. Create `app/api/profile-analysis/route.ts` with GET + POST handlers

### Phase 2: Frontend Hooks
5. Create `lib/api/profile-analysis/constants.ts`, `api.ts`, `hooks.ts`
6. Wire `generateProfileAnalysis()` trigger into `app/api/analyze/route.ts`

### Phase 3: UI Component
7. Create `components/analyses/profile-analysis-tab.tsx`
8. Wire it into `app/analyses/[username]/page.tsx`

### Phase 4: Polish
9. Build, lint, typecheck
10. Verify end-to-end flow
