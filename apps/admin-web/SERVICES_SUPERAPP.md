# Nepal Republic — Services Super-App Architecture

## Vision
Transform Nepal Republic from a civic accountability tracker into a **one-stop app for every government service** — so Nepalis can fill forms, track applications, pay bills, and get reminders, all from home, reducing unnecessary travel to government offices.

## Database Schema (Migration 052)

### `user_identity_profile`
Single row per user. ~40 fields covering: names (EN/NE), identity numbers (citizenship, passport, PAN, NID, voter ID, license), demographics, permanent + temporary address, contact, emergency contacts, occupation. RLS: owner-only.

### `user_applications`
Tracks every service the user applies for. Fields: service_slug, reference_no, office, portal_url, amount_npr, paid status, receipt_no, dates (submitted, expected, completed), status (9 states from `started` → `completed`), reminder_on for push reminders. RLS: owner-only.

### `service_form_drafts`
Auto-saved form data. Keyed on (owner_id, service_slug, form_key). JSONB data column. Tracks submitted state. RLS: owner-only.

## Core Components

### UniversalServiceForm (`components/public/services/form/universal-form.tsx`)
The magic component:
1. Loads user identity profile + any saved draft **in parallel**
2. Auto-fills every field via `profileKey` mapping
3. Auto-saves draft every 5 seconds (debounced)
4. Validates required fields
5. Records as `user_application` on submit
6. Calls `window.print()` for print-ready PDF output
7. Shows "Fill your profile" nudge if identity not set

### FormSchema (`lib/services/form-schemas.ts`)
21 service-specific form schemas: passport (new + renewal), citizenship, PAN, driver's license, voter registration, national ID, birth/death/marriage/migration certificates, ward recommendation, company registration, labor permit, land transfer, vehicle registration, tax clearance, scholarship, SSF, bluebook renewal, electricity connection.

Shared sections (NAMES, ADDRESS, CONTACT) ensure consistency.

### Portal Registry (`lib/portals/registry.ts`)
30+ official government portal entries with:
- URLs, bilingual names, descriptions
- Services they cover (for matching)
- Payment methods supported
- Contact numbers
- `has_online_application` flag

Portals: Passport dept, MoHA, NID Center, Election Commission, Civil Registration, DoTM, IRD, NEA, KUKL, NTC, Ncell, eSewa, Khalti, ConnectIPS, Land dept, Company Registrar, Foreign Employment, Health, SSF, NEB, UGC, MOFAGA, Supreme Court, NRB, NEPSE, Immigration, Nagarik App.

### Identity Profile (`/me/identity`)
Fill once, autofill everywhere. 7 sections of fields saved to `user_identity_profile`. Syncs via `/api/me/identity`.

### Applications Dashboard (`/me/applications`)
- Stats: total, active, estimated time saved
- Card per application with status badge, dates, reference
- Calendar export (.ics) for reminder dates
- Portal deep-link per application
- CRUD: add/edit/delete with slide-up modal

### Bills Hub (`/me/bills`)
Quick-pay for electricity (NEA), water (KUKL), internet, mobile recharge, cable TV, insurance, government fees. Each category has fields for customer/account ID and deep-links to eSewa, Khalti, ConnectIPS.

## API Endpoints

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/me/identity` | GET, POST | Read/upsert identity profile |
| `/api/me/applications` | GET, POST, DELETE | CRUD user applications |
| `/api/me/drafts` | GET, POST | Read/upsert form drafts |
| `/api/me/profile` | GET, PATCH | Account profile (display name, avatar) |
| `/api/me/household-members` | GET, POST, DELETE | Family members |

## Pages

| Route | Description |
|---|---|
| `/me` | Hub with links to identity, applications, vault, services, bills |
| `/me/identity` | Identity profile editor |
| `/me/applications` | Applications tracker dashboard |
| `/me/bills` | Bill payment hub |
| `/me/vault` | Document vault (photos of citizenship, passport, etc.) |
| `/me/tasks` | Service task workflows |
| `/services/[cat]/[slug]/apply` | In-app form for any service |

## Design Principles

1. **Fill once, use everywhere**: Identity profile auto-fills every form
2. **Offline-first**: Drafts save locally, sync when online
3. **Print-ready**: Every form renders as official-looking PDF via browser print
4. **Deep-link, don't replicate**: Link to eSewa/Khalti for payments, not handle money
5. **Bilingual**: Every user-facing string has EN + NE
6. **Progressive**: Works without login (browse services), better with login (autofill, track)
7. **No secrets**: Never stores bank details, passwords, or financial credentials

## Iteration History

### Iteration 1 — Core primitives
Migration 052, identity profile API, applications API, drafts API, UniversalServiceForm, ProfileEditor, ApplicationsDashboard.

### Iteration 2 — Apply flow + portal registry
`/services/[cat]/[slug]/apply` page mounting UniversalServiceForm on every service. 30+ portal entries. PortalLinks component on every service detail page. "Apply in-app" CTA button.

### Iteration 3 — Bills + payments
`/me/bills` page with 7 bill categories. eSewa/Khalti/ConnectIPS deep-links. Payment method badges on portal cards.

### Iteration 4 — Calendar + time tracking
.ics calendar export for reminder dates. "Time saved" counter on applications dashboard. Document checklist on apply page.

### Iteration 5 — Forms expansion + hub
15 new form schemas (total 21). /me page enhanced with Services Hub section. Portal contact numbers. Auto-link from form submit to application tracker.
