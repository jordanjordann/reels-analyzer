# TECH DESIGN: Reels Analyzer — Profile Analysis

## Migration (`migrations/005_profile_analyses.sql`)

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

---

## Phase 1: Backend Foundation

### 1a. Create migration file

**File**: `migrations/005_profile_analyses.sql`
- Copy the SQL above.
- No need to apply in code — same pattern as existing migrations (manually applied or via script).

### 1b. Shared types

**File**: `lib/shared/analysis/profile-types.ts`

```typescript
export type ProfileStrengthWeakness = {
  dimension: string;
  avgScore: number;
  insight: string;
};

export type ViralFormulaPattern = {
  formulaName: string;
  frequency: number;
  insight: string;
};

export type AudiencePsychologyPattern = {
  theme: string;
  type: "pain" | "desire" | "identity";
  insight: string;
};

export type ProfileAnalysis = {
  overallViralIntelligenceScore: number;
  summary: string;
  strengths: ProfileStrengthWeakness[];
  weaknesses: ProfileStrengthWeakness[];
  averageScorecard: {
    performanceScore: number;
    creativeScore: number;
    replicationScore: number;
    viralQualityScore: number;
  };
  averageQualityBreakdown: Record<string, number>;
  recurringRedFlags: string[];
  viralFormulaPatterns: ViralFormulaPattern[];
  audiencePsychologyPatterns: AudiencePsychologyPattern[];
  replicationAdvice: string;
  topReels: Array<{ shortcode: string; score: number }>;
  bottomReels: Array<{ shortcode: string; score: number }>;
  growthSuggestions: string[];
};
```

### 1c. Gemini prompt + generation logic

**File**: `lib/server/analysis/profile-analysis.ts`

**Function**: `generateProfileAnalysis(username: string): Promise<void>`

**Steps**:
1. Query DB for all reels of this user, joined with their latest analysis:
   ```sql
   SELECT a.content, a.viral_intelligence_score
   FROM reels r
   INNER JOIN analyses a ON a.reel_id = r.id
   WHERE r.username = ?
   ORDER BY a.created_at DESC
   ```
   (Use `LEFT JOIN ... WHERE a.id IS NOT NULL` to ensure only analyzed reels)

2. Parse each `content` string through `parseStructuredAnalysis()`. Collect valid `ReelAnalysis` objects.

3. If fewer than 2 valid analyses, skip (not enough data).

4. Build system instruction:
   - Same pattern as `buildPerReelSystemInstruction()` in `analysis-rubric.ts`
   - Tells Gemini: "You are a viral content analyst. You are given an array of per-reel analyses for a single creator. Synthesize them into a profile-level analysis."
   - Specifies the exact JSON schema of `ProfileAnalysis`

5. Build user prompt:
   - Contains the array of `ReelAnalysis` objects as a JSON string
   - Asks Gemini to return ONLY the JSON object

6. Call `analyzeReels` with:
   - `fileUris: []` (no video needed — we're sending text)
   - `systemInstruction`: the profile analysis instruction
   - `userPrompt`: the serialized array of analyses
   - Note: `analyzeReels` currently requires fileUris. Either modify it to accept empty, or create a new `analyzeTextOnly(systemInstruction, userPrompt)` function.

7. Parse Gemini response (extract JSON, same pattern as `parseStructuredAnalysis` but using the `ProfileAnalysis` schema).

8. Upsert into `profile_analyses` table:
   ```sql
   INSERT INTO profile_analyses (id, username, content, raw_gemini, user_prompt, reel_count, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
   ON CONFLICT(username) DO UPDATE SET
     content = excluded.content,
     raw_gemini = excluded.raw_gemini,
     user_prompt = excluded.user_prompt,
     reel_count = excluded.reel_count,
     updated_at = datetime('now')
   ```

9. Helper function: `validateProfileAnalysis(parsed: unknown): ProfileAnalysis | null`
   - Validates required fields exist and have correct types
   - Returns null if validation fails

**Gemini model**: Same `GEMINI_MODEL` env var, or default to `gemini-2.5-flash`.

### 1d. API route

**File**: `app/api/profile-analysis/route.ts`

```
GET  /api/profile-analysis?username=...
POST /api/profile-analysis?username=...
```

**GET handler**:
1. Auth check
2. Extract `username` from searchParams
3. Query DB: `SELECT content, raw_gemini, user_prompt, reel_count, updated_at FROM profile_analyses WHERE username = ?`
4. If not found, return `{ profile: null }`
5. Parse `content` JSON into `ProfileAnalysis` type
6. Return `{ profile: { ...parsed, reelCount, updatedAt } }`

**POST handler**:
1. Auth check
2. Extract `username`
3. Call `generateProfileAnalysis(username)` — synchronous, wait for it
4. Return the updated profile (re-fetch from DB)

**Runtime**: `nodejs` (same as analyze route)

---

## Phase 2: Frontend Hooks

### 2a. Query keys

**File**: `lib/api/profile-analysis/constants.ts`

```typescript
export const PROFILE_ANALYSIS_KEYS = {
  all: ["profile-analysis"] as const,
  detail: (username: string) => [...PROFILE_ANALYSIS_KEYS.all, username] as const,
};
```

### 2b. API fetch functions

**File**: `lib/api/profile-analysis/api.ts`

```typescript
import type { ProfileAnalysis } from "@/shared/analysis/profile-types";

export type ProfileAnalysisResponse = {
  profile: (ProfileAnalysis & { reelCount: number; updatedAt: string }) | null;
};

export async function getProfileAnalysis(username: string): Promise<ProfileAnalysisResponse> {
  return fetchJson<ProfileAnalysisResponse>(`/api/profile-analysis?username=${encodeURIComponent(username)}`);
}

export async function refreshProfileAnalysis(username: string): Promise<ProfileAnalysisResponse> {
  return fetchJson<ProfileAnalysisResponse>(
    `/api/profile-analysis?username=${encodeURIComponent(username)}`,
    { method: "POST" },
  );
}
```

`fetchJson` imports from `@/api/analyses/api` or extract to a shared utility.

### 2c. React Query hooks

**File**: `lib/api/profile-analysis/hooks.ts`

```typescript
export function useProfileAnalysis(username: string | null) {
  return useQuery({
    queryKey: PROFILE_ANALYSIS_KEYS.detail(username ?? ""),
    queryFn: () => getProfileAnalysis(username!),
    enabled: !!username,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useRefreshProfileAnalysis(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refreshProfileAnalysis(username),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_ANALYSIS_KEYS.detail(username) });
    },
  });
}
```

### 2d. Trigger after batch

**File**: `app/api/analyze/route.ts` (modified)

After the per-reel analysis storage loop (after line 199), add:

```typescript
import { generateProfileAnalysis } from "@/server/analysis/profile-analysis";

// Fire-and-forget profile analysis regeneration
if (username && result.perReelResults.length > 0) {
  const normalizedUsername = normalizeUsername(username);
  generateProfileAnalysis(normalizedUsername).catch((err) => {
    console.error(`Profile analysis failed for ${normalizedUsername}:`, err);
  });
}
```

---

## Phase 3: UI Component

### 3a. ProfileAnalysisTab component

**File**: `components/analyses/profile-analysis-tab.tsx`

**Props**: `{ username: string }`

**Sections**:

1. **Score Header**
   - Score ring (same SVG as `AnalysisResults`) showing `overallViralIntelligenceScore`
   - Summary paragraph next to it
   - Reel count + last updated timestamp

2. **Scorecard Averages**
   - 4 mini cards in a row (performance, creative, replication, viral quality)
   - Each shows label + numeric score (0-100)
   - Color coded (green >= 80, yellow >= 60, orange >= 40, red < 40)

3. **Strengths & Weaknesses**
   - Two columns side by side
   - Left: Top 3 strengths, each with dimension name, bar, score, and insight text
   - Right: Bottom 3 weaknesses, same format
   - Use existing `qualityBar()` helper from `reel-breakdown.tsx`

4. **Quality Breakdown**
   - 10 dimension bars (same as `ReelBreakdown`'s), but averaged
   - Group into single list

5. **Viral Formula Patterns**
   - Table or tag list showing formula names + frequency count + insight
   - Example: "Problem → Reframe → Solution (used in 3/8 reels)"

6. **Audience Psychology**
   - Grouped by type (pain / desire / identity)
   - Each theme shown as a card with insight text

7. **Recurring Red Flags**
   - Tags/chips (same style as `ReelBreakdown` red flags)
   - Show unique set with count if >1 occurrence

8. **Replication Advice**
   - Single text block rendered via `MarkdownRenderer`

9. **Top / Bottom Reels**
   - Simple list: shortcode + score
   - No image (compact)

10. **Growth Suggestions**
    - Ordered list (same style as experiments in `ReelBreakdown`)

11. **Footer**
    - "Refresh Analysis" button (calls `useRefreshProfileAnalysis`)
    - Shows loading spinner while refreshing
    - "Last updated: ..." + "Based on N reels"
    - Empty state: if no profile analysis exists yet, show "Analyze at least 2 reels to see profile insights" with a prompt

### 3b. Wire into user page

**File**: `app/analyses/[username]/page.tsx` (modified)

In the profile tab section, replace placeholder with:

```tsx
import { ProfileAnalysisTab } from "@/components/analyses/profile-analysis-tab";
// ...
{activeTab === "profile" && (
  <ProfileAnalysisTab username={username} />
)}
```

---

## Phase 4: Polish & Verification

### 4a. Build check

```bash
npm run build
npm run lint
```

### 4b. Edge Cases
- 0 reels analyzed → show empty state
- 1 reel analyzed → show empty state with "analyze at least 2 reels" message
- Gemini returns invalid JSON → log error, show stale cached version if available
- Gemini call fails → keep existing cached analysis, show error toast on manual refresh

### 4c. Loading & Error States
- **Loading**: Skeleton placeholders matching the component structure
- **Error**: Error message with retry button
- **Empty**: "No profile analysis yet" with explanation

---

## Key Implementation Notes

### Reusing `analyzeReels` for text-only

The existing `analyzeReels` in `lib/server/analysis/gemini.ts` accepts `fileUris: string[]`. We can:
- Call it with an empty array `[]` — it will work as long as the model accepts text-only input
- Verify that `gemini-2.5-flash` handles text-only prompts (it does)

Alternatively, extract a `generateContent(systemInstruction, userPrompt)` helper that `analyzeReels` also uses internally.

### Parsing Gemini response

Create `parseProfileAnalysis(text: string): ProfileAnalysis | null` in `lib/shared/analysis/profile-types.ts`:
- Same strategy as `parseStructuredAnalysis`: extract JSON, validate schema, return typed object or null

### Concurrency

`generateProfileAnalysis` is a fire-and-forget background task. It should not block the API response of the analyze route. If the user manually refreshes via POST, it runs synchronously and the API waits.

---

## File Summary

| File | Action |
|------|--------|
| `migrations/005_profile_analyses.sql` | **Create** |
| `lib/shared/analysis/profile-types.ts` | **Create** — types + parser |
| `lib/server/analysis/profile-analysis.ts` | **Create** — generator + prompt |
| `app/api/profile-analysis/route.ts` | **Create** — GET + POST |
| `lib/api/profile-analysis/constants.ts` | **Create** |
| `lib/api/profile-analysis/api.ts` | **Create** |
| `lib/api/profile-analysis/hooks.ts` | **Create** |
| `components/analyses/profile-analysis-tab.tsx` | **Create** |
| `app/api/analyze/route.ts` | **Modify** — add trigger |
| `app/analyses/[username]/page.tsx` | **Modify** — wire tab |
