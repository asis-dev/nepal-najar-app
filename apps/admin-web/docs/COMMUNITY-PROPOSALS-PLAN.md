# जनताको माग — Janata Ko Maag (The People's Demand)

## Vision
Citizens propose projects for their area → community votes → best ideas rise → government sees what people actually want → progress is tracked publicly with full transparency.

---

## Core User Flows

### Flow 1: Citizen Proposes a Project
```
Sign in → Click "Propose" → Fill form (title, description, location, category)
→ Optionally link to government promise → Submit → Goes live as "Open"
```

### Flow 2: Community Votes & Discusses
```
Browse proposals by area → Read details → Upvote/Downvote
→ Comment with feedback → Share on WhatsApp/social
→ Proposal gains traction → Auto-promoted to "Trending" at 20+ net votes
```

### Flow 3: Official Response
```
Admin/official sees trending proposal → Reviews it
→ Moves to "Under Review" → Posts official response
→ Accepts or rejects with explanation → If accepted, tracks progress
```

### Flow 4: Monitor Progress
```
Accepted proposal → Creator/officials post updates
→ Status timeline shows milestones → Community tracks completion
→ Final status: Completed or Stalled
```

---

## Data Model (6 Tables)

### Table 1: `community_proposals`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Unique identifier |
| author_id | UUID FK → auth.users | Who created it |
| title | TEXT (5-200 chars) | English title |
| title_ne | TEXT | Nepali title |
| description | TEXT (20-5000 chars) | Full description |
| description_ne | TEXT | Nepali description |
| category | TEXT | infrastructure, health, education, environment, transport, technology, water_sanitation, agriculture, tourism, governance, social, energy, other |
| status | TEXT | draft → open → trending → under_review → accepted/rejected → in_progress → completed → archived |
| province | TEXT | Required — which province |
| district | TEXT | Optional — which district |
| municipality | TEXT | Optional — which municipality/ward |
| related_promise_ids | TEXT[] | Links to government promises (e.g., ['15', '80']) |
| upvote_count | INTEGER | Cached count (updated by trigger) |
| downvote_count | INTEGER | Cached count |
| comment_count | INTEGER | Cached count |
| is_flagged | BOOLEAN | Auto-set when flag_count >= 3 |
| flag_count | INTEGER | Number of reports |
| is_hidden | BOOLEAN | Hidden by admin or auto-moderation |
| image_urls | TEXT[] | Supabase storage paths for photos |
| estimated_cost_npr | BIGINT | Estimated cost in NPR |
| impact_score | NUMERIC | Calculated engagement score |
| trending_score | NUMERIC | For hot-sort algorithm |
| created_at | TIMESTAMPTZ | When created |
| updated_at | TIMESTAMPTZ | Last modified |

### Table 2: `proposal_votes`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | |
| proposal_id | UUID FK | Which proposal |
| user_id | UUID FK | Who voted (nullable for anonymous) |
| device_fingerprint | TEXT | For anonymous vote dedup |
| vote_type | TEXT | 'up' or 'down' |
| created_at | TIMESTAMPTZ | |
| **UNIQUE** | (proposal_id, user_id) | One vote per user per proposal |

### Table 3: `proposal_comments`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | |
| proposal_id | UUID FK | Which proposal |
| user_id | UUID FK | Who commented |
| parent_id | UUID FK → self | For threaded replies |
| content | TEXT (1-2000 chars) | Comment text |
| is_approved | BOOLEAN | Moderation gate |
| is_flagged | BOOLEAN | Reported |
| created_at | TIMESTAMPTZ | |

### Table 4: `proposal_updates`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | |
| proposal_id | UUID FK | Which proposal |
| author_id | UUID FK | Who posted update |
| content | TEXT | Update description |
| update_type | TEXT | general, status_change, official_response, milestone |
| old_status | TEXT | Previous status (for status_change) |
| new_status | TEXT | New status |
| created_at | TIMESTAMPTZ | |

### Table 5: `proposal_flags`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | |
| proposal_id | UUID FK | Flagged proposal (nullable) |
| comment_id | UUID FK | Flagged comment (nullable) |
| reporter_id | UUID FK | Who reported |
| reason | TEXT | spam, offensive, duplicate, misinformation, off_topic, other |
| details | TEXT | Optional explanation |
| status | TEXT | pending → reviewed → action_taken / dismissed |
| **UNIQUE** | (proposal_id, reporter_id) | One flag per user per item |

### Table 6: Profile Extensions
```sql
ALTER TABLE profiles ADD COLUMN proposal_karma INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN proposals_created INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN proposals_accepted INTEGER DEFAULT 0;
```

---

## Status Lifecycle

```
                                    ┌──→ rejected
                                    │
draft ──→ open ──→ trending ──→ under_review ──→ accepted ──→ in_progress ──→ completed
                    (auto)         (admin)        (admin)      (admin)        (admin)
                  20+ net votes
```

**Who can change status:**
- `draft → open`: Author (publish)
- `open → trending`: **Automatic** when net votes ≥ 20
- `trending → under_review`: Admin only
- `under_review → accepted/rejected`: Admin only
- `accepted → in_progress → completed`: Admin only
- Any → `archived`: Author or Admin

---

## Trending Algorithm

```
score = (upvotes - downvotes × 0.5 + comments × 0.3) / age_hours^1.8
```

This means:
- A new proposal with 10 upvotes beats an old one with 50
- Comments boost score (shows engagement)
- Downvotes count less than upvotes (prevents brigading)
- Score decays with time (keeps feed fresh)

Recomputed every 30 minutes via Vercel cron or on each vote.

---

## API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/proposals` | GET | List proposals (paginated, filtered) | Public |
| `/api/proposals` | POST | Create proposal | Required |
| `/api/proposals/[id]` | GET | Single proposal detail | Public |
| `/api/proposals/[id]` | PATCH | Update proposal | Author/Admin |
| `/api/proposals/[id]` | DELETE | Soft-delete (hide) | Author/Admin |
| `/api/proposals/[id]/votes` | GET | Vote counts | Public |
| `/api/proposals/[id]/votes` | POST | Cast/change vote | Public (fingerprint) |
| `/api/proposals/[id]/comments` | GET | List comments (threaded) | Public |
| `/api/proposals/[id]/comments` | POST | Submit comment | Required |
| `/api/proposals/[id]/updates` | GET | Status timeline | Public |
| `/api/proposals/[id]/updates` | POST | Post update | Author/Admin |
| `/api/proposals/[id]/flag` | POST | Report proposal/comment | Required |
| `/api/proposals/leaderboard` | GET | Top proposals by area | Public |

**Rate Limits:**
- Create proposal: 3/day per user
- Vote: 60/hour per IP
- Comment: 10/minute per user
- Flag: 10/day per user

---

## UI Pages

### Page 1: Browse Proposals — `/proposals`
```
┌─────────────────────────────────────┐
│  🏛️ Community Proposals            │
│  "Your area, your voice"           │
├─────────────────────────────────────┤
│  [Province ▼] [Category ▼]         │
│  [Trending] [Newest] [Top Voted]   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ 🔺 47  Build a bridge       │   │
│  │        connecting Nuwakot   │   │
│  │  📍 Bagmati · Infrastructure│   │
│  │  💬 12 comments · trending  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 🔺 31  Solar panels for    │   │
│  │        Humla health post   │   │
│  │  📍 Karnali · Energy        │   │
│  │  💬 8 comments · new        │   │
│  └─────────────────────────────┘   │
│  ...                               │
│                                     │
│  [+ Create Proposal]    (FAB)      │
└─────────────────────────────────────┘
```

### Page 2: Proposal Detail — `/proposals/[id]`
```
┌─────────────────────────────────────┐
│  ← Back to Proposals               │
├─────────────────────────────────────┤
│  ● Open          🏗️ Infrastructure │
│                                     │
│  Build a Pedestrian Bridge          │
│  Connecting Nuwakot Villages        │
│  पैदल पुल निर्माण                    │
│                                     │
│  📍 Bagmati · Nuwakot · Bidur      │
│  📎 Related: Promise #15 (Highway) │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  🔺  47  │  │  🔻   3  │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  [Description...]                   │
│  [Estimated cost: NPR 50 lakhs]    │
│                                     │
├── Status Timeline ──────────────────┤
│  ● Mar 21 — Proposal created       │
│  ● Mar 23 — Reached trending       │
│  ○ Under review (pending)          │
│                                     │
├── Comments (12) ────────────────────┤
│  [Comment input...]                │
│  ...threaded comments...            │
│                                     │
├── Related Government Promises ──────┤
│  [Promise #15 card]                │
│                                     │
│  [Share] [Flag] [Watch]            │
└─────────────────────────────────────┘
```

### Page 3: Create Proposal — `/proposals/create`
```
┌─────────────────────────────────────┐
│  Create a Proposal                  │
│  प्रस्ताव बनाउनुहोस्                   │
├─────────────────────────────────────┤
│  Title (English) *                  │
│  [________________________]         │
│                                     │
│  Title (Nepali)                     │
│  [________________________]         │
│                                     │
│  Description *                      │
│  [________________________]         │
│  [________________________]         │
│                                     │
│  Category *                         │
│  [Infrastructure ▼]                │
│                                     │
│  Location *                         │
│  [Province ▼] [District ▼] [Ward ▼]│
│                                     │
│  Related Promises (optional)        │
│  [Search promises...]              │
│  ☑ #15 East-West Highway           │
│                                     │
│  Estimated Cost (NPR, optional)     │
│  [________________________]         │
│                                     │
│  Photos (optional)                  │
│  [📷 Add photos]                   │
│                                     │
│  [Preview] [Submit Proposal]       │
└─────────────────────────────────────┘
```

### Page 4: My Proposals — `/proposals/my`
- Drafts, published, accepted proposals
- Edit/delete controls
- Stats: total votes, comments received

---

## Navigation Integration

**Bottom nav** stays at 6 items. Instead:

1. **Mero Ward page** gets a "Proposals" tab alongside the area scorecard
2. **Landing page** gets a "Community Proposals" section showing top 3 trending proposals
3. **Hamburger menu** gets a "Proposals" link
4. **Promise detail page** — if a promise is stalled, show CTA: "Propose a community alternative"

---

## Gamification & Reputation

### Karma Points
| Action | Points |
|--------|--------|
| Create a proposal | +2 |
| Proposal gets 10 upvotes | +5 |
| Proposal reaches "trending" | +10 |
| Proposal accepted by officials | +25 |
| Proposal completed | +50 |
| Comment on others' proposals | +1 |
| Proposal flagged as spam | -10 |

### Badges
| Badge | Criteria |
|-------|----------|
| 🗣️ Voice of the Community | 5+ proposals with net positive votes |
| ✅ Verified by Community | A proposal with 50+ net upvotes |
| 🌟 Changemaker | A proposal reached "accepted" or "completed" |
| 🏃 Active Citizen | 10+ comments across proposals |

---

## Moderation Rules

1. **Auto-hide** at 5+ flags → admin reviews
2. **Rate limit** creation: 3 proposals/day per user
3. **Duplicate detection**: Check similar titles in same province
4. **Comment moderation**: Auto-approve for users with karma ≥ 10, otherwise queue for admin
5. **Admin dashboard**: Flag review queue, bulk approve/reject
6. **Banned words filter**: Basic profanity + political slurs

---

## Connection to Government Promises

| Integration Point | How |
|-------------------|-----|
| **Proposal → Promise** | Author links proposal to relevant promises via `related_promise_ids` |
| **Promise → Proposals** | Promise detail page shows community proposals that reference it |
| **Stalled Promise CTA** | "This promise is stalled. What would YOU build instead?" → Link to create proposal |
| **Official Response** | Admins can post `official_response` updates on trending proposals |
| **Impact Tracking** | When a linked promise progresses, the proposal's impact score increases |

---

## Build Phases

### Phase 1: Foundation (Day 1)
- [ ] SQL migration: all 6 tables, indexes, RLS, triggers
- [ ] i18n: English + Nepali translation keys
- [ ] Run migration against Supabase

### Phase 2: Core API (Day 2-3)
- [ ] Proposals CRUD route
- [ ] Proposal detail route
- [ ] Votes route (reuse existing vote pattern)
- [ ] Comments route (reuse existing comments pattern)
- [ ] Updates/timeline route
- [ ] Flag route

### Phase 3: Client Hooks (Day 3)
- [ ] useProposals(filters) — paginated list
- [ ] useProposal(id) — single detail
- [ ] useProposalVote(id) — vote widget
- [ ] useProposalComments(id) — threaded comments
- [ ] useMyProposals() — user's own
- [ ] useTrendingProposals() — hot feed

### Phase 4: Browse & Detail Pages (Day 4-5)
- [ ] `/proposals` — browse with filters, glass cards
- [ ] `/proposals/[id]` — full detail with votes, comments, timeline
- [ ] Proposal card component
- [ ] Proposal vote widget component
- [ ] Proposal status timeline component

### Phase 5: Create & Manage (Day 5-6)
- [ ] `/proposals/create` — form with validation
- [ ] `/proposals/my` — user dashboard
- [ ] Location cascading selects (province → district → municipality)
- [ ] Promise search/link selector

### Phase 6: Integration (Day 6-7)
- [ ] Mero Ward — "Proposals" tab
- [ ] Landing page — trending proposals section
- [ ] Promise detail — community proposals section
- [ ] Hamburger menu link
- [ ] Stalled promise CTA

### Phase 7: Polish (Day 7-8)
- [ ] Trending algorithm + scheduled recomputation
- [ ] Moderation: flag system, auto-hide, admin queue
- [ ] Gamification: karma, badges
- [ ] Share buttons (WhatsApp, copy link)
- [ ] SEO metadata

---

## File Map

```
apps/admin-web/
├── supabase/
│   └── 006-community-proposals.sql          # Migration
├── app/
│   ├── api/proposals/
│   │   ├── route.ts                          # GET list, POST create
│   │   ├── [id]/
│   │   │   ├── route.ts                      # GET/PATCH/DELETE single
│   │   │   ├── votes/route.ts                # GET/POST votes
│   │   │   ├── comments/route.ts             # GET/POST comments
│   │   │   ├── updates/route.ts              # GET/POST updates
│   │   │   └── flag/route.ts                 # POST flag
│   │   └── leaderboard/route.ts              # GET top proposals
│   └── (public)/proposals/
│       ├── page.tsx                           # Browse proposals
│       ├── layout.tsx                         # SEO metadata
│       ├── [id]/page.tsx                      # Proposal detail
│       ├── create/page.tsx                    # Create form
│       └── my/page.tsx                        # My proposals
├── components/public/
│   ├── proposal-card.tsx                      # List card
│   ├── proposal-vote-widget.tsx               # Vote up/down
│   ├── proposal-comments.tsx                  # Threaded comments
│   ├── proposal-status-timeline.tsx           # Status history
│   ├── proposal-filter-bar.tsx                # Filters
│   └── create-proposal-form.tsx               # Creation form
├── lib/
│   ├── hooks/
│   │   ├── use-proposals.ts                   # All proposal hooks
│   │   ├── use-proposal-votes.ts              # Vote hooks
│   │   └── use-proposal-comments.ts           # Comment hooks
│   └── stores/
│       └── proposal-draft.ts                  # Zustand draft store
└── messages/
    ├── en.json                                # + proposals.* keys
    └── ne.json                                # + proposals.* keys
```
