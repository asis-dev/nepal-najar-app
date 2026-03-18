# Nepal Najar — नेपाल नजर
# "जनताको नजरमा बालेनको नेपाल"
# Architecture & Agent Reference

> This document is the single source of truth for all agents, crawlers, and developers
> working on Nepal Najar. It covers architecture, API contracts, i18n terminology,
> design system, and integration points.

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| **Name** | Nepal Najar (नेपाल नजर) |
| **Tagline EN** | The public eye on Balen's Nepal |
| **Tagline NE** | जनताको नजरमा बालेनको नेपाल |
| **Domain** | nepalnajar.com |
| **Purpose** | Government transparency & development tracking |
| **Target** | Nepal's 14.8M social media users, median age 25.3 |
| **Growth hook** | वचन अनुगमन (Promise Tracker) — shareable on FB/WhatsApp |

---

## 2. Monorepo Structure

```
nepal-progress/
├── apps/
│   └── admin-web/          # Next.js 14 (App Router) — Port 3000
│       ├── app/
│       │   ├── (landing)/   # Landing page route group
│       │   ├── (public)/    # Public-facing pages (explore/*)
│       │   ├── (dashboard)/ # Admin dashboard (auth required)
│       │   └── api/         # API routes (OG images, etc.)
│       ├── components/
│       │   ├── public/      # TopNav, BottomNav, Footer, HometownPicker
│       │   ├── map/         # NepalDeckMap (deck.gl), Nepal3DMap (canvas fallback)
│       │   ├── chat/        # ChatFAB
│       │   └── seo/         # StructuredData
│       ├── lib/
│       │   ├── hooks/       # use-projects.ts (React Query), use-chat.ts
│       │   ├── i18n/        # I18nProvider, useI18n, useTranslation
│       │   ├── stores/      # Zustand: preferences (hometown), watchlist
│       │   └── seo.ts       # createMetadata(), governmentServiceSchema()
│       ├── messages/
│       │   ├── en.json      # English strings
│       │   └── ne.json      # Nepali strings (शुद्ध नेपाली, NPC register)
│       └── public/
│           ├── geo/          # nepal-provinces.geojson (7 provinces)
│           └── manifest.json # PWA manifest
├── services/
│   ├── api/                 # NestJS — Port 3001
│   │   └── src/
│   │       ├── entities/    # 40+ TypeORM entities
│   │       └── modules/     # Feature modules (projects, scraping, chat, etc.)
│   └── ai-service/          # FastAPI (Python) — Port 8000
│       └── app/services/    # LLM, embeddings, scraping, anomaly detection
├── docs/                    # This documentation
└── .claude/
    └── launch.json          # Dev server config
```

---

## 3. Services & Ports

| Service | Tech | Port | Base URL |
|---------|------|------|----------|
| Frontend | Next.js 14 | 3000 | `http://localhost:3000` |
| API | NestJS + TypeORM | 3001 | `http://localhost:3001/api/v1/` |
| AI Service | FastAPI + LangChain | 8000 | `http://localhost:8000` |
| PostgreSQL | v15 | 5432 | — |
| Redis | v7 | 6379 | — |
| MinIO | — | 9000/9001 | — |

---

## 4. API Endpoints (for Crawler Agent)

The NestJS API at `http://localhost:3001/api/v1/` exposes:

### Projects
```
GET    /projects                    # List (paginated, filterable)
GET    /projects/:id                # Detail
POST   /projects                    # Create
PATCH  /projects/:id                # Update
GET    /projects/:id/milestones     # List milestones
GET    /projects/:id/blockers       # List blockers
GET    /projects/:id/versions       # Version history
GET    /projects/:id/evidence       # Evidence attachments
```

### Dashboard
```
GET    /dashboards/overview         # totalProjects, totalActive, overallProgress
GET    /dashboards/national         # regionBreakdown (7 provinces with totals/delayed/severity)
```

### Scraping (Crawler writes here)
```
POST   /scraping/findings           # Submit scraped findings
GET    /scraping/sources             # List configured sources
GET    /scraping/jobs                # List scraping jobs
POST   /scraping/jobs               # Trigger new scrape
```

### Chat
```
POST   /chat/message                # Send message, get AI response + sources
```

### Other modules
```
/organizations, /users, /evidence, /verification, /milestones,
/blockers, /budget, /notifications, /audit, /tasks, /updates
```

### Data shapes the crawler should produce:

```typescript
// When submitting a scraped finding:
interface ScrapedFinding {
  source_url: string;
  source_name: string;         // e.g. "Kantipur Daily", "NPC", "PPMO"
  title: string;
  content: string;             // Article/finding text
  published_date?: string;     // ISO 8601
  language: 'en' | 'ne';
  matched_project_id?: string; // UUID if matched to existing project
  finding_type: 'news' | 'government' | 'procurement' | 'social' | 'international';
  metadata?: Record<string, any>;
}
```

---

## 5. Database Entities (Key ones for Crawler)

| Entity | Purpose | Key fields |
|--------|---------|------------|
| `project` | Core development project | id, title, description, status, progress, region_id, government_unit_id, budget, priority |
| `region` | Province/area | id, name (English), code |
| `government_unit` | Ministry/department | id, name, type, parent_id |
| `project_milestone` | Phase/milestone | id, project_id, title, status, sequence, due_date, completion_date |
| `project_blocker` | Obstruction/issue | id, project_id, title, description, severity, status |
| `external_finding` | Scraped article/report | id, source_url, source_name, title, content, published_date, language |
| `research_finding` | AI analysis result | id, project_id, finding_type, content, confidence |
| `anomaly_flag` | Contradiction/discrepancy | id, project_id, description, flag_type, severity |
| `evidence_attachment` | Photos/documents | id, project_id, file_url, upload_source |
| `citizen_report` | Public reports | id, project_id, description, location, photo_url |
| `watchlist` | User bookmarks | id, user_id, project_id |
| `project_version` | Change history | id, project_id, data_snapshot, changed_by |
| `audit_log` | Full audit trail | id, entity_type, entity_id, action, before, after |

### Project statuses
`active` | `completed` | `suspended` | `draft` | `cancelled`

### Blocker severities
`low` | `medium` | `high` | `critical`

### Blocker statuses
`open` | `in_progress` | `escalated` | `resolved`

---

## 6. AI Service (Python) — Crawler Integration

Located at `services/ai-service/app/services/`:

| Service | File | Purpose |
|---------|------|---------|
| **Researcher** | `researcher.py` | Orchestrates web scraping, finds news about projects |
| **LLM Service** | `llm_service.py` | Summarization, entity extraction, contradiction detection |
| **Anomaly Detector** | `anomaly_detector.py` | Cross-references official data vs external sources |
| **Embedding Service** | `embedding_service.py` | Semantic search, project-article matching |
| **Discovery Service** | `discovery_service.py` | Finds potential new projects from scraped content |
| **Translator** | `translator.py` | EN↔NE translation with government terminology |
| **Confidence Scorer** | `confidence_scorer.py` | Computes trust scores from multiple sources |
| **Chat Service** | `chat_service.py` | RAG-based Q&A over project data |

### Current scraping sources (11):
The researcher.py already scrapes from: MyRepublica, Kathmandu Post, Nepal Monitor,
The Himalayan Times, Online Khabar, Nepal24Hours, Department of Roads,
Ministry of Finance, World Bank Nepal, ADB Nepal, Khabarhub

### Planned expansion (to 40+):
Add: Kantipur Daily, Gorkhapatra, Setopati, Ratopati, Annapurna Post, Nagarik News,
NPC (npc.gov.np), PPMO (procurement), CIAA (anti-corruption), Auditor General (oag.gov.np),
Bolpatra (e-procurement), all 7 provincial gov websites, UNDP Nepal, JICA Nepal

---

## 7. Nepali Language Reference (शुद्ध नेपाली शब्दावली)

### Source authority
All Nepali terminology follows **राष्ट्रिय योजना आयोग (NPC)** and **nepal.gov.np** standards.
Reference: https://npc.gov.np, their अनुगमन तथा मूल्याङ्कन division.

### CRITICAL: Do NOT use transliterated English
❌ ट्र्याकर, माइलस्टोन, ड्यासबोर्ड, फिल्टर, स्कोरकार्ड, लोड
✅ अनुगमन, टप्पा, नियन्त्रण पाटी, छान्नुहोस्, मूल्याङ्कन, लोड हुँदैछ

### Core vocabulary

| English | Nepali (शुद्ध) | Notes |
|---------|---------------|-------|
| Project | आयोजना | NPC uses this, NOT परियोजना |
| Monitoring/Tracking | अनुगमन | Official govt term |
| Evaluation | मूल्याङ्कन | NPC term |
| Progress | प्रगति | — |
| Development | विकास | — |
| Milestone | टप्पा | Stage/phase (NOT माइलस्टोन) |
| Blocker/Obstacle | बाधा | Natural Nepali |
| Implementation | कार्यान्वयन | — |
| Budget | बजेट | Accepted loanword |
| Allocation | विनियोजन | — |
| Report | प्रतिवेदन | — |
| Plan | योजना | — |
| Province | प्रदेश | — |
| District | जिल्ला | — |
| Municipality | नगरपालिका | — |
| Ministry | मन्त्रालय | — |
| Department | विभाग | — |
| Commission | आयोग | — |
| Transparency | पारदर्शिता | — |
| Accountability | जवाफदेहिता | — |
| Corruption | भ्रष्टाचार | — |
| Anti-Corruption | भ्रष्टाचार निवारण | CIAA terminology |
| Commitment/Promise | वचन / प्रतिबद्धता | — |
| Citizen | नागरिक | — |
| Public funds | सार्वजनिक कोष | — |

### Status labels

| English | Nepali |
|---------|--------|
| Active | सक्रिय |
| Completed | सम्पन्न |
| Suspended | स्थगित |
| Draft | मस्यौदा |
| Cancelled | रद्द |

### Severity levels

| English | Nepali |
|---------|--------|
| Low | न्यून |
| Medium | मध्यम |
| High | उच्च |
| Critical | गम्भीर |

### Trust levels

| English | Nepali |
|---------|--------|
| Verified | प्रमाणित |
| Partial | आंशिक |
| Unverified | अपुष्ट |
| Disputed | विवादित |

### UI terms

| English | Nepali |
|---------|--------|
| Search | खोज्नुहोस् |
| Filter | छान्नुहोस् |
| Share | साझा गर्नुहोस् |
| Copy | प्रतिलिपि |
| Back | पछाडि |
| Next | पछिल्लो |
| Previous | अघिल्लो |
| Loading | लोड हुँदैछ |
| Update | अद्यावधिक |
| On Track | समयमा |
| Delayed | ढिलो |
| Home | गृहपृष्ठ |
| Chat/Dialogue | संवाद |
| Dashboard | नियन्त्रण पाटी |

### Seven Provinces

| English | Nepali |
|---------|--------|
| Koshi | कोशी |
| Madhesh | मधेश |
| Bagmati | बागमती |
| Gandaki | गण्डकी |
| Lumbini | लुम्बिनी |
| Karnali | कर्णाली |
| Sudurpashchim | सुदूरपश्चिम |

### Category names

| English | Nepali |
|---------|--------|
| Infrastructure | पूर्वाधार |
| Transport | यातायात |
| Technology | प्रविधि |
| Health | स्वास्थ्य |
| Energy | ऊर्जा |
| Education | शिक्षा |
| Environment | वातावरण |
| Governance | सुशासन |

---

## 8. i18n System

**Approach:** Custom React Context (NOT next-intl middleware)
**Files:** `lib/i18n/index.tsx`, `messages/en.json`, `messages/ne.json`
**Storage:** `localStorage` key `nepal-najar-locale`
**Usage:**

```tsx
import { useI18n } from '@/lib/i18n';
const { t, locale, setLocale } = useI18n();
// t('project.milestones') → "टप्पाहरू" (when locale='ne')
// Dot notation: t('chat.suggestions.1')
```

**Font:** Mukta (Devanagari + Latin) — loaded in root layout as `--font-mukta`
**Font families:** `font-sans` (Inter + Mukta), `font-display` (Playfair), `font-nepali` (Mukta only)

---

## 9. Design System

### Color tokens (Tailwind)

| Token | Value | Use |
|-------|-------|-----|
| `np-void` | #050510 | Map/globe background |
| `np-base` | #0a0e1a | App background |
| `np-surface` | #0f1629 | Card surfaces |
| `np-elevated` | #151d35 | Elevated surfaces |
| `np-border` | rgba(255,255,255,0.08) | Default borders |
| `primary-500` | #3b82f6 | Primary blue |
| `cyan-400` | #22d3ee | Accent cyan |

### Glass morphism
```css
.glass-card {
  background: rgba(15, 22, 41, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border-radius: 1rem;
}
```

### Animations
`glow-pulse`, `float`, `shimmer`, `fade-in`, `slide-up`, `slide-in-right`, `count-up`, `progress-fill`

---

## 10. Frontend State Management

| Store | File | Persistence | Purpose |
|-------|------|-------------|---------|
| Hometown | `lib/stores/preferences.ts` | localStorage `nepal-najar-preferences` | Province/district selection |
| Watchlist | `lib/stores/preferences.ts` | localStorage `nepal-najar-watchlist` | Bookmarked project IDs |
| Locale | `lib/i18n/index.tsx` | localStorage `nepal-najar-locale` | EN/NE preference |
| Server data | React Query | In-memory cache (60s stale) | Projects, dashboards, etc. |

---

## 11. SEO & Social Sharing

| Feature | Implementation |
|---------|---------------|
| OG images | `app/api/og/route.tsx` — Edge runtime, 1200x630px, dark luxury theme |
| Sitemap | `app/sitemap.ts` — Auto-generated from routes |
| Robots | `app/robots.ts` — Allows /, disallows /home, /login, /api/ |
| Structured data | Schema.org GovernmentService in `<head>` |
| Meta tags | `lib/seo.ts` → `createMetadata()` |
| WhatsApp sharing | Deep links: `https://wa.me/?text=...` |
| Facebook sharing | Standard sharer URL |

---

## 12. Public Routes

| Path | Page | Description |
|------|------|-------------|
| `/explore` | Home | Hero, stats, featured projects, province cards, updates |
| `/explore/map` | Map | 3D deck.gl province map with project sidebar |
| `/explore/projects` | Browser | Search, filter, paginated project list |
| `/explore/projects/[id]` | Detail | Progress ring, milestones, blockers, share buttons |
| `/explore/chat` | AI Chat | Bilingual Q&A with project sources |
| `/explore/first-100-days` | Tracker | वचन अनुगमन — 10 tracked promises |

---

## 13. For the Crawler Agent

When your crawler agent needs to write to this app:

1. **Submit findings** via `POST /api/v1/scraping/findings` with the `ScrapedFinding` shape (see Section 4)
2. **Language field** must be `'en'` or `'ne'` — the AI service translator handles cross-translation
3. **Project matching** — if the crawler can match an article to a project, include `matched_project_id`. Otherwise, the embedding service will auto-match using semantic similarity.
4. **Anomaly detection** runs automatically when new findings contradict existing project data
5. **Trust scores** are recomputed when new external sources are added for a project

### Crawler → AI Service flow:
```
Crawler scrapes article
  → POST /api/v1/scraping/findings
  → AI Service: embedding_service.embed(article)
  → AI Service: embedding_service.find_similar_projects(article)
  → AI Service: anomaly_detector.cross_reference(project, article)
  → If contradiction: anomaly_flag created
  → confidence_scorer.recompute(project_id)
  → Frontend shows updated trust badge
```

### Reading from the app:
```
GET /api/v1/projects?status=active&limit=100    # All active projects
GET /api/v1/dashboards/national                   # Province breakdown
GET /api/v1/projects/:id/evidence                  # Evidence for a project
GET /api/v1/scraping/sources                       # Configured scraping sources
```

---

## 14. Environment Variables

```bash
# API
DATABASE_URL=postgresql://user:pass@localhost:5432/nepal_progress
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
MINIO_ENDPOINT=localhost
MINIO_PORT=9000

# AI Service
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SITE_URL=https://nepalnajar.com
```

---

## 15. Build & Run

```bash
# Install
npm install

# Dev (all services)
npm run dev

# Frontend only
npm run -w @nepal-progress/admin-web dev

# Build
npm run -w @nepal-progress/admin-web build

# PATH (required on this machine)
export PATH=/Users/priyanka.shrestha/.nvm/versions/node/v20.20.0/bin:$PATH
```
