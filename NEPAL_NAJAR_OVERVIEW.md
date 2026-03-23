# Nepal Najar -- Overview

**Nepal Najar** (nepaal najar -- "Nepal's Eye") is a civic accountability platform that tracks the Nepal government's public commitments in real-time.

> The nation's report card. As Nepal watches.

This document is a high-level walkthrough of what the app is, why it exists, how it works, and where it's headed. Think of it as a pitch deck in document form -- conversational but substantive.

---

## The Problem

Nepal is a young democracy. Politicians make promises during campaigns, win elections, and then... silence. There is no systematic, neutral, evidence-based way for citizens to track whether the government is actually delivering on what it pledged.

Journalists cover individual stories. Civil society writes reports that nobody reads. Social media is noisy but fragmented. No single place pulls it all together and says: here is what was promised, here is what moved, here is what stalled, and here is what changed today.

That gap is what Nepal Najar fills.

---

## Why Now

A new generation of Nepali leaders -- the RSP party, Balen Shah's mayoral tenure -- has energized citizens who actually want to hold their government accountable. There is real demand for transparency, especially among young, urban, tech-savvy Nepalis and the massive diaspora community abroad.

This is not a partisan project. Nepal Najar tracks ALL government commitments regardless of which party made them. The goal is accountability, not advocacy for any side.

---

## Who Uses It

| Audience | Why They Care |
|---|---|
| Nepali citizens | See what the government actually delivered vs. what was promised |
| Nepali diaspora | Millions abroad who want to stay connected to homeland governance |
| Journalists | Research tool and aggregated intelligence source |
| Civil society orgs | Policy analysis and advocacy backing |
| Future: any democracy | The platform is designed to be replicable for any country |

The primary user is a young Nepali citizen -- someone who cares about their country but does not have time to read 18 news sources, scroll TikTok, watch parliamentary sessions, and cross-reference it all. Nepal Najar does that for them.

---

## What It Does

At its core, Nepal Najar is three things:

1. **A commitment database** -- 109 government commitments, each with a status (not started / in progress / delivered / stalled), progress percentage, category tags, and a history of every change.

2. **An AI-powered intelligence engine** -- It automatically scans the entire Nepali media landscape 24/7, classifies what it finds, and connects signals to commitments. No human editors picking stories. The AI reads everything.

3. **A public interface** -- Citizens can browse commitments, see what changed today, explore by province, track what affects them personally, compare commitments side-by-side, and watch specific items for notifications.

---

## Feature Highlights

### For Citizens (Public Pages)

- **Landing Page** -- Hero section with live stats (109 commitments tracked, sources scanned), the tagline, and immediate access to the tracker.
- **Commitment Tracker** -- Browse all commitments with status indicators, progress bars, and category filters. The main workhorse of the app.
- **First 100 Days Campaign** -- Special view tracking the government's first 100 days with daily progress milestones.
- **Daily Activity Feed** -- What changed today. New signals, status updates, trending topics. Fresh every time you visit.
- **Trending Page** -- A political pulse meter (scored 0-100), trending topics across platforms, and a cross-platform heat map showing activity on RSS, Reddit, TikTok, YouTube, Facebook, X, Telegram, and Parliament.
- **Province Map** -- Interactive 3D map of Nepal showing commitments by province with pressure scores.
- **"What Affects Me"** -- Personalized view based on your location. Which commitments directly affect your province or district.
- **Evidence Vault** -- All collected evidence with source links, organized by commitment. Every claim is backed by data.
- **Search and Compare** -- Full-text search across everything, plus side-by-side commitment comparison.
- **Report Card** -- The government's overall scorecard. Grades based on delivery rates.
- **Watchlist and Notifications** -- Follow specific commitments and get notified when something changes.
- **Citizen Proposals** -- The community can propose new items to track.
- **Full Bilingual Support** -- English and Nepali toggle throughout the entire app. Not an afterthought -- built in from day one.

### For Operators (Admin Dashboard)

- **Intelligence Review** -- Review AI-classified signals with approve/reject/edit actions, bulk operations, contradiction resolution, and full AI reasoning display.
- **Commitment Discovery Queue** -- The AI detects when politicians announce NEW commitments not yet in the tracker. Admins review and approve.
- **Status Pipeline** -- See and approve AI-recommended status changes with full audit trail.
- **Verification and User Management** -- Verify citizen-submitted evidence, manage users and permissions.

---

## The Intelligence Engine

This is the brain of the operation and where the real differentiation lives.

### How It Works

The engine continuously scans the Nepali media landscape across **15 data sources**, classifies every signal using AI, and connects relevant findings to tracked commitments. It runs autonomously -- no human editors required for intake.

### Data Sources

| Source | Coverage |
|---|---|
| RSS Feeds | 18 Nepali news outlets (10 English, 8 Nepali) -- Kathmandu Post, Republica, Himalayan Times, Online Khabar, Gorkhapatra, and more |
| YouTube | 15 news channels with auto-caption extraction + Whisper audio transcription |
| Facebook | 13 public pages (politicians, parties, ministries, news) |
| Reddit | r/Nepal, r/nepalese, r/Kathmandu |
| TikTok | Political hashtags and key accounts |
| X / Twitter | Via proxy instances (scrapes from outside Nepal, bypassing the domestic ban) |
| Threads | 14 journalist and politician accounts |
| Telegram | Public channel scraping |
| Google Trends | Daily and real-time trending searches in Nepal |
| Government Portals | 10 ministry websites for press releases and notices |
| Parliament + Nepal Gazette | Bills, acts, official notices |
| National Planning Commission | Policy documents and reports |
| DuckDuckGo Web Search | Targeted queries for each of the 109 commitments |
| Apify Actors | Enhanced scraping for platforms with limited APIs |
| Audio/Video Transcription | Press conferences, interviews, Facebook Lives converted to searchable text via Groq Whisper |

### AI Classification Pipeline

Every incoming signal goes through a two-tier process:

- **Tier 1 (Fast Classification)** -- Classify as confirms / contradicts / neutral / statement / budget allocation / policy change with a relevance score. Aggressive rules: when in doubt, default to relevant. Better to review a false positive than miss real evidence.
- **Tier 3 (Deep Analysis)** -- Relevant signals get full analysis: which commitment does this affect, what status change should we recommend, what progress percentage, who was quoted, what amounts or dates were mentioned.
- **Nepali-to-English Translation** -- Nepali-language signals get auto-translated for cross-referencing.

### AI Model Strategy

The system uses a priority chain to keep costs near zero:

1. OpenClaw / GPT 5.3 (local, free -- runs on the operator's own machine)
2. OpenAI GPT-4.1 nano/mini (paid fallback for production)
3. Gemini 2.5 Flash (free tier backup)
4. OpenRouter / DeepSeek (cheap alternative)
5. Local LM Studio / Qwen (offline fallback)

Smart cost avoidance: if the local model already classified the signals, the paid APIs never fire. Daily cost in production is roughly $0.50-$2.00.

### Post-Processing

- **Deduplication** -- The same news story from 10 outlets does not count as 10 signals. Jaccard similarity and URL matching prevent inflation.
- **Status Pipeline** -- AI recommends status transitions (not started to in progress to delivered) based on evidence patterns. High-confidence changes auto-apply. Low-confidence goes to human review.
- **Commitment Discovery** -- Detects when politicians announce new commitments not yet being tracked. Flags them for admin approval.
- **Trending and Pulse** -- Computes a real-time political activity score and identifies what is trending across all platforms simultaneously.

### Automation

- Vercel cron jobs run RSS scraping every hour and full sweeps every 4 hours.
- The local agent can run the full sweep autonomously from the operator's machine.
- All results land in the cloud database and appear on the production app immediately.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), glass morphism dark theme, Tailwind CSS |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Hosting | Vercel with automated cron jobs |
| AI Engine | OpenClaw/GPT 5.3 primary, OpenAI GPT-4.1 fallback |
| 3D Map | MapTiler |
| Audio Transcription | Groq Whisper |
| Social Scraping | Apify, DuckDuckGo, Nitter, direct HTML |
| Languages | Full English + Nepali bilingual support |

---

## What Makes It Different

**AI-powered, not manual.** There are no human editors picking which stories matter. The engine reads everything across every platform and connects the dots automatically.

**Cross-platform intelligence.** Most accountability tools rely on one or two sources. Nepal Najar sees across RSS, YouTube, Facebook, Reddit, TikTok, X, Telegram, and Parliament simultaneously. No single-platform bias.

**Evidence-based.** Every status change is backed by source links. No opinions, no editorial spin. Citizens can click through to the original evidence.

**Bilingual from day one.** Full Nepali language support is built into the architecture, not bolted on after launch.

**Designed for replication.** The platform architecture is country-agnostic. Swap the commitments, swap the news sources, and the same engine works for any democracy.

**Nearly free to operate.** Most services run on free tiers. The full intelligence engine costs roughly $0.50-$2.00 per day at production scale.

**Open for participation.** Citizens can submit feedback, propose new tracking items, contribute evidence, and participate in verification.

---

## Current State

- 109 government commitments actively tracked
- 854+ intelligence signals collected and classified
- 15 scrapers operational across all major platforms
- Trending system live with political pulse scoring
- Admin review tools built with full audit trail
- Ready for pilot launch with early users

---

## The Vision

Start with Nepal. Prove the model works. Then expand.

Every democracy deserves a public scorecard -- a neutral, AI-powered system that tracks what the government promised versus what it delivered. The platform is designed so any civic organization in any country can deploy their own instance. Change the commitments, change the news sources, same engine.

Nepal is the proving ground because the conditions are right: a young democracy, an engaged citizenry, a rising generation of leaders who campaigned on transparency, and a diaspora that wants to stay connected.

The name says it all.

**Nepal Najar** -- Nepal is watching.

---

## Services and Cost Structure

| Service | Purpose | Cost |
|---|---|---|
| Supabase | Database and auth | Free tier |
| Vercel | Hosting and cron jobs | Free tier |
| Groq | Whisper audio transcription | Free tier |
| YouTube Data API v3 | Video metadata and captions | Free (10K requests/day) |
| Apify | Social media scraping | ~$5/month free credit |
| OpenAI GPT-4.1 | AI fallback classification | ~$15-50/month |
| Google Trends | Trending data | Free, no key required |
| Reddit JSON API | Reddit scraping | Free |
| Telegram HTML | Channel scraping | Free |
| Nitter | X/Twitter proxy | Free |
| MapTiler | 3D province map | Free tier |

**Total estimated operating cost: $15-50/month at full production scale.** The local AI model handles the bulk of classification for free.

---

*Nepal Najar is built to last, built to scale, and built for the people who believe their government should keep its word.*
