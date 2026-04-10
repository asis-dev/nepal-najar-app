# NepalRepublic Government-Side Rollout

Date: 2026-04-10

## Goal

Build the second half of the platform:

- citizen creates a structured case
- NepalRepublic routes it to the right authority or institution
- the authority can respond inside NepalRepublic or through a mapped external channel
- the citizen sees a consistent status trail until resolution

## What Was Added

Implemented in:

- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/supabase/060-service-counterparties.sql`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/supabase/061-service-task-ai-ops.sql`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/service-ops/counterparties.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/service-ops/counterparty-routing.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/service-ops/ai.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/service-ops/route-health.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/lib/service-ops/ai-worker.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/ops/counterparties/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/ops/counterparties/[id]/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/ops/counterparties/[id]/channels/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/ops/counterparties/[id]/routes/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/ops/ai/playbooks/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/ops/ai/worker/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/api/ops/service-tasks/[id]/ai/route.ts`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/(dashboard)/service-ops/counterparties/page.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/(dashboard)/service-ops/ai/page.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/(dashboard)/service-ops/page.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/counterparty-status-card.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/components/public/services/integration-status-card.tsx`
- `/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/app/(public)/services/[category]/[slug]/page.tsx`

## New Model

The ops side now has a dedicated counterparty layer:

- `service_counterparties`
  One row per external body or desk we need to work with.
  Examples:
  - Department of Passports
  - District Administration Office cluster
  - Hospital partner desk
  - NEA operations
  - a specific school or ward office later

- `service_counterparty_channels`
  The real surfaces they use:
  - API
  - portal
  - inbox
  - email
  - phone
  - physical office
  - webhook

- `service_counterparty_routes`
  The per-service execution map that answers:
  - who owns this service next
  - how NepalRepublic sends the request
  - how NepalRepublic expects the response back
  - whether human review is required
  - whether payment confirmation, status sync, and document exchange are supported

## Why This Matters

This avoids treating “government integration” as one vague bucket.

Each service can now express a different operating truth:

- passport:
  portal-assisted, strict review, external authority remains official
- ward or DAO:
  NepalRepublic inbox can become the main clarification and response layer
- utility:
  human bridge first, direct sync later
- school or hospital:
  institution-specific queue and response model

It also means the same service can now be represented consistently in three places:

- on the public service page for the citizen
- on the service case inside ops
- inside the counterparty configuration layer for staff

That closes an important product gap between architecture and day-to-day usage.

## What Is Now Live In Product

- counterparties can be created from the ops dashboard
- channels can be attached to each counterparty
- service routes can be attached to each counterparty
- service detail pages now show:
  - mapped government/provider path
  - current integration mode
  - high-level execution reality
- service ops task detail now shows:
  - mapped counterparty route
  - AI run history
- service ops task detail now also shows partner replies from mapped institutions
- AI playbooks now exist as an auditable ops-side layer
- staff can queue AI runs against a case from the service ops task view
- staff can process queued AI runs from the service ops AI page
- counterparty detail now shows:
  - route health and SLA pressure
  - follow-up due counts
  - reply-token health
  - recent partner replies

## What Still Needs Improvement

The model is now real and the core operational loop is in product:

- channels and routes can be added, edited, and retired from the ops UI
- counterparty routes now carry route-specific SLA and escalation rules
- queued AI runs now have an execution path that writes internal outputs back into the case
- lightweight partner reply links exist for agencies that will not use the main dashboard
- routing visibility now includes route health, breached work, and follow-up pressure

What still remains after this pass:

- the AI worker currently produces safe internal outputs and draft next steps, but not autonomous external actions
- route analytics are operational, but still not a full long-term performance reporting layer
- institution-by-institution onboarding still needs rollout sequencing and live partner adoption work

## Operating Strategy by Counterparty Type

- strict national agencies:
  Start with portal-assisted routing and response capture.

- local government and district offices:
  Push toward NepalRepublic inbox adoption first.

- public institutions like hospitals:
  Use shared queueing plus institution-specific process notes.

- private institutions like schools and banks:
  Add partner portal and partner-owned routing rules over time.

- providers with partial digital surfaces:
  Use human bridge plus receipt and reference capture until API coverage improves.

## Next Build Steps

1. Add scheduled invocation for `/api/ops/ai/worker` using a protected worker secret so queued runs clear automatically in production.
2. Expand route analytics from live health to trend reporting:
   - rolling response time
   - approval / rejection rates
   - follow-up burden by counterparty
   - per-institution throughput
3. Let partner replies attach uploaded files or reference documents directly.
4. Add institution-specific onboarding workflows:
   - district administration
   - one municipality / ward
   - one hospital desk
   - one school or university admission office
5. Promote safe AI outputs into guided operator actions where the department explicitly allows it.
