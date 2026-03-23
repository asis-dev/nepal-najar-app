# Nepal Najar — Operations Playbook

## What This App Is
Nepal Najar is a citizen-powered government accountability platform that tracks 109 government commitments using AI intelligence + community verification. It answers one question: "Is the government doing what it promised?"

---

## Daily Operations (15 min/day)

### Morning Check (10 min)
1. **Open Admin Review** (`/review`) — Check flagged signals
   - Approve/reject any low-confidence AI classifications (usually 5-10 items)
   - If something looks wrong, edit the classification
2. **Glance at Trending** (`/trending`) — Make sure pulse score looks reasonable
   - If a fake trend appears, check the source signals and reject bad ones
3. **Check Evidence Queue** (`/verify-evidence`) — Approve community submissions
   - Approve evidence that has proof (links, photos)
   - Reject anything without evidence or obvious spam

### If Time Permits (5 min)
4. Share one interesting finding on social media
   - "Commitment #15 has 12 contradicting signals — what's really happening with infrastructure?"
   - Screenshot the trending page or a commitment card

---

## Weekly Operations (20 min/week)

### Monday Review
1. **Verifier Applications** — Check if anyone applied. Approve trustworthy users.
2. **New Commitment Discoveries** (`/api/intelligence/discoveries`) — AI detected possible new pledges? Review and approve/dismiss.
3. **Scraper Health** — Run a quick sweep check:
   ```bash
   curl -X POST http://localhost:3001/api/intelligence/sweep \
     -H "Authorization: Bearer nepal-najar-scrape-2024" \
     -H "Content-Type: application/json" \
     -d '{"batchSize": 30}'
   ```
4. **User Feedback** (`/feedback-review`) — Read what users are asking for

---

## Monthly Operations (1 hour/month)

1. **Broken Scrapers** — Check if any RSS feeds return errors, Facebook pages changed URLs
2. **Update Commitment Data** — Any new government announcements? Add new commitments if needed
3. **Review Combined Scores** — Do the AI + community scores make sense? Adjust if needed
4. **Competitor Check** — Glance at MonkeyRaters and KnowYourNeta for new features

---

## What Is Fully Automated (Don't Touch)

| System | What It Does | Frequency |
|---|---|---|
| RSS collection | Scrapes 30+ news feeds | Every 1 hour (Vercel cron) |
| Full intelligence sweep | All 15 scrapers + AI classification | Every 4 hours (Vercel cron) |
| Deduplication | Removes duplicate signals | After every sweep |
| Status pipeline | Updates commitment statuses from evidence | After every sweep |
| Trending computation | Calculates what's hot | After every sweep |
| Karma triggers | Awards/deducts karma on votes/approvals | Real-time (DB triggers) |
| Google Trends monitoring | Tracks what Nepal is searching | Part of sweep |
| New commitment detection | AI flags potential new pledges | Part of sweep |
| Email verification | Signup confirmation emails | Supabase handles it |

---

## What OpenClaw Can Handle

Give OpenClaw these standing orders:

1. **"Run the intelligence sweep every 4 hours"**
   ```
   curl -X POST http://localhost:3001/api/intelligence/sweep \
     -H "Authorization: Bearer nepal-najar-scrape-2024" \
     -H "Content-Type: application/json" \
     -d '{"batchSize": 30}'
   ```

2. **"Review low-confidence signals daily"**
   - Query signals where confidence < 0.5
   - Reclassify them with better context

3. **"Generate a weekly summary"**
   - Top 5 trending commitments
   - New signals count
   - Status changes
   - Community activity

4. **"Research specific commitments on demand"**
   - "What's the latest on Melamchi water supply?"
   - Search the web, find new sources, add to database

---

## What NOT to Spend Time On

- DO NOT manually classify signals — AI does this
- DO NOT manually update commitment statuses — pipeline does this
- DO NOT manually scrape news — 15 scrapers run 24/7
- DO NOT moderate every comment — community voting handles it
- DO NOT chase every broken scraper — DuckDuckGo fallbacks exist

---

## Key URLs

| What | URL |
|---|---|
| Production app | nepal-najar-dun.vercel.app (or nepalnajar.org when domain is set) |
| Supabase dashboard | supabase.com/dashboard/project/kmyftbmtdabuyfampklz |
| Vercel dashboard | vercel.com/asis-projects-1824c04f/admin-web |
| Admin review | /review (requires admin account) |
| Evidence queue | /verify-evidence (requires verifier/admin) |
| Trending | /trending |
| Feedback review | /feedback-review |
| Intelligence status | /api/intelligence/status |

---

## Key API Endpoints (for OpenClaw or manual use)

All require `Authorization: Bearer nepal-najar-scrape-2024` header.

| Endpoint | Method | What |
|---|---|---|
| `/api/intelligence/sweep` | POST | Trigger full sweep |
| `/api/intelligence/sweep?mode=rss-only` | POST | RSS-only quick sweep |
| `/api/intelligence/reclassify` | POST | Reset and reclassify all signals |
| `/api/intelligence/dedup` | POST | Run deduplication |
| `/api/intelligence/status-pipeline` | POST | Run status update pipeline |
| `/api/intelligence/discoveries` | GET | List pending new commitment discoveries |
| `/api/trending` | GET | Get trending data (public, no auth) |
| `/api/scores` | GET | Get combined scores (public, no auth) |
| `/api/reputation` | GET | User karma/level |

---

## Emergency Playbook

**If the app is down:**
1. Check Vercel dashboard for deploy errors
2. Check Supabase dashboard for database issues
3. Redeploy: `cd apps/admin-web && npx vercel --prod --yes`

**If data looks wrong:**
1. Check `/review` for misclassified signals
2. Run reclassify: `POST /api/intelligence/reclassify`
3. Run dedup: `POST /api/intelligence/dedup`

**If scraper breaks:**
1. Check which source failed in sweep logs
2. Comment out broken source in the config array
3. Push and redeploy

**If API keys expire:**
1. OpenClaw token: refreshes automatically on your machine
2. OpenAI/Groq/YouTube: regenerate key, update in Vercel env vars, redeploy

---

## 3-Month Success Metrics

| Week | Target | How to Know |
|---|---|---|
| Week 1 | 10 signups from friends | Supabase auth dashboard |
| Week 2 | 3 friends return unprompted | Check daily active users |
| Week 4 | 100 signups | If yes → buy domain |
| Month 2 | 500 users, 50 evidence submissions | Community is alive |
| Month 3 | 2,000 users, 5 verifiers | Self-sustaining community |

**If Week 2 target fails:** Ask friends WHY they didn't come back. Fix that one thing. Relaunch.

---

## The One Rule

**15 minutes a day. Every day. For 3 months.**

Not 2 hours on Monday then nothing for a week. Consistency beats intensity. The AI handles 95% of the work. Your 15 minutes is the human judgment that makes the 5% difference between a working app and a dead one.
