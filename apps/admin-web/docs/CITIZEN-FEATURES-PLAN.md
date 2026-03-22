# Citizen Power Features — "हाम्रो आवाज, हाम्रो प्रमाण"
# (Our Voice, Our Proof)

Six features that give regular citizens real power on Nepal Najar.

---

## Feature 1: Share Proof — "म यहाँ छु" (I Am Here)

### What
Citizens upload photos/videos as proof for or against a promise.
"I saw this road being built" → snap a photo → attach it to Promise #15.

### How It Works
1. Go to any promise detail page
2. Click "Share Proof" button
3. Take a photo or upload from gallery
4. Add a caption: "Construction started on East-West highway near Butwal"
5. Select: ✅ Confirms progress | ❌ Contradicts claim | 📋 Just documenting
6. Auto-tagged with GPS location + timestamp
7. Goes into Evidence section after moderation

### Data Model
```sql
CREATE TABLE citizen_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  promise_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('photo', 'video', 'document', 'link')),
  media_urls TEXT[] NOT NULL,
  caption TEXT CHECK (char_length(caption) <= 500),
  caption_ne TEXT,
  classification TEXT NOT NULL CHECK (classification IN ('confirms', 'contradicts', 'neutral')),
  -- Auto-captured
  latitude NUMERIC,
  longitude NUMERIC,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  -- Moderation
  is_approved BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_count INTEGER DEFAULT 0,
  -- Community validation
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### UI
- "📷 Share Proof" button on every promise detail page
- Photo upload with camera access (mobile)
- Proof gallery on each promise — grid of citizen photos
- Verified badge if 10+ community upvotes on the proof
- Map pin showing WHERE the proof was captured

---

## Feature 2: Follow Officials — "नेतालाई हेर्नुहोस्" (Watch the Leaders)

### What
Track what specific ministers, MPs, or officials say and do.
Follow PM Balen → get notified when he makes a statement about any promise.

### How It Works
1. Go to Government page → click on a minister
2. Click "Follow" button
3. See their activity feed: statements, social media posts, news mentions
4. Get notified when they say something about a promise you're watching
5. Their profile shows: promises they own, what they've said, track record

### Data Model
```sql
CREATE TABLE official_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  official_id UUID NOT NULL REFERENCES officials(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, official_id)
);

-- Extend officials table
ALTER TABLE officials ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE officials ADD COLUMN IF NOT EXISTS bio_ne TEXT;
ALTER TABLE officials ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}';
ALTER TABLE officials ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
```

### UI
- Official profile page: `/officials/[id]`
- Activity feed of their statements (from intelligence signals)
- "Follow" button with follower count
- "Following" page showing all followed officials' recent activity
- Government page: follow button next to each minister name

---

## Feature 3: Smart Notifications — "सतर्क रहनुहोस्" (Stay Alert)

### What
Push notifications when things you care about change.
Not spam — only what matters to YOU.

### Notification Triggers
| Event | Who Gets Notified |
|-------|-------------------|
| Promise status changes | Users watching that promise |
| New evidence on watched promise | Users watching that promise |
| Official you follow makes a statement | Users following that official |
| Proposal you voted on gets accepted | Users who voted |
| Someone comments on your proposal | Proposal author |
| Trending proposal in your area | Users in that area |
| Weekly digest | All users (opt-in) |

### Data Model
```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN (
    'promise_update', 'evidence_added', 'official_statement',
    'proposal_accepted', 'proposal_comment', 'area_trending',
    'weekly_digest', 'system'
  )),
  title TEXT NOT NULL,
  title_ne TEXT,
  body TEXT,
  body_ne TEXT,
  link TEXT,  -- where to navigate when clicked
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  push_enabled BOOLEAN DEFAULT FALSE,
  email_enabled BOOLEAN DEFAULT FALSE,
  promise_updates BOOLEAN DEFAULT TRUE,
  evidence_alerts BOOLEAN DEFAULT TRUE,
  official_statements BOOLEAN DEFAULT TRUE,
  proposal_activity BOOLEAN DEFAULT TRUE,
  area_trending BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT TRUE
);
```

### UI
- Bell icon in top nav with unread count badge
- `/notifications` page — list of all notifications
- Settings page for notification preferences
- Push notifications via web push API (VAPID keys)

---

## Feature 4: Verify/Dispute Claims — "सत्य कि झुट?" (True or False?)

### What
Government says "50% complete" but citizen lives there and knows it's not true.
Community-powered fact-checking.

### How It Works
1. On any promise with progress > 0, see "Do you agree with this progress?"
2. Click "✅ Accurate" or "❌ Disputed" or "⚠️ Partially true"
3. If you dispute, you MUST provide a reason + optional photo proof
4. If 10+ citizens dispute, promise gets "⚠️ Community Disputed" badge
5. The dispute is visible to everyone — transparency

### Data Model
```sql
CREATE TABLE progress_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  promise_id TEXT NOT NULL,
  verification TEXT NOT NULL CHECK (verification IN ('accurate', 'disputed', 'partially_true')),
  reason TEXT,  -- required if disputed
  evidence_urls TEXT[],
  province TEXT,  -- where the user is (for geo-relevance)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, promise_id)
);
```

### UI
- "Verify Progress" section on promise detail page
- Bar showing: 70% say accurate, 20% disputed, 10% partially true
- Dispute details expandable — show reasons and proof
- "⚠️ Community Disputed" badge if >30% dispute rate with 10+ votes

---

## Feature 5: Ward-Level Reporting — "मेरो वार्डको हालत" (My Ward's Reality)

### What
Hyperlocal reports: "In MY ward, THIS is what's actually happening."
Ground truth from the people who live there.

### How It Works
1. Go to Mero Ward → "Report from My Ward"
2. Pick a topic: roads, water, health, schools, etc.
3. Rate: ⭐⭐⭐ (1-5 stars)
4. Write a brief report + optional photos
5. Others in your ward see it → agree/disagree
6. Aggregated into ward-level scorecard

### Data Model
```sql
CREATE TABLE ward_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  province TEXT NOT NULL,
  district TEXT NOT NULL,
  municipality TEXT,
  ward_number TEXT,
  topic TEXT NOT NULL CHECK (topic IN (
    'roads', 'water', 'electricity', 'health', 'education',
    'sanitation', 'internet', 'safety', 'employment', 'other'
  )),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  description TEXT CHECK (char_length(description) <= 1000),
  description_ne TEXT,
  media_urls TEXT[],
  -- Community agreement
  agree_count INTEGER DEFAULT 0,
  disagree_count INTEGER DEFAULT 0,
  -- Moderation
  is_approved BOOLEAN DEFAULT TRUE,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### UI
- "Report" button on Mero Ward page
- Star rating for each topic
- Brief text + photo upload
- Ward scorecard: aggregated ratings by topic
- Heatmap: which wards have the worst infrastructure, water, etc.

---

## Feature 6: Engagement Leaderboard — "सक्रिय नागरिक" (Active Citizens)

### What
Which areas are most engaged? Which officials respond most?
Gamified accountability.

### Leaderboards
1. **Most Engaged Areas** — which provinces/districts have the most citizen activity
2. **Most Responsive Officials** — which ministers actually respond to proposals
3. **Top Contributors** — citizens with highest karma (proposals, evidence, comments)
4. **Trending Areas** — where is activity spiking right now

### Data Model
No new tables — computed from existing data:
- Proposals per area → engagement score
- Official responses → responsiveness score
- User karma → contributor ranking

### UI
- Leaderboard section on landing page
- `/leaderboard` page with tabs: Areas, Officials, Citizens
- Province card on map shows engagement score
- Weekly "Most Active Area" spotlight

---

## Build Priority

| # | Feature | Effort | Impact | Priority |
|---|---------|--------|--------|----------|
| 1 | Share Proof | 2 days | 🔥🔥🔥 Very High | P0 — makes promises real |
| 2 | Verify/Dispute | 1 day | 🔥🔥🔥 Very High | P0 — truth from the ground |
| 3 | Smart Notifications | 2 days | 🔥🔥 High | P1 — keeps people coming back |
| 4 | Ward Reporting | 2 days | 🔥🔥 High | P1 — hyperlocal truth |
| 5 | Follow Officials | 1.5 days | 🔥 Medium | P2 — depends on scraper data |
| 6 | Leaderboard | 1 day | 🔥 Medium | P2 — gamification layer |

**Total: ~9.5 days**

---

## The Big Picture

When all these features are live, Nepal Najar becomes:

```
Government promises what → Nepal Najar tracks it
Citizens see if it's true → Share proof from the ground
Citizens propose what THEY need → Community votes
Officials are watched → Every statement tracked
Areas report their reality → Ground truth dashboard
Engagement is rewarded → Active citizens recognized
```

This isn't just a tracker anymore — it's a **democratic accountability platform**.
