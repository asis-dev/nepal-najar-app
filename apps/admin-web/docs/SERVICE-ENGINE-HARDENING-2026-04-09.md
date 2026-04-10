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

## Iteration 10: Structured intake for hard human language

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/services/ask/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/service-tasks/from-query/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.test.ts`

Changes:

- added a structured `intakeState` to the backend AI response:
  - domain
  - subject
  - urgency
  - care need
- symptom-led health requests now stay conversational instead of over-routing
- child health requests bias Kanti higher, but still ask follow-up questions unless the user explicitly names a hospital
- pregnancy / maternity requests now get maternity-specific reasoning, follow-up prompts, and options
- auto-route decisions now use the original user phrasing, not only the compressed routing query
- bumped cache version so stale overconfident routes do not linger

Result:

- `I am not feeling well`
  - stays ambiguous
  - asks a health triage style follow-up
- `My child has fever`
  - stays ambiguous
  - prioritizes Kanti and pediatric follow-ups
- `My father needs a doctor today`
  - stays ambiguous
  - asks a parent-specific follow-up
- `Need pregnancy checkup appointment`
  - stays ambiguous
  - prioritizes maternity care and asks whether the need is ANC, delivery, or specialist care

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

## Iteration 11: Short-lived conversational memory for intake

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/services/ask/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/service-tasks/from-query/route.ts`

Changes:

- kept recent intake context attached to task creation and assistant follow-up
- made routing decisions less brittle across multi-turn service conversations
- preserved assistant-side structure so later workflow surfaces can continue from the same case context

Result:

- service intake feels less stateless
- the backend can carry user intent forward into the task instead of starting over every turn

## Iteration 12: Task-backed execution for services, not just reading

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/service-tasks/[id]/form-state/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/form/universal-form.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/(public)/services/[category]/[slug]/apply/page.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-types.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-engine.ts`

Changes:

- connected the in-app forms to the service task instead of keeping them isolated
- form drafts now save into the case
- final submit now advances the task state, progress, and activity log
- users can import scanned documents into the form and reuse extracted identity fields

Result:

- the app now acts like an operator workspace for the citizen
- users can start, pause, scan, resume, and submit while keeping the whole trail on one task

## Iteration 13: Secure payment profile and approval-gated payments

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/payment-profile.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/payment-profile/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/payments/initiate/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/payment-checkout.tsx`

Changes:

- added a stored payment preference profile using masked wallet metadata only
- made payment launch require explicit user approval when configured
- attached payment preferences and receipt flow back into the service experience

Result:

- users can move faster on repeat payments
- the payment flow stays safer and more explicit

## Iteration 14: Shared execution panels across departments

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/service-execution-panel.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/transport-execution-panel.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/(public)/services/[category]/[slug]/page.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/workflow-definitions.ts`

Changes:

- replaced the transport-only execution surface with a reusable task action panel pattern
- service detail pages can now show a live execution surface for non-health departments whenever a workflow is defined
- added richer workflow milestones and action checkpoints for:
  - passports
  - citizenship variants
  - PAN and tax flows
  - civil registration flows
  - police report follow-up
  - land and ownership transfer
  - company and local business registration

Result:

- more services now behave like guided case execution, not static instructions
- users can save real progress markers such as submissions, payments, office visits, and issuance references

## Validation

Validated in this pass:

- `npx tsc -p /Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/tsconfig.json --noEmit`
- `npx jest --config /Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/jest.config.js /Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.test.ts /Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-store.test.ts /Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/resolution-plan.test.ts /Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/payment-profile.test.ts --runInBand`

Note:

- running Jest from the repo root hit unrelated workspace-collision issues from `.claude/worktrees`
- running with the app-local Jest config in `apps/admin-web` passed cleanly

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/services/ask/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/service-tasks/from-query/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/service-chat.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/task-router.tsx`

Changes:

- added browser-backed `sessionId` support for the service chat and task router
- added short-lived backend intake session memory
- follow-up prompts can now understand short replies like:
  - `for my father`
  - `for my child`
  - `yes, Kanti`
- cache is bypassed when active intake memory exists, so follow-up turns do not get stale generic answers

Result:

- the assistant can carry context across multiple turns instead of treating each message like a fresh cold start

## Iteration 12: Slot-aware follow-up questions without breaking health triage

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/ai.test.ts`

Changes:

- added structured `intakeSlots` for:
  - health hospital hint / specialty hint / visit goal
  - utility provider / account-known / amount-known
  - license intent
  - citizenship intent
  - passport intent
- added missing-slot detection so the assistant can ask the next best narrowing question
- preserved stronger symptom-led health triage prompts ahead of generic slot prompts

Result:

- `I am not feeling well`
  - still gets care-oriented health triage
- `for my father`
  - becomes a parent-health follow-up instead of a generic route jump
- utility, license, citizenship, and passport flows now ask more targeted narrowing questions

## Iteration 13: Persist assistant understanding into service tasks

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-store.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-store.test.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-engine.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-types.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/service-tasks/from-query/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/advisor/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/service-tasks/[id]/hospital-appointment-request/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/hospital-appointment-panel.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/utility-bill-panel.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/integrations/hospitals/adapter.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/integrations/hospitals/adapter.test.ts`

Changes:

- new tasks and resumed tasks now store compact assistant context in `answers`:
  - `assistant_intake`
  - `assistant_session_id`
  - `assistant_intake_version`
  - `source_query`
- task records now expose assistant intake and saved utility lookup state back to the frontend
- hospital appointment requests can fall back to assistant-derived recommendations instead of requiring fully manual restatement
- hospital panel now recommends specialty and window from the saved intake context
- utility panel now rehydrates saved account details and reflects the assistant’s provider understanding

Result:

- the AI no longer “forgets” what it already understood once a task is created
- service panels can become progressively smarter without inventing a second inference layer
- hospital and utility workflows now feel more continuous from routing into execution

## Iteration 14: Shared resolution plans for citizens and departments

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/resolution-plan.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/resolution-plan.test.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-engine.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-types.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/(public)/me/tasks/page.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/ops/service-tasks/inbox/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/ops/service-tasks/[id]/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/(dashboard)/service-ops/page.tsx`

Changes:

- added a derived `resolutionPlan` for every service task
- the plan normalizes:
  - who owns the next move
  - what is blocking progress
  - what the citizen should do next
  - what the department should do next
  - what the provider still needs to return
- citizen task pages now show a plain-language resolution path instead of only status chips and next action
- service-ops inbox and case detail views now expose the same resolution plan for staff

Result:

- service requests now read more like real case management and less like disconnected workflow fragments
- both sides can see a clearer path to resolution using the same underlying logic

## Iteration 15: Universal non-health execution base

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/form/universal-form.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/(public)/services/[category]/[slug]/apply/page.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/me/service-tasks/[id]/form-state/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-types.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/services/task-engine.ts`

Changes:

- universal `/apply` forms are now connected to active service tasks instead of living only as separate drafts
- form draft state is written back into `service_tasks.answers.service_form`
- completed forms now push task progress forward and record a case event
- added generic document scan-to-import support for universal forms using the existing OCR route
- scanned documents can now populate visible fields like:
  - citizenship number
  - passport number
  - driving license number
  - PAN
  - national ID
  - voter ID
- apply pages now pass the service slug explicitly so the form stays tied to the correct case

Result:

- non-health departments now share one stronger execution pattern:
  - autofill from identity profile
  - draft sync
  - scan-assisted input
  - task-backed completion
- transport, identity, tax, business, land, education, legal, labor, banking, and local-government services all benefit from the same base without waiting for custom UIs first

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

- payment gateway verification exists for eSewa and Khalti, and NEA-style payment tasks can now be auto-completed from verified callbacks
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
