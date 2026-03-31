# Nepal Najar Ops Playbook

Your daily/weekly/monthly guide to keeping Nepal Najar running. No fluff, just what you need to do.

---

## Daily Tasks (15 minutes)

### 1. Check the Admin Review Page
Go to `/review` in the dashboard. This is where flagged signals land -- things the AI was not confident about, or that need human eyes.

- **Approve** signals that are correctly classified
- **Reject** signals that are spam, irrelevant, or misclassified
- **Edit** signals where the AI got the commitment match wrong (wrong promise ID)
- Check `/review` stats at the top -- if "review required" count is climbing, something might be off with classification

### 2. Glance at Trending
Visit the public `/trending` page. Scan for:
- Anything that looks wrong or embarrassing (misclassified signal showing as "progress" when it is bad news)
- Any duplicate stories dominating the feed
- Any obviously irrelevant content that slipped through

### 3. Check Feedback Submissions
Go to `/feedback-review` in the dashboard. This is the OpenClaw-powered autopilot inbox.
- Review what OpenClaw recommended for each piece of citizen feedback
- Approve, reject, or override its decisions
- Pay attention to high-confidence actionable feedback -- these might reveal real issues

### 4. Quick Health Check
Hit the status endpoint:
```bash
curl https://nepalnajar.org/api/intelligence/status
```
Look for:
- Last sweep time (should be within the last 4 hours)
- Signal counts trending upward (not flatlined)
- No error flags

---

## Weekly Tasks (20 minutes)

### 1. Review Verifier Applications
Go to `/verification` in the dashboard. People apply to become verified community contributors.
- Check their background/motivation
- Approve legit applicants, reject spam

### 2. Check Community Evidence Submissions
Visit `/submissions` and `/evidence` (public side). Community members submit evidence for or against commitments.
- Review pending submissions
- Link good evidence to the right commitments
- Flag low-quality submissions

### 3. Review New Commitment Discoveries
The engine auto-detects when the government announces NEW commitments not in our original 109.
```bash
curl https://nepalnajar.org/api/intelligence/discoveries \
  -H "Authorization: Bearer $SCRAPE_SECRET"
```
Or check the dashboard. Approve real new commitments, reject false positives.

### 4. Social Media Post
Pick one interesting finding from the week and post about it. Use the report card image generator at `/api/report-card` for a shareable image. More on content strategy in `PM_INAUGURATION_LAUNCH.md`.

### 5. Check Scraper Health
Go to `/scraper-health` in the dashboard. Look for:
- Any RSS feeds returning errors (usually means the site changed their feed URL)
- YouTube API quota usage
- Facebook scraper status (Apify tends to need babysitting)
- Any collector with 0 signals in the past week = probably broken

---

## Monthly Tasks (1 hour)

### 1. Review Broken Sources
Go through each collector type:
- **RSS feeds**: Check `/scraper-health`. Dead feeds need to be removed or URLs updated in `lib/intelligence/collectors/rss.ts`
- **YouTube channels**: Make sure monitored channels still exist and are posting
- **Government portals**: These break the most. Visit opmcm.gov.np, mof.gov.np etc. manually to see if site structure changed
- **Facebook pages**: Apify scrapers need occasional token refreshes

### 2. Check User Feedback Trends
Look at feedback patterns in `/feedback-review`. Are people complaining about the same things? Common issues:
- Wrong status on a popular commitment
- Missing evidence that citizens know about
- UI bugs or confusing labels

### 3. Update Commitment Data
If the government announced new commitments, restructured ministries, or changed priorities:
- Update `lib/data/promises.ts` with new/modified commitments
- Update `lib/intelligence/knowledge-base.ts` with new metadata, key officials, indicators
- Run a reclassify if commitment definitions changed significantly

### 4. Review AI Classification Accuracy
Check the quality metrics:
```bash
curl "https://kmyftbmtdabuyfampklz.supabase.co/rest/v1/intelligence_quality_daily?select=*&order=date.desc&limit=30" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Look for:
- `avg_confidence` dropping below 0.5 (AI is confused)
- `review_overrides_count` climbing (you keep disagreeing with the AI)
- Ratio of confirms vs contradicts vs neutral (should not be all one type)

---

## Running the Intelligence Engine

### Trigger a Full Sweep (collection + classification + analysis)
```bash
curl -X POST https://nepalnajar.org/api/intelligence/sweep \
  -H "Authorization: Bearer $SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Collection Only (grab signals, skip AI)
```bash
curl -X POST https://nepalnajar.org/api/intelligence/sweep \
  -H "Authorization: Bearer $SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"skipAnalysis": true}'
```

### Analysis Only (re-analyze existing signals, skip fetching)
```bash
curl -X POST https://nepalnajar.org/api/intelligence/sweep \
  -H "Authorization: Bearer $SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"skipCollection": true}'
```

### RSS-Only Sweep (lightweight, good for frequent runs)
```bash
curl "https://nepalnajar.org/api/intelligence/sweep?secret=$SCRAPE_SECRET&mode=rss-only"
```

### Reclassify Signals (re-run AI on already-classified signals)
```bash
# Reclassify everything (nuclear option)
curl -X POST https://nepalnajar.org/api/intelligence/reclassify \
  -H "Authorization: Bearer $SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"mode": "all"}'
```

### Run Dedup (remove duplicate signals)
```bash
curl -X POST https://nepalnajar.org/api/intelligence/dedup \
  -H "Authorization: Bearer $SCRAPE_SECRET"
```

### Run Status Pipeline (generate commitment status recommendations)
```bash
curl -X POST https://nepalnajar.org/api/intelligence/status-pipeline \
  -H "Authorization: Bearer $SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"list": true}'
```

### Check Engine Status
```bash
curl https://nepalnajar.org/api/intelligence/status
```

### Check Commitment Discoveries
```bash
curl https://nepalnajar.org/api/intelligence/discoveries \
  -H "Authorization: Bearer $SCRAPE_SECRET"
```

### Scrape Facebook Pages On-Demand
```bash
curl -X POST https://nepalnajar.org/api/intelligence/facebook \
  -H "Authorization: Bearer $SCRAPE_SECRET"
```

### Transcribe a Video
```bash
curl -X POST https://nepalnajar.org/api/intelligence/transcribe \
  -H "Authorization: Bearer $SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://youtube.com/watch?v=VIDEO_ID"]}'
```

### Process Queued Worker Jobs
```bash
curl -X POST https://nepalnajar.org/api/intelligence/worker \
  -H "Authorization: Bearer $SCRAPE_SECRET"
```

### What OpenClaw Does vs What the Automated System Does

**OpenClaw** is the AI brain. It does the thinking:
- Classifies signals as relevant/irrelevant (Tier 1)
- Deep-analyzes relevant signals to extract data and suggest status changes (Tier 3)
- Reviews citizen feedback and recommends actions (feedback autopilot)
- Generates pilot summary reports
- Translates Nepali signals to English

**The automated system** (crons + collectors) does the legwork:
- Fetches RSS feeds every hour
- Runs full sweeps every 4 hours
- Processes worker jobs every 15 minutes
- Scrapes websites, YouTube, Facebook, government portals
- Deduplicates signals
- Runs the status pipeline

You can run OpenClaw without the automated system (manual curls), and the automated system will try to use OpenClaw but falls back to OpenRouter > Gemini > local models if OpenClaw is unavailable.

---

## Monitoring and Troubleshooting

### Are the Crons Running?
Check Vercel dashboard > your project > Settings > Crons. You should see three crons:
1. **Full sweep**: every 4 hours (`0 */4 * * *`)
2. **RSS-only sweep**: every hour (`0 * * * *`)
3. **Worker**: every 15 minutes (`*/15 * * * *`)

If crons are not firing, check:
- Is `CRON_SECRET` env var set in Vercel?
- Did the last deploy succeed?
- Vercel free tier only supports daily crons -- you need Pro for hourly/sub-hourly

### Scraper Fails
1. Check `/scraper-health` in the dashboard
2. Check the status endpoint: `curl .../api/intelligence/status`
3. Common causes:
   - RSS feed URL changed (update in `lib/intelligence/collectors/rss.ts`)
   - YouTube API quota exhausted (resets daily at midnight Pacific)
   - Apify token expired (refresh in Apify dashboard, update `APIFY_API_TOKEN`)
   - Government website redesigned (update parser in `lib/intelligence/collectors/gov-portal.ts`)

### AI Classification Seems Wrong
If lots of signals are being misclassified:
1. Check which AI provider is active -- go to Vercel logs, search for "ai-router" or "provider"
2. GPT 5.3 (OpenClaw) gives the best results. If it fell back to Gemini or local, quality drops
3. Check if the OpenClaw token expired (401 errors in logs)
4. If the problem is systemic, do a reclassify: `curl -X POST .../api/intelligence/reclassify`

### Check Supabase for Data Issues
```bash
# Count signals by type
curl "https://kmyftbmtdabuyfampklz.supabase.co/rest/v1/rpc/count_signals_by_type" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Get recent signals
curl "https://kmyftbmtdabuyfampklz.supabase.co/rest/v1/intelligence_signals?select=id,title,classification,relevance_score&order=discovered_at.desc&limit=20" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Check recent sweeps
curl "https://kmyftbmtdabuyfampklz.supabase.co/rest/v1/intelligence_sweeps?select=*&order=id.desc&limit=5" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

---

## Costs

| Service | Cost | Notes |
|---------|------|-------|
| OpenAI (via OpenClaw) | ~$0.50-1.75/day | Depends on sweep frequency and signal volume |
| Groq | Free tier | Whisper transcription, generous free quota |
| YouTube Data API | Free tier | 10,000 units/day, more than enough |
| Apify | $5/month free credit | Facebook scraping, usually enough |
| Vercel | Depends on plan | Free tier = daily crons only, Pro = hourly |
| Supabase | Free tier | 500MB DB, 2GB bandwidth, 50K auth users |
| Domain (nepalnajar.org) | ~$10/year | |
| Resend | Free tier | 100 emails/day, 3000/month |
| Google Custom Search | Free tier | 100 queries/day |

**To reduce costs:**
- Use `rss-only` mode for frequent sweeps (free, no AI needed for collection)
- Set `GEMINI_API_KEY` as a free fallback
- Run full sweeps less frequently (every 6-8 hours instead of 4)
- Use smaller batch sizes: `{"batchSize": 10}`

---

## Key URLs and Credentials

### URLs
| What | URL |
|------|-----|
| Production | https://nepalnajar.org |
| Supabase Dashboard | https://supabase.com/dashboard/project/kmyftbmtdabuyfampklz |
| Vercel Dashboard | https://vercel.com (check your project) |
| Apify Console | https://console.apify.com |

### Environment Variables (names only, values in `.env.local` and Vercel)
```
# Core
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SCRAPE_SECRET
CRON_SECRET

# AI Providers
OPENCLAW_AUTH_PATH
OPENCLAW_AGENT
OPENCLAW_API_KEY / OPENCLAW_ACCESS_TOKEN
INTELLIGENCE_OPENCLAW_ONLY
INTELLIGENCE_ALLOW_ON_DEMAND_PUBLIC_AI
INTELLIGENCE_RECOUNT_EVIDENCE_ON_READ
INTELLIGENCE_ENABLE_LIVE_SCORE_READ_MERGE
OPENROUTER_API_KEY
GEMINI_API_KEY
AI_BASE_URL / AI_API_KEY / AI_MODEL

# Collectors
YOUTUBE_API_KEY
GOOGLE_SEARCH_API_KEY
GOOGLE_SEARCH_CX
GROQ_API_KEY
APIFY_API_TOKEN / APIFY_TOKEN

# Database Migrations
DATABASE_URL / SUPABASE_DB_URL / SUPABASE_DB_PASSWORD

# Other
NEXT_PUBLIC_API_URL
INTELLIGENCE_AUTO_STATUS_SYNC
INTELLIGENCE_INLINE_DISCOVERY_WORKER
INTELLIGENCE_INLINE_STATUS_WORKER
RESEND_API_KEY
```

---

## Emergency Procedures

### Disable the Engine Temporarily
Option 1 -- Remove the cron secret so crons fail auth:
1. Go to Vercel > Settings > Environment Variables
2. Delete or rename `CRON_SECRET`
3. Redeploy

Option 2 -- Pause crons in Vercel:
1. Go to Vercel > Settings > Crons
2. Disable each cron (if your plan supports it)

Option 3 -- Quick and dirty, comment out crons in `vercel.json` and push.

### Rollback a Bad Deploy
1. Go to Vercel dashboard > Deployments
2. Find the last good deployment
3. Click the three dots > "Promote to Production"
4. This instantly rolls back without a new build

### Clear Bad Data from the Database
**Delete misclassified signals from a bad sweep:**
```sql
-- Find the bad sweep ID first
SELECT id, started_at, signals_discovered, status
FROM intelligence_sweeps
ORDER BY started_at DESC
LIMIT 5;

-- Delete signals from that sweep (soft delete by marking review_status)
UPDATE intelligence_signals
SET review_status = 'rejected', review_required = false
WHERE discovered_at >= '2026-03-23T00:00:00Z'
  AND discovered_at < '2026-03-24T00:00:00Z';
```

**Delete all signals from a specific source that went haywire:**
```sql
UPDATE intelligence_signals
SET review_status = 'rejected'
WHERE source_id = 'rss-broken-source';
```

**Reset a commitment's status if bad data pushed it wrong:**
```sql
-- Check what updates exist
SELECT * FROM promise_updates
WHERE promise_id = 42
ORDER BY created_at DESC;

-- Delete the bad updates
DELETE FROM promise_updates
WHERE promise_id = 42
  AND created_at > '2026-03-23T00:00:00Z';
```

Run these via the Supabase SQL Editor (Dashboard > SQL Editor) or via `psql` if you have `DATABASE_URL`.

---

## Dashboard Pages Reference

| Page | What It Does |
|------|-------------|
| `/home` | Overview dashboard with key metrics |
| `/review` | Signal review queue (approve/reject/edit AI classifications) |
| `/feedback-review` | Citizen feedback autopilot inbox |
| `/scraper-health` | Collector health monitoring |
| `/submissions` | Community evidence submissions |
| `/verification` | Verifier applications |
| `/pilot` | Pilot tracker with OpenClaw summary |
| `/moderation` | Content moderation |
| `/projects` | Commitment/project management |
| `/budget` | Budget tracking |
| `/users` | User management |
| `/settings` | App settings |
| `/blockers` | Blocked/stalled commitments |
| `/tasks` | Task management |
| `/audit` | Audit log |
