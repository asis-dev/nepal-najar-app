# Nepal Najar Launch Strategy: PM Inauguration Day

Balen Shah is being sworn in as Prime Minister on March 26, 2026. This is the single biggest moment to launch Nepal Najar. Everyone in Nepal will be talking about what this government will do. We need to be THE place they go to track it.

---

## Pre-Launch: March 24-25 (2 Days Before)

### Data Preparation
- [ ] Run a full sweep to populate all signals:
  ```bash
  curl -X POST https://nepalnajar.org/api/intelligence/sweep \
    -H "Authorization: Bearer $SCRAPE_SECRET" \
    -H "Content-Type: application/json" \
    -d '{"batchSize": 50}'
  ```
- [ ] Run dedup after sweep:
  ```bash
  curl -X POST https://nepalnajar.org/api/intelligence/dedup \
    -H "Authorization: Bearer $SCRAPE_SECRET"
  ```
- [ ] Run the status pipeline to generate fresh commitment statuses:
  ```bash
  curl -X POST https://nepalnajar.org/api/intelligence/status-pipeline \
    -H "Authorization: Bearer $SCRAPE_SECRET" \
    -H "Content-Type: application/json" \
    -d '{}'
  ```
- [ ] Verify all 109 commitments are loaded and display correctly on `/explore/first-100-days`
- [ ] Check if any commitments need updating for the new PM context (some promises may already have day-1 actions)
- [ ] Review the Najar Index score on `/explore` -- does it look reasonable for a brand new government?

### Test Everything
- [ ] Full signup flow: email signup > verify > login > set hometown > watch a commitment
- [ ] Test the daily page (`/daily`) -- streak, daily promise, voting
- [ ] Test report card generation: visit `/report-card`, share button, download image
- [ ] Test trending page (`/trending`) -- signals displaying correctly
- [ ] Test mero ward page (`/mero-ward`) -- province scores rendering
- [ ] Test on mobile (the majority of Nepali users are on phones)
- [ ] Test Nepali language toggle -- all pages should work in both languages
- [ ] Test the feedback form at `/feedback`
- [ ] Test the evidence submission flow at `/evidence`

### Pilot Testing
- [ ] Share the link with 10 trusted friends/family
- [ ] Ask them to: sign up, set their hometown, watch 3 commitments, submit feedback
- [ ] Collect their feedback (screenshots of anything broken, confusing UX, typos)
- [ ] Fix critical bugs immediately
- [ ] Don't fix cosmetic stuff now -- ship it

### Prepare Social Media Content
- [ ] Write all posts (templates below)
- [ ] Generate report card image for sharing: download from `/api/report-card`
- [ ] Take screenshots of the explore page, trending page, and a specific commitment page
- [ ] Prepare a 30-second screen recording walkthrough (phone, casual, not polished)

---

## Launch Day: March 26

### Morning (Before Inauguration)

**Increase sweep frequency** -- run a sweep every 2 hours instead of the normal 4:
```bash
# Run this manually throughout the day, or temporarily update vercel.json crons
# Quick option: just run manual sweeps
curl -X POST https://nepalnajar.org/api/intelligence/sweep \
  -H "Authorization: Bearer $SCRAPE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 30}'
```

Set a reminder on your phone to run this at: 8am, 10am, 12pm, 2pm, 4pm, 6pm, 8pm, 10pm.

### Post Timing Strategy
1. **7:00 AM** -- Reddit post (early birds, gets time to gain traction)
2. **9:00 AM** -- Facebook Nepal groups (peak morning scroll time)
3. **11:00 AM** -- Threads/X post (around inauguration time)
4. **12:00 PM** -- WhatsApp broadcast (lunch break, people check their phones)
5. **3:00 PM** -- Second round Facebook post (afternoon wave)
6. **7:00 PM** -- Follow-up post with "Day 1 Report Card" from the data

### Platform-Specific Posts

See the section at the bottom of this document for ready-to-copy messages.

### Monitor All Day
- Keep `/trending` open in a tab -- refresh every 30 minutes
- Watch for the first user signups (check Supabase: `auth.users` table)
- Respond to any Reddit/Facebook comments within the hour
- If something breaks, fix it immediately or note it for tomorrow

---

## Post-Launch: March 27 - April 2 (First Week)

### Daily Routine
1. **Morning**: Run a manual sweep, check for overnight signals
2. **Midday**: Check trending, review any flagged signals, respond to feedback
3. **Evening**: Post a "Today's Update" on social media
4. **Before bed**: One more sweep, check user signups

### Engagement Targets (Week 1)
- 100+ signups
- 500+ unique visitors
- 10+ feedback submissions
- At least 1 shared report card screenshot in the wild
- 50+ Reddit upvotes on the launch post

### Daily Social Media Posts
Post a quick update every evening. Template:

**English:**
> Day [X] of the new government. Nepal Najar tracked [N] new signals today. [1-2 sentence highlight]. See the live report card: nepalnajar.org

**Nepali:**
> नयाँ सरकारको दिन [X]। नेपाल नजरले आज [N] नयाँ संकेतहरू ट्र्याक गर्यो। [1-2 वाक्य हाइलाइट]। लाइभ रिपोर्ट कार्ड हेर्नुहोस्: nepalnajar.org

### Capitalize on Viral Moments
If a signal goes viral (a broken promise gets caught, a surprise delivery happens):
- Post about it immediately with a link to the specific commitment page
- Use the report card image showing that commitment's status
- Tag relevant journalists or commentators
- Cross-post to all platforms within the hour

### Bug Triage
- **Critical** (app crashes, signup broken, data wrong): Fix within hours
- **Important** (UI glitch, missing translation): Fix within 24 hours
- **Nice to have** (cosmetic, feature requests): Add to backlog

---

## Content Strategy (Ongoing)

### Daily "Report Card Update"
Template for social media:
```
Nepal Najar Daily Update - Day [X]

Score: [XX]/100 ([grade])
Commitments showing progress: [N]
New signals tracked: [N]

Highlight: [One interesting finding]

Track all 109 commitments: nepalnajar.org
#NepalNajar #BalenShah #RSP #Nepal2082
```

### Weekly "What Changed This Week"
Every Sunday evening, summarize the week:
```
This Week on Nepal Najar:

- [N] new signals tracked
- [Commitment X] moved from "not started" to "in progress"
- [Commitment Y] got its first budget allocation
- [Commitment Z] faces delay due to [reason]

Full report card: nepalnajar.org/report-card
```

### "Did You Know?" Facts
Pull interesting data points from the system:
- "Did you know? Commitment #12 (30,000 MW hydropower) has the most signals -- [N] articles tracked so far."
- "Did you know? [Province] has the highest governance score at [X]/100."
- "Did you know? The AI has analyzed [N] news articles across [X] sources in [Y] languages."

### Shareable Content
- Report card image: `/api/report-card` generates a 1080x1080 Instagram-ready image
- Commitment-specific screenshots from `/explore/first-100-days`
- Province score cards from `/mero-ward`
- Trending page highlights

---

## Launch Messages (Ready to Copy-Paste)

### Reddit (r/Nepal)

**English:**

**Title:** We built a free tool to track all 109 of Nepal's new government commitments -- live report card

**Body:**

Hey r/Nepal,

We built Nepal Najar (nepalnajar.org) -- a tool that automatically tracks whether the new RSP government keeps its 109 campaign promises from the Bacha Patra 2082.

Here is what it does:

- Tracks all 109 RSP campaign commitments with live status updates
- AI-powered engine scans 18+ Nepali and English news sources every few hours
- Shows a national "governance score" (0-100) based on delivery, progress, budget, and trust
- You can set your hometown and see how commitments affect your province
- Daily engagement -- come back each day to see the "promise of the day" and build your streak
- Bilingual -- full English and Nepali support
- You can watch specific commitments and get a personalized report card
- Community evidence submission -- if you see something the AI missed, submit it

Why we built it: Every government makes promises. Nobody systematically tracks them. We wanted to change that for Nepal.

It is completely free, no ads, open source. We are a small team and would love feedback.

Check it out: https://nepalnajar.org

---

**Nepali (separate post or comment):**

**Title:** नेपालको नयाँ सरकारका १०९ वटा बाचाहरू ट्र्याक गर्ने फ्री टुल बनायौं -- लाइभ रिपोर्ट कार्ड

नमस्ते r/Nepal,

हामीले नेपाल नजर (nepalnajar.org) बनायौं -- RSP सरकारको बाचा पत्र २०८२ का १०९ वटा बाचाहरू ट्र्याक गर्ने टुल।

के गर्छ भने:
- सबै १०९ बाचाहरूको लाइभ स्थिति अपडेट
- AI ले हरेक केही घण्टामा १८+ नेपाली र अंग्रेजी समाचार स्रोतहरू स्क्यान गर्छ
- राष्ट्रिय "शासन स्कोर" (०-१००) देखाउँछ
- आफ्नो गाउँ/जिल्ला सेट गर्नुहोस्, तपाईंको क्षेत्रमा के असर पर्छ हेर्नुहोस्
- नेपाली र अंग्रेजी दुवैमा
- समुदायले प्रमाण पेश गर्न सक्छ

किन बनायौं: हरेक सरकारले बाचा गर्छ। कसैले व्यवस्थित रूपमा ट्र्याक गर्दैन। हामी त्यो बदल्न चाहन्थ्यौं।

पूर्ण रूपमा फ्री, कुनै विज्ञापन छैन। फीडब्याक दिनुहोस्!

https://nepalnajar.org

---

### Facebook (Nepal Groups)

**English:**

New government, new promises. But who is keeping track?

We built Nepal Najar -- a free tool that tracks all 109 campaign commitments from the new RSP government.

It scans news from 18+ sources daily, shows a live "governance score," and lets you follow the commitments that matter to YOU.

Set your hometown. Watch the promises. Hold them accountable.

https://nepalnajar.org

#NepalNajar #Nepal #BalenShah #RSP #Governance

**Nepali:**

नयाँ सरकार, नयाँ बाचाहरू। तर कसले हिसाब राख्दैछ?

हामीले नेपाल नजर बनायौं -- RSP सरकारका सबै १०९ बाचाहरू ट्र्याक गर्ने फ्री टुल।

हरेक दिन १८+ समाचार स्रोतबाट AI ले खोज्छ। लाइभ "शासन स्कोर" देखाउँछ। तपाईंलाई चाहिने बाचाहरू फलो गर्नुहोस्।

आफ्नो गाउँ सेट गर्नुहोस्। बाचाहरू हेर्नुहोस्। जवाफदेही बनाउनुहोस्।

https://nepalnajar.org

#नेपालनजर #बालेनशाह #RSP #नेपाल

---

### WhatsApp Broadcast

**English:**

Hey! We just launched Nepal Najar -- a tool that tracks all 109 of the new government's campaign promises. It scans the news automatically and gives a live "report card" score.

You can set your hometown and see how your area is affected. It works in Nepali too.

Check it out and tell me what you think: https://nepalnajar.org

**Nepali:**

नमस्ते! हामीले भर्खरै नेपाल नजर लन्च गर्यौं -- नयाँ सरकारका सबै १०९ बाचाहरू ट्र्याक गर्ने टुल। AI ले समाचार स्क्यान गरेर लाइभ "रिपोर्ट कार्ड" स्कोर दिन्छ।

आफ्नो जिल्ला सेट गर्न सकिन्छ। नेपालीमा पनि चल्छ।

हेर्नुस् र भन्नुस् कस्तो लाग्यो: https://nepalnajar.org

---

### Threads / X (Twitter)

**English:**

Nepal's new PM is sworn in today. We built a tool to track whether the government keeps its 109 campaign promises.

AI scans 18+ news sources daily. Live report card. Set your hometown. Hold them accountable.

Free, no ads, bilingual.

nepalnajar.org

#NepalNajar #Nepal #BalenShah #RSP

**Nepali:**

आज नेपालको नयाँ प्रधानमन्त्रीले शपथ लिँदैछन्। हामीले सरकारका १०९ बाचाहरू ट्र्याक गर्ने टुल बनायौं।

AI ले दैनिक १८+ समाचार स्रोत स्क्यान गर्छ। लाइभ रिपोर्ट कार्ड। आफ्नो गाउँ सेट गर्नुहोस्।

फ्री, विज्ञापन छैन, नेपाली र अंग्रेजी दुवैमा।

nepalnajar.org

#नेपालनजर #बालेनशाह #Nepal2082

---

## Week 2+ Growth Strategy

### Target Communities
- r/Nepal (primary -- tech-savvy, English-speaking diaspora)
- Facebook: "Nepal News," "Hamro Nepal," "Nepali in USA/UK/Australia" groups
- Nepali tech community (Twitter/X, Threads)
- University student groups (WhatsApp, Viber)
- Journalist contacts (personal outreach)

### Partnerships to Pursue
- Nepali tech bloggers / YouTubers -- offer them exclusive data or early access
- Journalists -- "We can give you data for your stories"
- Civil society organizations -- they want this data
- Diaspora organizations -- they care but can't easily track from abroad

### Key Metric to Watch
The single most important metric in week 1 is **return visitors**. If people come back, the product works. If they don't, figure out why before spending energy on growth.

---

## Quick Reference: Sweep Schedule for Launch Day

| Time | Action | Command |
|------|--------|---------|
| 6:00 AM | Pre-inauguration sweep | Full sweep |
| 8:00 AM | Post Reddit | -- |
| 9:00 AM | Sweep + Post Facebook | Full sweep |
| 11:00 AM | Sweep + Post Threads/X | Full sweep |
| 12:00 PM | Send WhatsApp broadcast | -- |
| 2:00 PM | Sweep | Full sweep |
| 4:00 PM | Sweep + check trending | Full sweep |
| 6:00 PM | Sweep | Full sweep |
| 7:00 PM | Post "Day 1 Report Card" | -- |
| 10:00 PM | Final sweep + review day | Full sweep |

Good luck. This is the moment. Ship it.
