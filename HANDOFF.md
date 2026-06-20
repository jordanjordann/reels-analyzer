# Handoff — Reels Analyzer Video Pipeline Fix

## Project
Instagram Reels Analyzer — single-user web app. Accepts IG username + freeform prompt, scrapes the account's Reels, sends video context to Gemini for analysis. All sessions, messages, and metadata persisted to SQLite/Turso.

**Stack:** Next.js 16 App Router, Tailwind v4, shadcn/ui (base-nova), Turso/SQLite, bcryptjs, Playwright, TypeScript, Google Generative AI SDK, yt-dlp.

## Current State
- Phase 1 (auth, scaffold, theme) — **committed** (`7f8d533`)
- Phase 2 (session/message CRUD, sidebar, conversation UI) — **committed** (`485e09a`)
- Phase 3 (Instagram scraper with session persistence) — **committed** (`0fda4d1`)
- Phase 4 (Gemini video analysis pipeline) — **implemented, uncommitted**
- Phase 5 (video pipeline fixes) — **implemented, uncommitted** (this session)

## What Was Done This Session

### Problem
The error `"No reel videos available to analyze. Scraping may have failed to extract video URLs"` was occurring because:
1. The scraper used fragile regex-based extraction that failed against Instagram's dynamic HTML
2. No `yt-dlp` integration despite the implementation plan specifying it
3. No fallback when video extraction failed

### Changes Implemented

#### New Files
| File | Purpose |
|------|---------|
| `lib/downloader.ts` | yt-dlp execution wrapper: video download, URL extraction, retry logic, temp file cleanup |

#### Modified Files
| File | Change |
|------|--------|
| `lib/scraper.ts` | Added yt-dlp as primary video URL extractor; changed `waitUntil` from `networkidle` to `domcontentloaded` (Instagram never settles); removed broken API route interception; added metadata extraction (caption, viewCount, postDate, durationSec) from individual reel pages; fixed route cleanup with `unrouteAll` |
| `lib/gemini.ts` | Replaced `fetch()` video download with `downloadVideo()` from downloader; improved file polling with max count; added cleanup via `cleanupFile()` |
| `lib/prompt-router.ts` | Added partial failure handling — no longer throws when no videos available; falls back to metadata-only analysis; reports `videoCount`, `totalCount`, `usedMetadataOnly` |
| `lib/analysis-rubric.ts` | Added `buildMetadataOnlyPrompt()` for fallback; updated `buildUserPrompt()` to include metadata |
| `lib/sessions.ts` | Updated `storeReels()` to persist caption, viewCount, postDate, durationSec |
| `app/api/analyze/route.ts` | Added contextual prefixes when videos are partially/fully unavailable |

#### Model Change
- Changed from `gemini-1.5-pro` (deprecated, returns 404) to `gemini-2.5-flash` (available, supports video, free tier)

### Test Results
- ✅ Scraper finds 12 reels for `@natgeo`
- ✅ All 12 reels have video URLs extracted via yt-dlp
- ✅ Videos download successfully (5MB–23MB each)
- ✅ Metadata extraction working (captions, view counts, dates, durations)
- ⚠️ Gemini API credits were depleted during testing (429 errors)
- ✅ Metadata-only fallback works correctly when videos fail

## Known Issues

1. **yt-dlp PATH**: Installed via `pip3` at `/Users/jordanatha/Library/Python/3.9/bin/yt-dlp`. The downloader includes this path in `YTDLP_PATHS` and adds it to `PATH` in `execFileAsync` env. May need adjustment on different machines.

2. **ffmpeg missing**: yt-dlp warns about ffmpeg not being found. Video downloads still work but may not get optimal format. Install via `brew install ffmpeg` or equivalent.

3. **Gemini billing**: The API key had depleted prepayment credits (429 errors). Need to add credits at https://ai.studio/projects OR switch to a model with free tier quota.

4. **Scrape speed**: Full scrape + video extraction takes ~2-3 minutes for 12 reels. Each individual reel page visit adds ~5-10s.

5. **Python 3.9 deprecation**: yt-dlp warns that Python 3.9 support is deprecated. Upgrade to Python 3.10+ if possible.

6. **Next.js 16 breaking changes**: API routes use `RouteContext<"/api/sessions/[id]">` pattern. Always read `node_modules/next/dist/docs/` before writing new routes.

7. **shadcn/ui theme**: The original Nova theme preset is no longer available. Adding new shadcn components will fail unless theme is re-initialized locally.

## Credentials
Stored in `.env` (gitignored):
- `INSTAGRAM_USERNAME` — burner account username
- `INSTAGRAM_PASSWORD` — burner account password
- `GEMINI_API_KEY` — Google Gemini API key
- `APP_SESSION_SECRET` — HMAC signing key (dev fallback exists)

## Key Files
| File | Purpose |
|------|---------|
| `lib/downloader.ts` | yt-dlp wrapper: download, extract URL, cleanup |
| `lib/scraper.ts` | Playwright Instagram scraper with yt-dlp + metadata extraction |
| `lib/gemini.ts` | Gemini File API upload + content generation (gemini-2.5-flash) |
| `lib/prompt-router.ts` | Analysis pipeline orchestrator with fallback |
| `lib/analysis-rubric.ts` | System instruction + scoring rubric + prompt builders |
| `lib/sessions.ts` | Session/message/reel CRUD |
| `lib/auth.ts` | PIN auth, bcrypt, session cookies |
| `lib/db.ts` | libSQL/Turso database client |
| `app/api/analyze/route.ts` | Analyze endpoint (scrape + upload + Gemini) |
| `migrations/001_initial.sql` | Base schema |
| `migrations/002_video_url.sql` | Added `video_url` column |

## Next Steps

1. **Fix Gemini billing** — Add credits to the API key or verify free tier quota for `gemini-2.5-flash`
2. **Install ffmpeg** — `brew install ffmpeg` for optimal video format handling
3. **Commit Phase 4 + 5** — Stage and commit all uncommitted changes
4. **Test full pipeline** — Run end-to-end test with video analysis (not just metadata fallback)
5. **Optimize scrape speed** — Consider parallelizing individual reel page visits or caching metadata
6. **Frontend polish** — Render structured analysis results (scores, per-reel breakdown) instead of raw text
7. **Add `scripts/verify-env.ts`** — Listed in implementation plan but missing

## Suggested Skills
- `frontend-design` — For rendering structured analysis results (scores, per-reel breakdown, cross-reel summary) in the UI
- `development-cycle` — For committing changes and moving to next phase
