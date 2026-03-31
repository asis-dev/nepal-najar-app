# Nepal Republic — Project Context

## What this app is
Nepal Republic (नेपाल रिपब्लिक) is an AI-powered civic accountability platform tracking Nepal's RSP government commitments. Domain: nepalrepublic.org. Built with Next.js 14, Supabase, Tailwind, React Query. Monorepo at `apps/admin-web/`.

## Deployment
- **Host:** Vercel
- **Deploy command:** `cd /Users/priyanka.shrestha/Desktop/nepal-progress && npx vercel --prod` (runs ONCE, deploys directly to production)
- **DO NOT** use turbo (costs too much)
- **DO NOT** run `vercel` then `vercel --prod` separately — that deploys twice
- Supabase URL: `https://kmyftbmtdabuyfampklz.supabase.co`
- Database connection: see `.env.local` for `DATABASE_URL`

## Branding
- Name: **Nepal Republic** (नेपाल रिपब्लिक)
- Scoring: "Republic Score" with A-F letter grades
- Colors: Nepal flag red (#DC143C) + blue (#003893)
- Previously called "Nepal Najar" then "GhantiCard" — fully rebranded to Nepal Republic

## Key Architecture

### Data Flow
- Supabase `promises` table (109 rows) → `lib/data/index.ts` `getPromises()` → enriches with `keyOfficials`/`keyMinistries` from knowledge base → serves to frontend
- Falls back to static `lib/data/promises.ts` if Supabase fails
- `scraped_articles` (1,567 rows) — news articles linked to commitments via `promise_ids`
- `evidence_vault` (71 rows) — research evidence with quotes, sources, verification status
- `intelligence_signals` (1,642 rows) — raw signals from RSS/YouTube/social scrapers
- `commitment_briefings` — cached AI-generated briefings (6h TTL), pre-warmed during sweep

### Intelligence Pipeline
- **Sweep** (`lib/intelligence/sweep.ts`): Orchestrates ALL collectors → RSS (80+ feeds), YouTube (17 channels), Facebook (28 pages), X (16 accounts), TikTok, Threads, Telegram, Reddit, Google Trends, Parliament, Gov Portals
- **Vercel crons** in `vercel.json`: Full sweep every 4h, RSS-only hourly, worker every 15min
- **Commitment discovery** (`lib/intelligence/commitment-discovery.ts`): AI scans signals for NEW commitments beyond the 109
- **Source discovery** (`lib/intelligence/source-discovery.ts`): AI suggests new sources to add based on signal patterns
- **Briefing pre-warm**: After each sweep, auto-regenerates briefings for commitments with new signals
- **Matcher** (`lib/scraper/matcher.ts`): Keyword matching for all 109 commitments (15-20 keywords each)
- **Knowledge base** (`lib/intelligence/knowledge-base.ts`): Deep context for each commitment — used by AI brain for classification

### Key Files
```
lib/data/promises.ts              — 109 commitments (static fallback)
lib/data/research-evidence.ts     — baseline research data with sources
lib/data/ghanti-score.ts          — scoring system (A-F grades)
lib/intelligence/sweep.ts         — main intelligence orchestrator
lib/intelligence/knowledge-base.ts — AI context for each commitment
lib/intelligence/commitment-discovery.ts — discovers NEW commitments
lib/intelligence/source-discovery.ts     — discovers new sources
lib/intelligence/commitment-briefing.ts  — AI briefing with caching
lib/scraper/matcher.ts            — keyword matching all 109
lib/intelligence/collectors/rss.ts       — 80+ RSS feeds + YouTube
lib/intelligence/collectors/facebook-scraper.ts — 28 Facebook pages
components/ui/ghanti-icon.tsx     — bell icon component (4 colors, 5 sizes)
components/ui/ghanti-card-mark.tsx — logo (gold bell)
app/(landing)/page.tsx            — home/feed page
app/(public)/explore/first-100-days/ — commitment tracker + detail
app/(public)/report-card/page.tsx — report card page
scripts/prewarm-briefings.ts      — bulk briefing generation
scripts/seed-research-evidence.js — seed evidence into Supabase
```

## What Was Completed (as of March 25, 2026)

### Research & Data
- All 109 commitments researched with real baseline data, progress %, sources
- Database updated: 58 not_started, 45 in_progress, 6 stalled (was all zeros)
- Knowledge base fixed — 34 entries had WRONG titles causing AI misclassification
- Matcher keywords added for IDs 36-109 (were completely missing)
- 30 real articles + 15 evidence vault entries seeded
- Actors populated on all commitments from knowledge base

### Intelligence Pipeline
- 28 new RSS sources added (international orgs, think tanks, YouTube, sector-specific)
- 11 YouTube channels added (News24, Kantipur, NTV, Balen Shah, etc.)
- Sasmit Pokhrel (website + Facebook) added
- Source discovery AI built and wired into sweep
- Briefing pre-warming wired into sweep
- Signal source name resolution (no more "rss-" prefixes)

### UI
- Full rebrand: Nepal Najar → Nepal Republic (77 files, 3 renamed)
- Bell icons replace all status dots/emoji
- Grade badges (A-F) on commitment cards
- Status-colored left borders (red=stalled, green=progress)
- Stalled = striped progress bars, Delivered = shimmer
- Landing hero with inline grade + score
- Mobile daily brief expand/collapse
- Briefing deferred via requestIdleCallback
- Search enhanced (summary, actors, slug fields + current government people)
- Logo: gold bell SVG

## What Needs To Be Done Next

### Priority 1 — Government Bodies Scorecard (new 5th tab)
- Group commitments by responsible ministry using `keyMinistries` from knowledge base
- Compute per-ministry score (avg progress)
- New page: each ministry with grade, commitment count, status breakdown
- Drill-down: tap ministry → its commitments, minister, evidence
- Answers "WHO specifically is failing?"
- Existing data: knowledge base has keyMinistries for every commitment

### Priority 2 — Report Card mobile fix
- Cards bleed off right edge in "What's Working" / "What's Not Working" sections
- Files: `components/public/report-card/whats-working.tsx`, `whats-not-working.tsx`

### Priority 3 — Tracker vs Home differentiation
- Too similar — both show commitment cards
- Tracker needs compact filters (collapse into single row with dropdowns)
- Home should be daily newspaper, Tracker should be reference database

### Priority 4 — Historical bulk scan
- Scrape news archives from **last 6 months** (Oct 2025 → Mar 2026)
- Run commitment discovery to find NEW commitments beyond 109
- Transcribe key YouTube videos (Balen speeches, parliamentary debates)
- Estimated: 10K-20K articles, ~$5-10 cost
- Script needs to be built

### Priority 5 — Schedule recurring scrapes
- Vercel crons configured but only fire when deployed
- Need to decide frequency

### Other Items
- Desktop sidebar layout for landing page
- 90 pending discovery jobs need worker run to process
- Community_commitments table is empty (discovery hasn't run yet)
