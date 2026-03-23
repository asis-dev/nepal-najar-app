# Nepal Najar Intelligence Engine

Complete documentation for the AI-powered intelligence system that tracks Nepal Najar's dynamic government commitment universe.

## Architecture Overview

```
Signal Sources          Tier 1 (Classify)       Tier 3 (Analyze)        Output
──────────────         ──────────────────      ──────────────────      ──────────
RSS feeds (18+)  ─┐
YouTube channels ─┤
Web search       ─┼─→ intelligence_signals ─→ AI Classification ─→ AI Deep Analysis ─→ promise_updates
Social media     ─┤    (raw signals DB)        (cheap/fast model)     (smart model)      (evidence DB)
Gov portals      ─┤                            Filter relevant        Extract data       Update promise
Apify scrapers   ─┤                            Score 0.0-1.0          Cross-reference    status/progress
Legacy scrapers  ─┘                            Match to promises      Suggest changes
```

### Pipeline Flow

1. **Collection Phase**: Collectors scrape/fetch signals from all configured sources
2. **Tier 1 Classification**: Cheap AI model quickly classifies each signal (relevant/irrelevant, which commitments)
3. **Translation Phase**: Nepali signals that pass Tier 1 are translated to English
4. **Tier 3 Deep Analysis**: Smart AI model deeply analyzes relevant signals, extracts data, suggests commitment updates
5. **Evidence Collection**: Social/video evidence is extracted and linked to commitments
6. **Status Pipeline**: Reviewable status recommendations are generated and persisted
7. **Daily Rollup**: Activity metrics are computed per-commitment per-day

### Key Files

| File | Purpose |
|------|---------|
| `lib/intelligence/ai-router.ts` | AI model selection and routing (OpenClaw > OpenRouter > Gemini > Local) |
| `lib/intelligence/brain.ts` | Classification (Tier 1) and deep analysis (Tier 3) prompts and logic |
| `lib/intelligence/sweep.ts` | Full sweep orchestrator — runs all phases end-to-end |
| `lib/intelligence/knowledge-base.ts` | Seed commitment knowledge with metadata, indicators, key officials |
| `lib/intelligence/commitment-context.ts` | Live commitment catalog context used by AI prompts |
| `lib/intelligence/types.ts` | Classification types and normalization |
| `lib/intelligence/translate.ts` | Nepali-to-English signal translation |
| `lib/intelligence/promise-status-sync.ts` | Syncs AI suggestions to promise statuses |
| `lib/intelligence/status-pipeline.ts` | Persists reviewable status recommendations for commitments |
| `lib/intelligence/jobs.ts` | Queue/worker primitives for recurring intelligence work |
| `lib/intelligence/feedback-review.ts` | OpenClaw-powered citizen feedback triage, approval flow, and handoff generation |
| `lib/intelligence/daily-activity-rollup.ts` | Daily per-promise activity aggregation |
| `lib/intelligence/collectors/rss.ts` | RSS/Atom feed collector (18+ Nepal news feeds) |
| `lib/intelligence/collectors/youtube.ts` | YouTube channel monitor + caption extraction |
| `lib/intelligence/collectors/web-search.ts` | Google/SearXNG search for promise-specific queries |
| `lib/intelligence/collectors/social.ts` | Twitter/Facebook official account monitor |
| `lib/intelligence/collectors/apify.ts` | Apify-based Facebook profile scraper |
| `lib/intelligence/collectors/gov-portal.ts` | Government website scraper (opmcm.gov.np, etc.) |
| `lib/intelligence/collectors/search-query-generator.ts` | Generates search queries per promise |
| `lib/intelligence/evidence/social-collector.ts` | Social media evidence extractor |
| `lib/intelligence/evidence/youtube-extractor.ts` | YouTube evidence extractor |

### New Components (added March 2026)

| File | Purpose |
|------|---------|
| `lib/intelligence/dedup.ts` | Signal deduplication via Jaccard similarity + URL normalization |
| `lib/intelligence/status-pipeline.ts` | Evidence-based promise status recommendations |
| `lib/intelligence/commitment-discovery.ts` | Detects NEW commitments in signals (keyword + AI) |
| `lib/intelligence/collectors/facebook-scraper.ts` | Facebook page scraper (Apify or DuckDuckGo fallback) |
| `lib/intelligence/collectors/audio-transcriber.ts` | Audio/video transcription via Groq Whisper |
| `app/(dashboard)/feedback-review/page.tsx` | Operator inbox for reviewing and applying feedback autopilot decisions |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/intelligence/sweep` | POST | Trigger manual sweep (requires `Bearer SCRAPE_SECRET`) |
| `/api/intelligence/sweep` | GET | Trigger scheduled sweep (Vercel Cron) |
| `/api/intelligence/dedup` | POST/GET | Run dedup / get deduplicated count |
| `/api/intelligence/status-pipeline` | POST | Run status pipeline, list/review recommendations |
| `/api/intelligence/discoveries` | GET/POST | List pending new commitment discoveries, approve/reject |
| `/api/intelligence/facebook` | POST | Trigger Facebook page scrape |
| `/api/intelligence/transcribe` | POST | Transcribe audio/video URLs via Groq Whisper |
| `/api/intelligence/reclassify` | POST | Reset and reclassify signals |
| `/api/intelligence/worker` | POST/GET | Process queued intelligence jobs |
| `/api/admin/feedback` | GET/POST | List citizen feedback, queue autopilot reviews, or run them immediately |
| `/api/admin/feedback/[id]` | PATCH | Review, approve, reject, or apply a feedback autopilot decision |
| `/api/intelligence/status` | GET | System health and signal counts |
| `/api/intelligence/signals/[id]` | GET/PATCH/DELETE | View, edit, or soft-delete individual signals |
| `/api/admin/signals` | GET | List signals with filters (admin review page) |
| `/api/admin/signals/stats` | GET | Review stats and classification breakdown |
| `/api/admin/signals/conflicts` | GET | Commitments with conflicting signals |

## How to Start / Restart

### Development

```bash
cd apps/admin-web
npm run dev
# The app runs on http://localhost:3001 by default
```

### Triggering a Sweep Manually

```bash
# Full sweep (collection + analysis)
curl -X POST http://localhost:3001/api/intelligence/sweep \
  -H "Authorization: Bearer YOUR_SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'

# Analysis only (skip collection, re-analyze existing signals)
curl -X POST http://localhost:3001/api/intelligence/sweep \
  -H "Authorization: Bearer YOUR_SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"skipCollection": true}'

# Collection only (skip AI analysis)
curl -X POST http://localhost:3001/api/intelligence/sweep \
  -H "Authorization: Bearer YOUR_SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"skipAnalysis": true}'

# Custom batch size
curl -X POST http://localhost:3001/api/intelligence/sweep \
  -H "Authorization: Bearer YOUR_SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 30}'

# RSS-only mode (scheduled, lighter weight)
curl "http://localhost:3001/api/intelligence/sweep?secret=YOUR_SCRAPE_SECRET&mode=rss-only"
```

### Applying the New Intelligence DB Migrations

To enable the queue/worker tables and persisted status recommendations, run:

```bash
cd apps/admin-web
npm run db:migrate:intelligence
```

This applies:

- `supabase/011-commitment-public-model.sql`
- `supabase/012-intelligence-jobs-and-control.sql`
- `supabase/013-intelligence-status-recommendations.sql`
- `supabase/014-feedback-autopilot.sql`

For DB access, provide one of:

- `DATABASE_URL`
- `SUPABASE_DB_URL`
- `SUPABASE_DB_PASSWORD`

OpenClaw is not used for database migrations. It powers AI reasoning only.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access) |
| `SCRAPE_SECRET` | Auth token for the sweep API |

### Database Migration Access

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Full PostgreSQL connection string for direct migrations |
| `SUPABASE_DB_URL` | Alternate full PostgreSQL connection string |
| `SUPABASE_DB_PASSWORD` | Supabase DB password used to build the pooled PostgreSQL connection |

### AI Providers (at least one required)

Priority order: OpenClaw > OpenRouter > Gemini > Local

| Variable | Description |
|----------|-------------|
| `OPENCLAW_AUTH_PATH` | Path to OpenClaw auth profiles JSON. Defaults to `~/.openclaw/agents/main/agent/auth-profiles.json`. Contains OAuth bearer token for GPT 5.3 via OpenAI API. |
| `OPENCLAW_AGENT` | Dedicated OpenClaw agent ID for CLI mode. Use a separate lane such as `nepal-najar-autopilot` so scheduled runs do not contend with your interactive `main` agent. |
| `OPENROUTER_API_KEY` | OpenRouter API key (for DeepSeek R1, DeepSeek Chat) |
| `GEMINI_API_KEY` | Google Gemini API key (free tier Gemini Flash) |
| `OPENCLAW_API_KEY` / `OPENCLAW_ACCESS_TOKEN` | Optional explicit OpenClaw bearer token. If set, the engine can call OpenClaw without relying on the local CLI. |
| `AI_BASE_URL` | Local LM Studio URL (default: `http://localhost:1234/v1`) |
| `AI_API_KEY` | Local LM Studio API key (default: `lm-studio`) |
| `AI_MODEL` | Local model name (default: `qwen3.5-27b`) |

### Collectors

| Variable | Description |
|----------|-------------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 key (10,000 units/day free) |
| `GOOGLE_SEARCH_API_KEY` | Google Custom Search API key |
| `GOOGLE_SEARCH_CX` | Google Custom Search engine ID |
| `GROQ_API_KEY` | Groq API key (for Whisper transcription) |
| `APIFY_API_TOKEN` / `APIFY_TOKEN` | Apify token (for Facebook scraping) |
| `NEXT_PUBLIC_API_URL` | Base URL for internal API calls (default: `http://localhost:3001`) |
| `CRON_SECRET` | Vercel Cron secret for scheduled sweeps |
| `INTELLIGENCE_AUTO_STATUS_SYNC` | Set to `true` to allow automatic promise status writes during sweep status sync. Default is review-safe `false`. |
| `INTELLIGENCE_INLINE_DISCOVERY_WORKER` | Set to `true` to let the sweep process queued discovery jobs inline after enqueueing them. Default is `false`; queued worker route handles them separately. |
| `INTELLIGENCE_INLINE_STATUS_WORKER` | Set to `true` to let the sweep process the queued status-pipeline job inline. Default is `false`; queued worker route handles it separately. |

## OpenClaw Integration

The intelligence engine uses OpenClaw as the primary AI provider. It can run in two ways:

1. Token-backed API mode using `OPENCLAW_API_KEY` / `OPENCLAW_ACCESS_TOKEN` or the local auth profile
2. Local CLI mode using the OpenClaw binary when available

### How It Works

1. The router first looks for `OPENCLAW_API_KEY` / `OPENCLAW_ACCESS_TOKEN`
2. If those are absent, it reads `OPENCLAW_AUTH_PATH` (default: `~/.openclaw/agents/main/agent/auth-profiles.json`)
3. If a token is available, it uses a Bearer token against `https://api.openai.com/v1` with model `gpt-5.3-codex`
4. If no token is available but the local OpenClaw binary exists, it falls back to CLI mode using `OPENCLAW_AGENT` (default: `main`)
5. If OpenClaw is unavailable, the system falls back to OpenRouter, then Gemini, then local

### Feedback Autopilot

Citizen feedback can now be reviewed by OpenClaw before any operator action is taken.

Flow:

1. Feedback lands in `user_feedback`
2. OpenClaw scores usefulness, validity, actionability, and confidence
3. OpenClaw recommends a next action and drafts a handoff prompt
4. An operator approves, rejects, or applies the recommendation from `/feedback-review`

Low-risk autopilot state changes are stored on the feedback row itself; product or code changes still wait for human approval.

### Token Format

The auth profiles JSON has this structure:
```json
{
  "profiles": {
    "openai-codex:default": {
      "access": "sk-or-oauth-token-here"
    }
  }
}
```

### Override Path

Set `OPENCLAW_AUTH_PATH` env var to use a different location for the auth profiles file.

## What Each Collector Does

### RSS Collector (`collectors/rss.ts`)
- Fetches RSS/Atom feeds from 18+ Nepal news sources (English and Nepali)
- Sources include Kathmandu Post, Online Khabar, Setopati, eKantipur, Ratopati, etc.
- Deduplicates by URL before inserting into `intelligence_signals`
- Tags signals with language (en/ne) and related promise IDs

### YouTube Collector (`collectors/youtube.ts`)
- Monitors government and news YouTube channels
- Uses YouTube Data API v3 to find new videos
- Extracts captions/transcripts for AI analysis
- Tracks video metrics (views, likes)

### Web Search Collector (`collectors/web-search.ts`)
- Runs targeted search queries for each promise topic
- Uses Google Custom Search API or self-hosted SearXNG
- Finds evidence from sources not covered by RSS feeds
- Queries are promise-specific (e.g., "Nepal hydropower 30000 MW progress 2082")

### Social Media Collector (`collectors/social.ts`)
- Monitors Twitter/Facebook accounts of government officials
- Tracks relevant hashtags and mentions
- Captures policy announcements and official statements

### Apify Collector (`collectors/apify.ts`)
- Uses Apify cloud scrapers for Facebook profile scraping
- Collects posts from government officials' Facebook pages
- Extracts video transcripts where available

### Government Portal Collector (`collectors/gov-portal.ts`)
- Scrapes official government websites (opmcm.gov.np, mof.gov.np, etc.)
- Captures press releases, notices, and official documents
- Focuses on cabinet decisions and policy announcements

## AI Classification System

### Tier 1: Quick Classification

- **Model**: GPT 5.3 (OpenClaw) > DeepSeek Chat (OpenRouter) > Gemini Flash > Local Qwen
- **Purpose**: Rapidly classify each signal as relevant or irrelevant to any tracked commitment
- **Output**: relevance score (0.0-1.0), matched commitment IDs, classification type
- **Aggressive by design**: Defaults to relevant when in doubt. Only truly unrelated content (entertainment, sports gossip) gets "neutral"
- **Cost**: ~$0.002-0.01 per signal depending on model

### Tier 3: Deep Analysis

- **Model**: GPT 5.3 (OpenClaw) > DeepSeek R1 (OpenRouter) > Gemini Flash > Local Qwen
- **Purpose**: Extract structured data, cross-reference with other signals, suggest commitment status changes
- **Output**: Per-commitment analysis with extracted amounts, dates, percentages, officials, suggested status/progress
- **Aggressive by design**: Proactively suggests status changes, extracts all data points, creates entries for all affected commitments
- **Cost**: ~$0.01-0.05 per signal depending on model and content length

### Classification Types

| Type | Description |
|------|-------------|
| `confirms` | Signal provides evidence that promise is being fulfilled |
| `contradicts` | Signal suggests promise is being broken or delayed |
| `neutral` | Signal mentions the topic but no clear progress/regression |
| `budget_allocation` | Budget or funding has been allocated to the promise area |
| `policy_change` | A policy change affects the promise |
| `statement` | An official made a statement about the promise topic |

## Database Schema (Intelligence Tables)

### `intelligence_signals`
Main table storing all collected signals.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `source_id` | text | Collector source identifier |
| `signal_type` | text | Type of signal (rss, youtube, search, social, etc.) |
| `title` | text | Signal title |
| `content` | text | Full content/body |
| `url` | text | Source URL |
| `published_at` | timestamptz | Publication date |
| `discovered_at` | timestamptz | When we found it |
| `author` | text | Author name |
| `language` | text | Language code (en, ne) |
| `media_type` | text | Media type |
| `metadata` | jsonb | Additional metadata |
| `tier1_processed` | boolean | Has been through Tier 1 classification |
| `tier3_processed` | boolean | Has been through Tier 3 analysis |
| `relevance_score` | float | AI relevance score (0.0-1.0) |
| `matched_promise_ids` | int[] | Promise IDs this signal relates to |
| `classification` | text | Classification type |
| `confidence` | float | AI confidence (0.0-1.0) |
| `reasoning` | text | AI reasoning for classification |
| `extracted_data` | jsonb | Structured data extracted by Tier 3 |
| `corroborated_by` | uuid[] | IDs of corroborating signals |
| `review_required` | boolean | Needs human review |
| `review_status` | text | Human review status |
| `title_en` | text | English translation of title (for Nepali signals) |
| `summary_en` | text | English summary (for Nepali signals) |

### `intelligence_sweeps`
Records each sweep run.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `sweep_type` | text | scheduled, manual, or targeted |
| `status` | text | running, completed, partial, failed |
| `finished_at` | timestamptz | When sweep completed |
| `sources_checked` | int | Number of source types that returned data |
| `signals_discovered` | int | New signals found |
| `signals_relevant` | int | Signals passing Tier 1 filter |
| `promises_updated` | int | Promises that received updates |
| `tier1_signals` | int | Signals processed by Tier 1 |
| `tier2_enriched` | int | Signals enriched (e.g., captions extracted) |
| `tier3_analyzed` | int | Signals deeply analyzed by Tier 3 |
| `ai_tokens_used` | int | Total AI tokens consumed |
| `ai_cost_usd` | float | Estimated AI cost |
| `summary` | text | Human-readable sweep summary |

### `promise_updates`
Evidence entries linking signals to promises.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `promise_id` | int | Which promise this update is about |
| `article_id` | text | Source URL of the evidence |
| `field_changed` | text | Classification type of the change |
| `new_value` | jsonb | Contains confidence, suggestedStatus, suggestedProgress, extractedData |
| `change_reason` | text | AI reasoning for this update |

### `intelligence_quality_daily`
Daily quality metrics for monitoring.

| Column | Type | Description |
|--------|------|-------------|
| `date` | date | The date |
| `total_signals` | int | Total signals that day |
| `relevant_signals` | int | Signals with relevance >= 0.3 |
| `neutral_signals` | int | Signals classified as neutral |
| `confirms_signals` | int | Signals classified as confirms |
| `contradicts_signals` | int | Signals classified as contradicts |
| `avg_confidence` | float | Average AI confidence |
| `review_required_count` | int | Signals needing human review |
| `review_overrides_count` | int | Signals where human overrode AI |

## Troubleshooting

### All signals classified as "neutral"
- **Cause**: AI model is too conservative or not understanding the prompts
- **Fix**: The classification prompt has been rewritten to be aggressive. Ensure you are using GPT 5.3 via OpenClaw (check `getOpenClawToken()` returns a valid token). If falling back to Gemini Flash, results may be poor.
- **Verify**: Check `ai-router.ts` logs — which provider/model is being used?

### No AI provider available
- **Symptom**: All signals fail with connection errors
- **Fix**: Ensure at least one provider is configured. Check in order:
  1. `~/.openclaw/agents/main/agent/auth-profiles.json` exists and has a valid token
  2. `OPENROUTER_API_KEY` is set
  3. `GEMINI_API_KEY` is set
  4. LM Studio is running at `http://localhost:1234`

### Sweep times out
- **Cause**: Too many signals to process, or AI API is slow
- **Fix**: Use smaller batch sizes: `{"batchSize": 5}`. Or run analysis-only: `{"skipCollection": true}`
- **Note**: Vercel has a 300s (5 min) timeout for the sweep endpoint

### Nepali content not being matched
- **Cause**: AI model may not understand Nepali well
- **Fix**: GPT 5.3 handles Nepali better than smaller models. Ensure OpenClaw is the active provider.
- **Check**: Look at `title_en` and `summary_en` columns — are translations being generated?

### OpenClaw token expired
- **Symptom**: 401 errors from OpenAI API
- **Fix**: Refresh the OpenClaw token. The system will automatically read the new token on the next call since it reads from disk every time.

### Cost is too high
- **Monitor**: Check `intelligence_sweeps.ai_cost_usd` for recent sweeps
- **Costs**: GPT 5.3 is $2/1M input, $8/1M output. DeepSeek R1 is $0.55/$2.19. Gemini Flash is free.
- **Reduce**: Use `rss-only` mode for frequent sweeps, full sweep less often

## How to Add New Sources

### Adding an RSS Feed

Edit `lib/intelligence/collectors/rss.ts` and add to the `RSS_FEEDS` array:

```typescript
{
  id: 'rss-your-source',
  name: 'Source Name',
  feedUrl: 'https://example.com/rss',
  language: 'en', // or 'ne'
  relatedPromiseIds: [1, 2, 3], // which promises this source is likely to cover
},
```

### Adding a YouTube Channel

Edit `lib/intelligence/collectors/youtube.ts` and add the channel ID to the monitored channels list.

### Adding Search Queries

Edit `lib/intelligence/collectors/web-search.ts` and add queries to `PROMISE_SEARCH_QUERIES` for the relevant promise ID.

### Adding a Government Portal

Edit `lib/intelligence/collectors/gov-portal.ts` and add the portal URL and parsing configuration.

### Adding a Social Media Account

Edit `lib/intelligence/collectors/social.ts` and add the account to the tracked accounts list.

## Full Sweep Pipeline (what happens in order)

When you trigger a sweep, this is the exact sequence:

```
1. COLLECTION PHASE
   ├── RSS feeds (18 sources, English + Nepali)
   ├── YouTube (channel search + caption extraction + Whisper transcription)
   ├── Web Search (DuckDuckGo, promise-specific queries)
   ├── Facebook (Apify scrape or DuckDuckGo fallback, 13 pages)
   ├── Social media (Twitter/X + Facebook accounts)
   ├── Apify (deep Facebook profile scraping)
   └── Government portals (10 ministry websites)

2. ANALYSIS PHASE
   ├── Tier 1 Classification (all unclassified signals)
   ├── Nepali→English translation (signals with language='ne')
   └── Tier 3 Deep Analysis (signals with relevance ≥ 0.3)

3. DEDUPLICATION PHASE
   └── Jaccard similarity + URL normalization → mark duplicates

4. STATUS PIPELINE PHASE
   └── Analyze all commitments → generate status recommendations

5. COMMITMENT DISCOVERY PHASE
   └── Scan signals for new commitment language → queue for review

6. QUALITY METRICS
   └── Daily rollup + sweep record
```

## OpenClaw as Operator

OpenClaw can run the entire engine by calling these endpoints in sequence.
The dev server must be running at localhost:3001.

### Scheduled Sweep (run this every 4 hours)
```bash
curl -X POST http://localhost:3001/api/intelligence/sweep \
  -H "Authorization: Bearer nepal-najar-scrape-2024" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 30}'
```

### RSS-Only Sweep (run this every hour — lightweight)
```bash
curl "http://localhost:3001/api/intelligence/sweep?secret=nepal-najar-scrape-2024&mode=rss-only"
```

### Run Dedup After Any Sweep
```bash
curl -X POST http://localhost:3001/api/intelligence/dedup \
  -H "Authorization: Bearer nepal-najar-scrape-2024"
```

### Check for New Commitment Discoveries
```bash
curl http://localhost:3001/api/intelligence/discoveries \
  -H "Authorization: Bearer nepal-najar-scrape-2024"
```

### Check Status Recommendations
```bash
curl -X POST http://localhost:3001/api/intelligence/status-pipeline \
  -H "Authorization: Bearer nepal-najar-scrape-2024" \
  -H "Content-Type: application/json" \
  -d '{"list": true}'
```

### Transcribe Specific Videos
```bash
curl -X POST http://localhost:3001/api/intelligence/transcribe \
  -H "Authorization: Bearer nepal-najar-scrape-2024" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://youtube.com/watch?v=VIDEO_ID"]}'
```

### Scrape Facebook Pages
```bash
curl -X POST http://localhost:3001/api/intelligence/facebook \
  -H "Authorization: Bearer nepal-najar-scrape-2024"
```

### Reclassify All Signals (nuclear option — re-runs AI on everything)
```bash
curl -X POST http://localhost:3001/api/intelligence/reclassify \
  -H "Authorization: Bearer nepal-najar-scrape-2024" \
  -H "Content-Type: application/json" \
  -d '{"mode": "all"}'
```

### Direct Supabase Access (if needed)
```
URL: https://kmyftbmtdabuyfampklz.supabase.co
Service Role Key: (see .env.local SUPABASE_SERVICE_ROLE_KEY)

# Example: Get all signals
curl "https://kmyftbmtdabuyfampklz.supabase.co/rest/v1/intelligence_signals?select=*&limit=10" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"

# Example: Insert a signal directly
curl -X POST "https://kmyftbmtdabuyfampklz.supabase.co/rest/v1/intelligence_signals" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source_id":"openclaw-research","signal_type":"article","title":"...","content":"...","url":"..."}'
```

## Cost Estimates (per sweep)

| Provider | Tier 1 (100 signals) | Tier 3 (20 signals) | Total |
|----------|---------------------|--------------------:|------:|
| GPT 5.3 (OpenClaw) | ~$0.20 | ~$0.80 | ~$1.00 |
| DeepSeek R1 (OpenRouter) | ~$0.06 | ~$0.30 | ~$0.36 |
| Gemini Flash | $0.00 | $0.00 | $0.00 |
| Local (LM Studio) | $0.00 | $0.00 | $0.00 |
