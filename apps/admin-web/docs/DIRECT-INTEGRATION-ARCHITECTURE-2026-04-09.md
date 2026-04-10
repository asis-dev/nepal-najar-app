# NepalRepublic Direct Integration Architecture

Date: 2026-04-09

## Goal

Move NepalRepublic from:

- linked guidance
- assisted workflows
- user-confirmed progress

to:

- provider-backed execution
- provider-confirmed task state
- as much computer-handled completion as Nepal systems will realistically allow

The product target is simple:

- user describes the problem once
- NepalRepublic routes it correctly
- NepalRepublic executes as much as possible digitally
- only the unavoidable offline steps remain for the user

## Current Reality

The repo is further along than a pure prototype:

- service routing exists
- service task state exists
- household/delegation exists
- department/office routing exists
- activity logging exists
- eSewa initiation + callback handling exists
- Khalti initiation + verification exists

But the platform is not direct yet because those external payment and service surfaces are not normalized into one execution layer and are not fully tied back into service-task completion.

## What "Direct" Means

A service should count as direct only when NepalRepublic can do all or most of these:

1. Read provider data
- fetch account, status, balance, slots, or application state

2. Write provider actions
- book, submit, initiate payment, or update a provider record

3. Confirm outcome from the provider
- webhook, callback, receipt number, booking code, or lookup confirmation

4. Reflect provider truth back into the user task
- mark task step complete
- store receipt/reference
- show current status without asking the user to manually explain what happened

5. Recover safely on failure
- log the attempt
- preserve the task
- retry or fall back cleanly

## Integration Ladder

Every service should move through the same maturity ladder:

1. Linked
- NepalRepublic tells the user where to go

2. Assisted
- NepalRepublic guides, tracks, reminds, and records progress

3. Semi-direct
- NepalRepublic prefills or initiates the provider flow
- callback or reference capture exists
- some provider truth comes back into the app

4. Direct
- NepalRepublic owns most of the digital transaction
- provider state is reflected back automatically

## Existing Integration Truth

### NEA Electricity Bill

Current state:

- task routing exists
- task tracking exists
- payment initiation exists for eSewa and Khalti
- provider callback verification exists for eSewa and Khalti
- verified payment callbacks now update the related service task and receipt trail automatically

Still missing:

- NEA customer lookup
- outstanding amount fetch
- support for additional payment channels through a unified adapter

Direct gap:

- provider verification is now bridged into the service-task layer, but NepalRepublic still cannot fetch the bill directly from NEA before payment

### Driver's License Renewal

Current state:

- task workflow exists
- routing to DoTM exists
- milestones for appointment, payment, and office visit exist

Still missing:

- appointment slot fetch
- booking creation
- status lookup
- card-ready / pickup / delivery state
- confirmed payment linkage to the renewal task

Direct gap:

- the workflow exists, but NepalRepublic is not yet acting as the system of execution

### Hospital Appointments

Current state:

- hospital intent routing is strong
- hospital service choices are surfaced correctly
- task and routing scaffolding exist

Still missing:

- normalized slot model
- provider-specific booking adapter
- booking confirmation
- reschedule/cancel support
- provider status sync

Direct gap:

- no reusable appointment execution layer yet

## Architecture We Need

### 1. Provider Adapter Layer

Create a single place for external service integrations.

Suggested shape:

- `lib/integrations/types.ts`
- `lib/integrations/registry.ts`
- `lib/integrations/payments/`
- `lib/integrations/hospitals/`
- `lib/integrations/dotm/`

Each adapter should expose capabilities like:

- `lookup()`
- `initiate()`
- `verify()`
- `syncStatus()`
- `normalizeResult()`

This prevents routes from hardcoding provider logic everywhere.

### 2. Execution Attempt Ledger

Service tasks need a child ledger of external attempts.

Suggested table:

- `service_task_integrations`

Suggested fields:

- `id`
- `service_task_id`
- `provider_key`
- `operation`
- `status` (`pending`, `redirected`, `verified`, `failed`)
- `request_payload`
- `response_payload`
- `provider_reference`
- `receipt_number`
- `error_code`
- `error_message`
- `started_at`
- `completed_at`

Why this matters:

- every outbound action becomes auditable
- we can retry safely
- we can debug failures without losing user trust

### 3. Provider Event Ingestion Layer

Callbacks should not stop at the `payments` table.

Add a common event-ingestion path that:

1. verifies the provider callback
2. stores the raw provider event
3. resolves the related service task
4. updates task state and action state
5. inserts user activity + service-task event

Suggested path:

- `lib/integrations/event-ingestion.ts`

Suggested table:

- `provider_events`

Fields:

- `provider_key`
- `event_type`
- `provider_reference`
- `transaction_id`
- `raw_payload`
- `verified`
- `processed_at`
- `service_task_id`

### 4. Service Task -> Integration Bridge

Right now a payment can be verified without automatically completing the right task step.

We need a bridge that maps provider outcomes onto task actions.

Examples:

- NEA payment verified
  - mark `pay_bill` action complete
  - store receipt reference
  - advance task to `completed` if nothing else remains

- hospital booking confirmed
  - mark `book_appointment` complete
  - store booking code and appointment time
  - set task state to `booked`

- DoTM payment verified
  - mark payment action complete
  - keep task in `in_progress` until office visit and result are confirmed

### 5. Normalized Provider Status Model

We should not let each provider invent its own task state.

Suggested normalized statuses:

- `draft`
- `initiated`
- `redirected`
- `submitted`
- `verified`
- `failed`
- `cancelled`
- `needs_user_action`

These map to task state, but stay provider-oriented.

### 6. Consent and Delegation Layer

For a real everything app, NepalRepublic must sometimes act on behalf of:

- parents
- spouse
- children
- relatives abroad

That means direct integrations need to understand:

- who the target person is
- whether the acting user has authority
- which identity or document set to use

The household layer already exists. Direct integrations should use `target_member_id` consistently.

### 7. Fallback Operations Layer

Some providers will never be clean enough for fully direct integration.

So each integration should define fallback mode:

- `direct`
- `semi_direct`
- `manual_assist`

That lets the app stay honest.

## Suggested Build Order

### Phase 1: NEA payment completion loop

This is the best first direct-integration target because the repo already has payment plumbing.

Build:

1. create provider adapter abstraction
2. connect eSewa/Khalti verify routes to service-task actions
3. store receipt reference on task integration record
4. add payment status panel to `My Tasks`
5. optionally add NEA customer lookup when a reliable surface exists

Success condition:

- user starts NEA bill task
- user pays through NepalRepublic
- callback verifies payment
- task updates automatically without manual confirmation

### Phase 2: Hospital appointment adapter

Build:

1. normalized appointment slot model
2. adapter interface for hospitals
3. first provider implementation for one hospital
4. booking confirmation storage
5. reschedule/cancel primitives

Success condition:

- user requests appointment
- NepalRepublic shows bookable options
- booking result is captured on the task

### Phase 3: DoTM integration bridge

Build:

1. appointment status capture
2. payment reference linkage
3. office-visit completion workflow
4. delivery / pickup / result sync if available

Success condition:

- license renewal becomes a genuine operator flow rather than a tracked checklist

## First Technical Tasks

1. Add `service_task_integrations` migration
2. Add `provider_events` migration
3. Add provider adapter registry
4. Add shared payment event ingestion helper
5. Patch eSewa and Khalti verify routes to update service tasks
6. Add task UI for provider references and receipt state

## What Not To Pretend

NepalRepublic should not claim a service is direct unless:

- provider confirmation is real
- task state updates automatically
- receipt/reference is stored
- failure handling is in place

Anything less is still useful, but it is assisted or semi-direct, not direct.

## Product Outcome

If we build this layer well, NepalRepublic stops being:

- a smart government directory

and becomes:

- a trusted execution layer for life admin in Nepal

That is the path to handling as much as possible from a phone or computer and keeping offline effort only for the parts the system truly cannot avoid.
