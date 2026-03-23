# Nepal Najar — PM Inauguration Launch Strategy

## The Opportunity

Balen Shah is being sworn in as Prime Minister of Nepal. This is the single biggest moment for Nepal Najar because:

1. **Every Nepali is paying attention** — maximum eyeballs on politics
2. **People are asking "what did he promise?"** — we have the answer (109 commitments)
3. **Media is covering every angle** — our scrapers will be flooded with signals
4. **Emotional peak** — hope, skepticism, excitement — people WANT a tracker
5. **International diaspora watching** — millions of Nepalis abroad want to stay connected

**If we miss this window, the next one might be months away.**

---

## BEFORE Inauguration Day (Do NOW)

### Day -3 to Day -1: Engine Preparation

- [ ] **Run 3 full sweeps** to fill the database with fresh signals
  ```bash
  curl -X POST http://localhost:3001/api/intelligence/sweep \
    -H "Authorization: Bearer nepal-najar-scrape-2024" \
    -d '{"batchSize": 50}'
  ```
- [ ] **Run the sweep 3 times** (morning, afternoon, evening) to build up signal volume
- [ ] **Check trending page** — it should show political activity around the inauguration
- [ ] **Verify all 109 commitments have descriptions** — people will browse these
- [ ] **Test signup flow end-to-end** — create a test account, submit evidence, vote
- [ ] **Deploy latest code** to production
- [ ] **Test production URL** — make sure nepal-najar-dun.vercel.app loads fast, no errors

### Day -2: Content Preparation

- [ ] **Write 3 social media posts** (pre-written, ready to copy-paste):

**Post 1 — The Teaser (Day before inauguration):**
```
Tomorrow Nepal gets a new PM. He made 109 commitments to the people.

We built something to track every single one.

nepalnajar.org — The nation's report card. As Nepal watches.

#NepalNajar #BalenShah #Nepal
```

**Post 2 — Launch Day (Inauguration day):**
```
Today Balen Shah takes office as PM. Starting now, Nepal Najar tracks all 109 government commitments in real-time.

AI scans 30+ news sources. Citizens verify on the ground. Progress updated daily.

This is Nepal's report card.

nepalnajar.org

#NepalNajar #Nepal #Accountability
```

**Post 3 — Day After:**
```
Day 1 of the new government. Here's what our AI detected:

[Screenshot of trending page]

X signals collected. Y commitments already showing activity.

The tracking has begun. Have you checked what affects YOUR area?

nepalnajar.org/affects-me

#NepalNajar
```

- [ ] **Take screenshots** of the app showing:
  - Trending page with real data
  - A commitment card with signals
  - The "What Affects Me" page
  - The pulse meter

### Day -1: Distribution Preparation

- [ ] **Prepare Reddit post for r/Nepal** (this is your highest-impact channel):
```
Title: I built a free tool that tracks all 109 government commitments by the new PM — AI-powered, updated every 4 hours

Body:
Hey r/Nepal,

With the new PM being sworn in tomorrow, I wanted to share something I've been building: Nepal Najar (nepalnajar.org) — a platform that tracks every government commitment using AI.

What it does:
- Tracks 109 commitments from the new government
- AI scans 30+ news sources every 4 hours (RSS, YouTube, Facebook, Reddit, Parliament, government portals)
- Shows what's trending in Nepal politics right now
- Citizens can submit evidence and verify claims
- Shows which commitments affect YOUR province/district

It's free, open, bilingual (English + Nepali), and non-partisan.

Would love feedback from this community. What features would you want?

[Link]
```

- [ ] **Prepare Facebook post** — Share in Nepali political discussion groups
- [ ] **Prepare Threads/X post** — Tag journalists from our scraper list
- [ ] **DM 5-10 journalist contacts** with a personal message:
```
Hey [name], I built a free tool tracking all 109 government commitments of the new PM. AI-powered, updates every 4 hours. Thought you might find it useful for reporting. nepalnajar.org — would love your feedback.
```

---

## INAUGURATION DAY: The Blitz

### Morning (Before ceremony)
1. **Run a sweep** — capture all morning news about the inauguration
2. **Post the teaser** on Reddit, Facebook, Threads, X
3. **Check trending** — inauguration signals should be flooding in

### During Ceremony
4. **Run another sweep** — capture live reactions
5. **Post the launch post** on all platforms
6. **Monitor r/Nepal** — reply to every comment on your post

### Evening
7. **Run another sweep** — capture analysis and reactions
8. **Take screenshots** of trending page with real inauguration data
9. **Post evening update** — "Here's what Nepal Najar detected on Day 1"
10. **Reply to every DM and comment** — personal engagement matters more than content

---

## DAY 1-7: Sustain the Momentum

### Daily (30 min during launch week — more than usual)

| Day | Action |
|---|---|
| Day 1 | Post "Day 1 Report" — screenshot of what AI detected |
| Day 2 | Post on r/Nepal with engagement stats — "500 people checked their commitments" |
| Day 3 | Share a specific commitment that's trending — "Here's what's happening with [X]" |
| Day 4 | Post the "What Affects Me" feature — "Check which commitments affect YOUR district" |
| Day 5 | Share community evidence — "A citizen in [district] submitted proof of [X]" |
| Day 6 | Post the "How It Works" page — educate on AI + community verification |
| Day 7 | Week 1 summary post — "7 days, X signals, Y commitments showing activity" |

### Key Channels (Priority Order)

1. **Reddit r/Nepal** — Highest quality engagement, English-speaking politically engaged Nepalis
2. **Facebook Nepali groups** — Highest volume, Nepali-language audience
3. **Threads** — Journalists who moved from X after the ban
4. **X/Twitter** — Diaspora, international audience
5. **TikTok** — If you can make a 30-second video showing the app, this could go viral
6. **Personal WhatsApp/Viber** — Share with every Nepali you know

### What to Post (Content Calendar)

**Repeatable formats:**
- "Daily Pulse: Nepal's political activity score is X/100 today. Here's why."
- "Commitment Spotlight: #15 Infrastructure — X confirms vs Y contradicts"
- "What Nepal is Searching: [Google Trends screenshot]"
- "Community Evidence: A citizen in [district] submitted [evidence type]"
- "Trending Now: [screenshot of trending page]"

---

## WEEK 2-4: Convert Visitors to Users

### Key Metrics to Watch
- **Signups per day** — Are people creating accounts?
- **Evidence submissions** — Are people contributing?
- **Return visitors** — Are they coming back?
- **Which pages get most traffic** — Focus on what works

### If Signups Are Low
- Make the value clearer on landing page
- Add "Sign up to get notified when commitments that affect you change"
- Make the signup wall lower — let people browse everything without signup

### If People Visit But Don't Return
- Add push notifications: "Commitment #X just changed status"
- Add weekly email digest: "This week in Nepal politics"
- Make the daily page more compelling — fresh content every day

### If People Return But Don't Submit Evidence
- Make evidence submission easier (fewer fields, one-tap)
- Show examples of good evidence submissions
- Gamify: "You're 50 karma away from Verifier status!"

---

## CONTENT HOOKS FOR THE INAUGURATION

**Things people will Google/search for during inauguration:**

- "Balen Shah promises" → Your app answers this
- "RSP government commitments" → Your app answers this
- "Nepal new PM plans" → Your app answers this
- "100 days Nepal government" → Your First 100 Days page
- "Nepal budget plans" → Your commitment tracker
- "Balen Shah infrastructure" → Your commitment cards

**SEO pages that should rank:**
- `/explore/first-100-days` — "First 100 Days Tracker"
- `/trending` — "What's Trending in Nepal Politics"
- `/affects-me` — "How Nepal's Government Affects You"
- `/how-it-works` — "Nepal Government Accountability Tracker"

---

## THE ONE THING THAT MATTERS

**The app must have REAL DATA on inauguration day.**

If someone clicks the link and sees "0 signals, Not Started, 0%" on every commitment — they'll close the tab and never come back. The engine MUST be running and producing visible results before you share the link with anyone.

Run sweeps. Get signals. Make the numbers real. Then launch.

---

## Budget

| Item | Cost | When |
|---|---|---|
| Domain (nepalnajar.org) | ~$12/year | Before launch day |
| Resend email (SMTP) | Free (100/day) | Before launch day |
| Vercel hosting | Free (hobby plan) | Already set up |
| Supabase database | Free tier | Already set up |
| Apify scraping | Free ($5/month credit) | Already set up |
| OpenAI fallback | ~$0.50/day when OpenClaw is off | Already set up |
| **Total monthly cost** | **~$1 + domain** | |

This is essentially a free launch. The only cost is your time.
