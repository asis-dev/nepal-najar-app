# NepalRepublic Service Engine Hardening

Date: 2026-04-09

## Goal

Make NepalRepublic feel like an operator, not a directory:

- user describes the problem in plain language
- the app routes safely to the right service
- the app only auto-routes when confidence is real
- the app keeps a task, next action, household context, and proof of progress
- over time, services move from linked guidance to real integrations

This hardening pass focused on routing accuracy, workflow trust, and integration readiness.

## What Was Broken

The service AI layer was too eager and too shallow:

- broad queries like `hospital appointment` could route to the wrong service
- ambiguous queries could fall back to popular services instead of honest narrowing
- long pasted text did not get condensed into routing signals first
- explicit provider intent like `NEA bill` was not always strong enough to auto-route
- the app had workflow scaffolding, but the integration reality was not documented

## Iteration 1: Replace naive matching with weighted service ranking

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/catalog.ts`

Changes:

- replaced basic substring matching with weighted ranking
- score now considers:
  - title
  - slug
  - tags
  - provider
  - summary
  - steps
  - documents
  - FAQs
  - offices
- added service-intent boosts for:
  - hospitals and OPD appointments
  - driving license flows
  - utility bill payments

Result:

- `renew my driving license` now reliably prefers `drivers-license-renewal`
- `hospital appointment` now ranks hospital services first instead of unrelated popular services

## Iteration 2: Confidence gating and honest fallback

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/service-tasks/from-query/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/task-router.tsx`

Changes:

- removed the fallback that treated the top popular service as “good enough”
- added confidence gating for auto-route decisions
- broad hospital queries now stop at narrowed choices instead of pretending there is one certain answer
- ambiguous task-routing now redirects users to filtered service search instead of sending them to the wrong workflow

Result:

- `hospital appointment` no longer auto-routes to a license workflow
- the app fails safer

## Iteration 3: Route from extracted intent, not raw pasted text

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.ts`

Changes:

- added `buildRoutingQuery()` to condense long user text into routing signals
- examples:
  - long hospital text with “Bir Hospital OPD” becomes a hospital + Bir signal
  - long utility text mentioning NEA becomes an electricity + bill signal
  - license renewal text becomes driving + license + renewal

Result:

- the router is much less likely to get distracted by generic words in large pasted paragraphs

## Iteration 4: Explicit provider routing

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.ts`

Changes:

- explicit provider references now bypass some ambiguity rules
- examples:
  - `bir hospital opd` can auto-route
  - `pay my nea bill` can auto-route
- broad category requests still stay cautious

Result:

- specific intent gets fast routing
- broad intent still gets safe narrowing

## Iteration 5: Integration reality documented as code

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/integration-registry.ts`

Changes:

- created a structured integration registry for:
  - NEA bill payment
  - driver’s license renewal
  - Bir Hospital OPD
  - TUTH OPD
- each entry records:
  - mode: direct / assisted / linked / planned
  - current state
  - blockers
  - next build step

Result:

- we now have a living map of what is truly integrated vs only guided
- this reduces hand-wavy product thinking

## Iteration 6: Guest-safe and ambiguity-safe runtime behavior

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/profile/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/service-tasks/from-query/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/task-router.tsx`

Changes:

- guest profile requests now return a clean unauthenticated payload instead of noisy 401 errors
- ambiguous task-routing now returns a successful structured response with service options
- the frontend renders those options inline instead of treating ambiguity like a failure

Result:

- guest users see fewer rough edges
- “I am not sure yet” feels helpful instead of broken

## Iteration 7: AI provider resilience and cooldown

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.ts`

Changes:

- added cooldown behavior when Gemini returns 429 / quota exhaustion
- embedding and generation calls now pause for a cooldown window after quota errors
- during cooldown, the app falls back to deterministic ranked service answers instead of repeatedly hammering the provider

Result:

- the app stays responsive even when Gemini quota is exhausted
- log noise and latency spikes are reduced

## Iteration 8: Launch hardening made real locally

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/scripts/launch-preflight.js`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/.env.local`

Changes:

- preflight now loads `.env.local` using Next env loading, so local launch checks reflect actual app config
- generated strong local values for:
  - `SCRAPE_SECRET`
  - `CRON_SECRET`
  - `JWT_SECRET`
- disabled legacy admin secret mode locally

Result:

- core launch preflight now passes locally
- only non-blocking warnings remain for owner lock and alert webhook

## Iteration 9: Trending fallback noise reduced

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/intelligence/trending.ts`

Changes:

- expanded missing-table detection to cover schema-cache style Supabase errors
- suppressed repeated warning noise when the trending snapshot table is absent

Result:

- trending can still serve fresh/fallback data without spamming logs about the missing snapshot table

## Current Routing Behavior

Validated examples:

- `hospital appointment`
  - does **not** auto-route
  - returns hospital choices like Bir, TUTH, Patan
- `bir hospital opd`
  - auto-routes to Bir Hospital OPD
- `renew my driving license`
  - auto-routes to Driver’s License Renewal
- `pay my nea bill`
  - should auto-route to NEA bill payment after the explicit-provider hardening pass

## Validation

Tests:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/catalog.test.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.test.ts`

Build:

- `npm run -w @nepal-progress/admin-web build`

## Integration Research Surfaces

The current product should treat these as official / near-official surfaces to integrate against first:

- DoTM: `https://www.dotm.gov.np`
- NEA: `https://www.nea.org.np`
- Khalti service APIs: `https://serviceapi.docs.khalti.com/`
- eSewa developer docs: `https://developer.esewa.com.np/`
- Bir Hospital: `https://www.bhnepal.gov.np`
- TUTH: `https://iom.edu.np/tuth`

These are not all guaranteed to expose clean public APIs for every workflow. In several cases the right first step is:

- linked execution
- receipt / reference capture
- task-state sync
- only then direct integration

## What Still Blocks The “Magic” Goal

1. Real provider confirmations

- payment receipts are still mostly user-confirmed
- hospital bookings are not synced from provider systems
- DoTM booking / payment / delivery status are not integrated end-to-end

2. Unified hospital adapter

- hospital workflows need a normalized model for:
  - slot discovery
  - booking
  - confirmation
  - reschedule
  - attendance

3. Payment verification layer

- utility and fee tasks need provider-backed payment state
- a magic app cannot depend forever on manual “mark as paid”

4. External status sync

- users should eventually see:
  - payment received
  - appointment confirmed
  - application pending
  - ready for pickup

5. More service-specific execution logic

- the workflow engine exists
- the next leap is per-service adapters, not more generic pages

## Next Build Order

1. Wire provider-backed NEA payment confirmation
2. Build reusable hospital appointment adapter
3. Add DoTM booking confirmation capture and later sync
4. Add provider-level status polling / webhook ingestion
5. Move the whole home shell to assistant-first task intake

## Product Truth

Today NepalRepublic is strongest when framed as:

- assistant-guided task routing
- resumable service workflows
- document and household-aware execution
- assisted completion for real Nepal services

It is not yet honest to claim:

- fully integrated everything app
- complete provider-native automation across Nepal

But after this hardening pass, it is materially closer to that end-state and much safer for real users.
