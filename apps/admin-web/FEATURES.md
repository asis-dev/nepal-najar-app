# Nepal Najar — Feature Documentation

> **जनताको नजरमा बालेनको नेपाल** — Tracking governance promises through the people's lens

## Overview

Nepal Najar is a bilingual (English/Nepali) governance promise tracker built on Next.js 14. This document covers the viral engagement features added to drive daily retention, personalization, and social sharing.

---

## Architecture

```
lib/
├── data/
│   ├── promises.ts          # Core promise data + computeStats()
│   ├── najar-index.ts        # National governance score (0-100)
│   ├── daily-promise.ts      # Deterministic daily promise picker
│   └── ward-scores.ts        # Province/district score engine
├── stores/
│   ├── preferences.ts        # User prefs: hometown, locale, watchlist (Zustand)
│   └── engagement.ts         # Streak tracking + index cache (Zustand)
└── i18n/
    └── index.tsx             # useI18n() hook

components/public/
├── najar-index-dial.tsx      # SVG circular gauge (full/compact)
├── daily-streak.tsx          # Streak counter + today's promise
├── mero-ward-card.tsx        # Personalized region score card
├── watchlist-panel.tsx       # Slide-out watchlist overlay
└── hometown-picker.tsx       # Province/district selector (with score preview)

app/
├── (public)/
│   ├── daily/page.tsx        # Daily engagement page
│   ├── mero-ward/page.tsx    # Province leaderboard + district drill-down
│   ├── report-card/page.tsx  # Shareable weekly report card
│   ├── watchlist/page.tsx    # Watchlist management
│   └── explore/
│       ├── page.tsx          # Main explore (embeds index dial, streak, ward card)
│       └── first-100-days/
│           ├── page.tsx      # Promise grid (with bookmark toggles)
│           └── [id]/page.tsx # Promise detail (with watch button)
└── api/
    └── report-card/route.tsx # 1080x1080 ImageResponse (Edge runtime)
```

---

## Feature 1: Nepal Najar Index

**Route:** Embedded on `/explore` | Full at `/daily`
**Data:** `lib/data/najar-index.ts`
**Component:** `components/public/najar-index-dial.tsx`

### What It Does
A single 0-100 national governance score computed from five weighted sub-scores:

| Sub-Score | Weight | Source |
|-----------|--------|--------|
| Delivery Rate | 25% | % of promises with status `delivered` |
| Average Progress | 30% | Mean progress % across all promises |
| Trust Score | 15% | Weighted: verified=100%, partial=50%, unverified=0% |
| Budget Utilization | 20% | Total spent / total estimated across budgeted promises |
| Citizen Sentiment | 10% | Upvote ratio from vote aggregates (mock: 62%) |

### Grading Scale
- **A** (80+): Excellent / उत्कृष्ट
- **B** (60-79): Good / राम्रो
- **C** (40-59): Average / औसत
- **D** (20-39): Poor / कमजोर
- **F** (<20): Failing / असफल

### Weekly Change
A deterministic mock value (-3 to +3) computed from the ISO week number. Creates the appearance of movement without real temporal data.

### UI Variants
- **`variant="full"`**: Large ring + score + grade badge + 5 sub-score horizontal bars
- **`variant="compact"`**: Small ring + score + grade + weekly change indicator

---

## Feature 2: Daily Streak

**Route:** `/daily`
**Data:** `lib/stores/engagement.ts` + `lib/data/daily-promise.ts`
**Component:** `components/public/daily-streak.tsx`

### How Streaks Work
1. On page load, `recordVisit()` is called via `useEffect`
2. Compares `lastVisitDate` to today's Nepal timezone date (UTC+5:45)
3. If yesterday → increment `currentStreak`
4. If today → no-op (already counted)
5. If older → reset to 1
6. `longestStreak` is tracked as the all-time high

### Daily Promise
- `getDailyPromise()` hashes the Nepal-timezone date string to pick a deterministic promise index
- All users see the same promise on the same day
- `getDailyPromiseHistory(7)` returns the last 7 days for the calendar view

### Interaction Tracking
- When the user votes on today's promise, `recordInteraction()` sets `todayInteracted = true`
- UI shows a green checkmark "Done for today!" state

### Storage
- Zustand persist store with key `'nepal-najar-engagement'`
- Stored in `localStorage` — no account required

---

## Feature 3: Mero Ward Score

**Route:** `/mero-ward`
**Data:** `lib/data/ward-scores.ts`
**Component:** `components/public/mero-ward-card.tsx`

### Province Scoring
Each province gets a composite score from:
```
Score = 0.4 × progressScore + 0.3 × (1 - delayRatio) × 100 + 0.2 × budgetUtil + 0.1 × deliveryRate
```

Where `progressScore` uses a **category affinity matrix** — each province weights promise categories differently:
- Bagmati: Technology (1.0), Governance (0.9), Anti-Corruption (0.9)
- Karnali: Infrastructure (1.0), Transport (1.0), Health (0.9)
- etc.

### District Scoring
Districts derive scores from their parent province + a hash-based variance of ±10 points. This creates realistic-looking variation without actual per-district data.

### Leaderboard
- 7 provinces ranked by score
- Click a province to expand district rankings
- User's province is highlighted with a primary border/glow
- National average shown as a reference line

### Hometown Picker Integration
The hometown picker (`components/public/hometown-picker.tsx`) shows:
- Score badge (X/100) next to each province
- Province score summary strip when drilling into districts

---

## Feature 4: Weekly Report Card

**Route:** `/report-card` | **API:** `/api/report-card`
**Data:** Inline computation in Edge route (can't import Zustand)

### Image Generation
- **Edge runtime** using `next/og` `ImageResponse`
- Renders a **1080x1080** shareable infographic
- All styles are inline JSX (Satori constraint — no Tailwind)
- Dark gradient background matching the app theme

### Layout
1. Header: "नेपाल नजर" branding + "साप्ताहिक प्रतिवेदन"
2. Center: Large score number with SVG ring gauge
3. Stats grid: Delivered / In Progress / Stalled / Not Started (with colored dots)
4. Budget bar: Spent vs Allocated visualization
5. Metric cards: Total promises, avg progress, trust verified, budget utilization
6. Footer: nepalnajar.com watermark + date

### Sharing
- Primary: Web Share API (`navigator.share`)
- Fallbacks: WhatsApp, Facebook, X (Twitter), Copy Link
- Download button (direct link to `/api/report-card`)

---

## Feature 5: Watchlist

**Route:** `/watchlist` | **Panel:** `components/public/watchlist-panel.tsx`
**Data:** `lib/stores/preferences.ts` (`watchedProjectIds`)

### How It Works
- Users click the Bookmark icon on promise cards or detail pages
- `toggleWatch(promiseId)` adds/removes from the watchlist
- `isWatched(promiseId)` checks if a promise is bookmarked
- Stored in Zustand persist store (`'nepal-najar-preferences'`)

### UI Touchpoints
1. **Promise grid** (`first-100-days/page.tsx`): Bookmark icon on each card
2. **Promise detail** (`first-100-days/[id]/page.tsx`): "Watch"/"Watching" button in header
3. **Watchlist panel**: Slide-out overlay with watched promises list
4. **Watchlist page** (`/watchlist`): Full management with detailed cards

---

## Internationalization

All features are fully bilingual. Keys are in `messages/en.json` and `messages/ne.json`:

| Section | Example Key | English | Nepali |
|---------|------------|---------|--------|
| `najarIndex` | `najarIndex.title` | Nepal Najar Index | नेपाल नजर सूचकांक |
| `dailyStreak` | `dailyStreak.title` | Daily Watch | दैनिक निगरानी |
| `meroWard` | `meroWard.title` | Mero Ward Score | मेरो वार्ड स्कोर |
| `reportCard` | `reportCard.title` | Weekly Report Card | साप्ताहिक प्रतिवेदन |
| `watchlist` | `watchlist.title` | My Watchlist | मेरो सूची |

The `useI18n()` hook provides `{ t, locale, setLocale }`. Components use `locale === 'ne'` checks for dynamic text.

---

## State Management

All client state uses **Zustand with persist middleware** (localStorage):

| Store | Key | Purpose |
|-------|-----|---------|
| `usePreferencesStore` | `'nepal-najar-preferences'` | Locale, hometown, watchlist, voting |
| `useEngagementStore` | `'nepal-najar-engagement'` | Streak, interaction flag, index cache |

### Hydration Pattern
Since localStorage is unavailable during SSR, all store-dependent components use:
```tsx
const [hydrated, setHydrated] = useState(false);
useEffect(() => { setHydrated(true); }, []);
if (!hydrated) return <Skeleton />;
```

---

## Nepal Timezone

Nepal uses UTC+5:45 (non-standard offset). All date-sensitive features compute Nepal time manually:
```ts
const nepalOffset = 5 * 60 + 45; // 345 minutes
const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
const nepalDate = new Date(utcMs + nepalOffset * 60000);
```

This ensures:
- Daily promise changes at midnight NPT for all users
- Streak resets align with Nepal's day boundary
- Report card dates reflect Nepal time

---

## Future Work
- **Real vote aggregates**: Replace mock citizen sentiment with actual voting data
- **Backend API**: Move province/district scores to server-computed endpoints
- **Push notifications**: Remind users to maintain their streak
- **Report card customization**: Let users pick which stats to highlight
- **District-level project mapping**: Real data per district instead of hash-derived scores
