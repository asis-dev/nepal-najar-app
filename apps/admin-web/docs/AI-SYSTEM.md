# Nepal Republic — AI System Architecture

> How the AI intelligence engine works under the hood.
> Last updated: April 3, 2026

---

## Overview

Nepal Republic uses a multi-tier AI system to automatically track 109+ government commitments. The system collects signals from 80+ sources, classifies them, extracts evidence, and computes a time-adjusted government score — all without manual intervention.

**Total AI cost**: ~$2-5/month (uses free-tier models first, paid models as fallback).

---

## 1. Signal Collection (No AI — Pure Scraping)

Every 12 hours, the **Sweep Orchestrator** (`lib/intelligence/sweep.ts`) runs 15 collectors:

| Collector | Sources | Method |
|-----------|---------|--------|
| RSS | 80+ feeds (news, gov portals, think tanks) | Standard RSS parsing |
| YouTube | 17 channels (news, politicians, parliament) | YouTube Data API |
| Facebook | 28 pages | Apify scraper |
| X (Twitter) | 16 accounts | Apify scraper |
| TikTok | Key political accounts | Apify scraper |
| Threads | Key accounts | Apify scraper |
| Telegram | Channels | Apify scraper |
| Reddit | r/Nepal, r/NepalPolitics | Reddit API |
| Google Trends | Nepal-related trending | Trends API |
| Parliament | Parliamentary proceedings | Gov portal scraper |
| Gov Portals | Ministry websites | Direct scraping |
| Web Search | Targeted queries | Google Custom Search |

All signals land in `intelligence_signals` table with raw text, URL, source, and timestamp.

---

## 2. AI Classification (Tier 1 — Cheap/Free Model)

**File**: `lib/intelligence/brain.ts` → `tier1ClassifyBatch()`
**Model**: Qwen 3.6+ via OpenRouter (FREE) → GPT-4.1-nano fallback ($0.10/1M tokens)

### What it does:
- Takes batches of 5 signals at a time
- Asks: "Is this relevant to any of the 109 government commitments?"
- Returns for each signal:
  - `isRelevant` (boolean)
  - `relevanceScore` (0.0-1.0)
  - `matchedPromiseIds` (which commitments it relates to)
  - `classification` (confirms/contradicts/neutral/budget_allocation/policy_change/statement)
  - `effortTier` (intent/action/delivery) — **NEW in v2**
  - `reasoning` (why)

### Effort Tier Classification:
- **Intent**: Speeches, statements, plans, announcements, committee formations (talk)
- **Action**: Budget allocations, policy changes, bills tabled, contracts signed (concrete steps)
- **Delivery**: Infrastructure completed, services launched, laws enacted (tangible results)

### Pre-filters (no AI cost):
- Signals with < 50 characters of text → auto-skip
- Obviously irrelevant patterns (horoscopes, cricket, movies) → auto-reject
- Government context patterns boost relevance

### Cost: $0/day (free model handles 95%+ of classification)

---

## 3. Deep Analysis (Tier 3 — Smart Model)

**File**: `lib/intelligence/brain.ts` → `tier3Analyze()`
**Model**: Qwen 3.6+ via OpenRouter (FREE) → GPT-4.1-mini fallback ($0.40/1M tokens)

### What it does:
- Only triggered for signals that match specific commitments (Tier 1 passed)
- Uses deep knowledge base context for each commitment
- Extracts structured data:
  - Budget amounts (NPR values)
  - Dates (including Bikram Sambat → AD conversion)
  - Percentages
  - Officials (name, title, statement)
  - Organizations mentioned
- Suggests status changes (not_started → in_progress, etc.)
- Suggests progress percentage updates
- Cross-references with corroborating signals from other sources

### Cost: ~$0.50-1.00/day (only processes relevant signals)

---

## 4. Time-Adjusted Scoring Engine (No AI — Pure Math)

**Files**:
- `lib/intelligence/commitment-timeline.ts` — Types, helpers, weight functions
- `lib/intelligence/time-adjusted-score.ts` — Core scoring engine

### The Problem It Solves:
A government that's 9 days old shouldn't get a D grade for not delivering everything. The old static formula (delivery rate + avg progress) was unfair.

### How It Works:

#### 4a. Commitment Timelines
Each of the 109 commitments gets an AI-assigned timeline:

```
Commitment: "Limit Federal Ministries to 18"
Complexity Tier: quick-win
Expected Start: Day 3
Expected Completion: Day 14
Start Milestones: ["Cabinet formation announced", "Ministry list released"]
Completion Milestones: ["Cabinet operates with 18 ministries"]
```

Complexity tiers and default windows:

| Tier | Start By | Complete By | Examples |
|------|----------|-------------|---------|
| quick-win | Day 7 | Day 30 | Executive orders, appointments, directives |
| medium | Day 30 | Day 180 | Policy reform, program launches, regulatory changes |
| long-term | Day 60 | Day 365 | Legislation, infrastructure, education reform |
| structural | Day 90 | Day 730 | Constitutional amendments, institutional reform |

#### 4b. Dynamic Effort Weights
The scoring formula shifts what it values over time:

**Early days (Day 1-10):**
- Intent signals (speeches, plans) = 60% weight
- Action signals (policy changes) = 35% weight
- Delivery signals = 5% weight

**Mid-term (Day 60-180):**
- Intent = 10%
- Action = 50%
- Delivery = 40%

**Late/overdue:**
- Intent = 2%
- Action = 13%
- Delivery = 85%

This means on Day 9, a PM speech about plans IS valuable evidence and boosts the score.

#### 4c. Timeline Phases
Each commitment is in one of four phases:

| Phase | Meaning | Score Behavior |
|-------|---------|---------------|
| pre-start | Too early for this commitment | Score = 50 (neutral, not penalized) |
| should-start | Should see initial signals | Intent/action signals needed |
| in-window | Active delivery window | Scored against expected progress |
| overdue | Past expected completion | Penalized without delivery signals |

#### 4d. Trajectory Assessment
Each commitment gets a trajectory:
- **ahead**: More progress than expected at this point
- **on-track**: Meeting expectations
- **behind**: Less progress than expected
- **overdue**: Past deadline with insufficient delivery
- **too-early**: Not yet expected to start (excluded from grading)

#### 4e. Government Score Aggregation
The overall score weights tiers differently based on how far into office:

**First 2 weeks:**
- Quick-wins: 70% weight
- Medium: 25%
- Long-term: 5%
- Structural: 0%

**After 1 year:**
- Quick-wins: 5%
- Medium: 20%
- Long-term: 35%
- Structural: 40%

#### 4f. Calibration Notes (April 3, 2026)

The scoring engine was calibrated to produce fair grades for the RSP government on Day 9:
- **Sigmoid normalization**: `rawEffort / (rawEffort + 4) × 100` — at 4 weighted signals = 50%, at 10 = 71%, at 20 = 83%
- **Pre-start with intent only**: Capped at 55 (won't inflate from just speeches)
- **Pre-start with action/delivery**: Capped at 80 (concrete early action is rewarded)
- **Pre-start with no signals**: Score = 50 (neutral, trajectory = "too-early", excluded from grading)
- **In-window with no signals**: Graduated penalty — early in window = 40, mid = 30, late = 15
- **In-window on-track**: Floor of 45 (meeting expectations = at least average)
- **Result**: Day 9 score = 40/C (fair for a brand new government showing intent)

### Cost: $0 per computation (reads pre-classified data)

---

## 5. Timeline Seeding (One-Time AI Job)

**File**: `lib/intelligence/timeline-seeder.ts`
**Endpoint**: `POST /api/intelligence/seed-timelines`
**Model**: GPT-4.1-mini (reasoning task)

### What it does:
- Reads the knowledge base for all 109 commitments
- Asks AI to assign complexity tier and timeline for each
- Processes in batches of 10
- Stores results in `commitment_timelines` table
- Admin can override any timeline manually

### Seeding Results (April 3, 2026):
- **Total seeded**: 109 commitments
- **Tier distribution**: 5 quick-win, 40 medium, 51 long-term, 13 structural
- **Actual cost**: $0.034 (GPT-4.1-mini via OpenRouter free tier handled most)
- **Model used**: gpt-4.1-mini

### Cost: ~$0.03-0.50 one-time for all 109 commitments

---

## 6. AI Model Router

**File**: `lib/intelligence/ai-router.ts`

### Provider Priority Chain:
1. **OpenRouter/Qwen** (FREE — tries first for classify/reason)
2. **OpenAI GPT-4.1-nano** (classify) / **GPT-4.1-mini** (reason) — paid fallback
3. **Local LM Studio** (offline fallback)

Special cases:
- **Summarize** tasks (daily brief): OpenAI only (free models produce poor editorial content)
- **Transcribe**: Groq Whisper (fast + cheap)

### Cost Tracking:
Every AI call tracks tokens used and cost in USD. The sweep summary reports total cost.

---

## 7. Knowledge Base

**File**: `lib/intelligence/knowledge-base.ts`

Deep context for each commitment:
- Title (English + Nepali)
- Description and key aspects
- Progress indicators (what "progress" looks like)
- Stall indicators (what "stalled" looks like)
- Key officials and ministries responsible
- Budget relevance
- Current status

This context is sent to AI during classification and analysis so it understands INTENT, not just keywords.

---

## 8. Daily Brief Generation

**File**: `lib/intelligence/daily-brief.ts`
**Endpoint**: `GET /api/daily-brief?generate=1` (cron-triggered)
**Model**: GPT-4.1-mini (editorial quality required)

### What it does:
- Reads today's intelligence signals
- Generates an editorial newspaper-style brief
- Includes audio narration via TTS (Groq or OpenAI)
- Runs on its own cron (30 min after sweep) to avoid timeout competition

### Cost: ~$0.05-0.10/day

---

## 9. Other AI Features

| Feature | File | Model | Cost |
|---------|------|-------|------|
| Commitment Discovery | `commitment-discovery.ts` | GPT-4.1-mini | ~$0.10/run |
| Source Discovery | `source-discovery.ts` | GPT-4.1-mini | ~$0.05/run |
| Corruption Discovery | `corruption-discovery.ts` | GPT-4.1-nano | ~$0.02/run |
| Commitment Briefing | `commitment-briefing.ts` | GPT-4.1-mini | ~$0.01/commitment |
| Impact Prediction | `impact-predictor.ts` | GPT-4.1-mini | ~$0.01/commitment |
| Translation | `translate.ts` | GPT-4.1-nano | ~$0.01/batch |
| Truth Meter | `truth-meter.ts` | GPT-4.1-mini | ~$0.02/batch |

---

## 10. Database Schema

### Core Tables:
```sql
intelligence_signals     — Raw signals with classification + effort_tier
commitment_timelines     — AI-assigned timelines per commitment
time_adjusted_scores     — Daily per-commitment score snapshots
government_score_daily   — Daily overall government score
```

### Key Columns on `intelligence_signals`:
- `classification`: confirms/contradicts/neutral/budget_allocation/policy_change/statement
- `effort_tier`: intent/action/delivery (NEW — drives time-adjusted scoring)
- `relevance_score`: 0.0-1.0
- `matched_promise_ids`: which commitments this signal relates to
- `confidence`: AI confidence level

---

## 11. Cron Schedule

| Time (UTC) | Endpoint | What |
|------------|----------|------|
| 01:15 | `/api/intelligence/sweep` | Full sweep (all 15 collectors) |
| 13:15 | `/api/intelligence/sweep` | Full sweep |
| 01:45 | `/api/daily-brief?generate=1` | Generate daily brief + audio |
| 13:45 | `/api/daily-brief?generate=1` | Generate daily brief + audio |
| 01:30 | `/api/intelligence/worker` | Process analysis backlog |
| 13:30 | `/api/intelligence/worker` | Process analysis backlog |

---

## 12. API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/scores/government` | GET | Public | Current government score |
| `/api/scores/government?recompute=1` | GET | Admin | Force recompute + store |
| `/api/scores/time-adjusted` | GET | Public | Per-commitment scores |
| `/api/scores/time-adjusted?commitmentId=5` | GET | Public | Single commitment score |
| `/api/intelligence/seed-timelines` | POST | Admin | Seed AI timelines |
| `/api/daily-brief` | GET | Public | Today's brief |
| `/api/intelligence/sweep` | POST | Admin | Trigger manual sweep |

---

## Architecture Diagram

```
  RSS/YouTube/Social/Gov Portals
           │
           ▼
    ┌─────────────┐
    │   Sweep      │  (15 collectors, every 12h)
    │  Orchestrator│
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Tier 1 AI   │  (Qwen FREE → GPT-4.1-nano)
    │ Classification│  Relevant? Which commitments?
    └──────┬──────┘  Effort tier? (intent/action/delivery)
           │
      ┌────┴────┐
      │ Relevant │
      ▼         ▼
    Tier 3    Discovery
    Deep       (new
    Analysis   commitments)
      │
      ▼
    ┌─────────────┐
    │ Time-Adjusted│  (No AI — pure math)
    │   Scoring    │  Dynamic weights × timeline phase
    │   Engine     │
    └──────┬──────┘
           │
           ▼
    Government Score
    (0-100 + A-F grade)
```

---

## Key Design Decisions

1. **Free-first model strategy**: Classification uses free Qwen model; only editorial tasks and deep analysis use paid models. Keeps monthly cost under $5.

2. **Effort tier on signals**: Rather than a separate AI call, effort tier is classified alongside relevance in the same Tier 1 call — zero additional cost.

3. **Timeline-aware scoring**: Instead of a flat "what % is delivered", the score accounts for WHERE in the timeline each commitment sits. A 9-day-old government gets credit for intent signals that would be worthless at Day 180.

4. **Neutral default for too-early**: Commitments that haven't reached their expected start date score 50 (neutral) — they don't drag down the grade.

5. **Daily snapshots**: Government score is stored daily so we can show trends over time (score trajectory graph).

6. **Separate cron for brief**: The daily brief runs on its own cron 30 min after the sweep, so it uses fresh data without competing for the sweep's timeout budget.
