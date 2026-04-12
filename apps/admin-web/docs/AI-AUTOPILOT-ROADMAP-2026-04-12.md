# AI Autopilot Roadmap

Date: 2026-04-12

## Goal

NepalRepublic should feel like this:

- the citizen says what they need in plain language
- AI understands the real intent, urgency, and target person
- AI reuses known profile data and existing documents
- AI asks only for the minimum missing information
- AI prepares the form, application, booking, payment, or complaint
- the citizen reviews once and approves
- the app submits, tracks, follows up, and escalates until resolution

The end state is not "better routing."

The end state is an AI case operator that can drive a request from first sentence to final status.

## Current Reality

The app already has a strong base:

- service catalog
- service routing
- service tasks
- workflow definitions
- vault docs
- household member targeting
- service ops queues
- partial payment, appointment, and counterparty integrations
- AI intake and guided follow-up

The main gap is orchestration intelligence.

Right now the system can often identify a service and start a task. It still needs a stronger layer to:

- triage severity
- infer the exact target path
- prefill aggressively from user memory
- gather only missing fields
- prepare submission payloads
- drive the workflow to completion

## North Star Behaviors

### 1. Health example

Citizen says:

- "my stomach hurts"
- "my wife is about to give birth"
- "my child has had a fever for 3 days"

AI should:

- detect this is a health-navigation flow, not a general service search
- assess severity and urgency
- decide whether this needs emergency, same-day doctor, specialist, or hospital booking
- factor in who the case is for: self, child, parent, spouse
- prefer nearest appropriate hospital
- book when direct booking is possible
- otherwise prepare the exact next action with one-tap approval

### 2. Passport or license example

Citizen says:

- "renew my passport"
- "my license expired"

AI should:

- identify the exact service variant
- load existing profile data and previous documents
- determine what is already known
- ask only for missing items
- prepare the application draft
- attach reusable documents
- direct the citizen to review and approve
- submit or hand off to the closest executable step
- track status and remind when action is needed

## What Must Be Built Next

## Phase 1: AI Triage and Intent Resolution

This phase upgrades the assistant from route matcher to decision engine.

### Scope

- health triage
- transport license triage
- passport and identity triage
- utility bill and account triage
- complaint vs service distinction
- target person inference: self, child, parent, spouse, household member

### Deliverables

- domain-specific triage policies
- urgency scoring
- severity scoring
- "safe to auto-route" scoring
- "must ask follow-up" scoring
- stronger target-person resolution

### Implementation shape

Add a triage layer before task creation:

- `lib/services/triage.ts`
- `lib/services/triage-policies/*.ts`

Expected outputs:

- `domain`
- `subdomain`
- `urgency`
- `severity`
- `targetMemberType`
- `safeNextAction`
- `requiresEmergencyHandling`
- `clarificationNeeded`

### Health-specific rules

The AI should not diagnose.

It should:

- detect emergency risk
- detect maternal urgency
- detect child-risk patterns
- detect same-day vs routine care
- choose nearest suitable provider set

Examples:

- "wife is in labor" => emergency maternity path, nearest hospital first
- "my child has fever and is weak" => urgent pediatric care path
- "stomach ache for two weeks" => non-emergency doctor booking path

## Phase 2: Profile Memory and Reusable Citizen State

This phase reduces repeated user effort.

### Scope

- structured citizen profile
- structured household profile
- document-to-profile extraction
- field confidence tracking
- reusable field groups by service

### Deliverables

- canonical profile schema for reusable service fields
- household member field inheritance rules
- per-field confidence and provenance
- "missing profile coverage" scoring

### Data additions

The system should store:

- full legal name
- aliases / romanized name
- DOB
- gender where relevant
- citizenship details
- passport details
- license details
- PAN / NID / voter ID
- permanent and current address
- district / ward / municipality
- contact details
- emergency contacts
- preferred hospitals / nearest facilities
- payment preference
- prior submission references

### UX principle

Every new workflow should start with:

- what we already know
- what we can reuse
- what is still missing

The user should never retype known information unless they want to correct it.

## Phase 3: Document Intelligence and Field Extraction

This phase makes the app truly operational instead of form-heavy.

### Scope

- OCR on uploaded documents
- classification of document type
- field extraction
- consistency checks across docs
- automatic linking to workflows

### Deliverables

- document classifier
- extraction schemas per document type
- confidence thresholds
- review UI for extracted values
- auto-linking from vault docs into service tasks

### Priority document types

- citizenship
- passport
- driver’s license
- PAN
- national ID
- birth certificate
- marriage certificate
- utility bills
- hospital tickets / slips

### Required behavior

When a user uploads a doc, the system should:

- identify the doc type
- extract structured fields
- propose profile updates
- suggest workflows it can unlock

## Phase 4: AI Form Drafting and Autofill Engine

This phase lets AI prepare actual applications instead of just managing steps.

### Scope

- form schemas per service
- autofill mapping
- per-field provenance
- draft generation
- user review and approval

### Deliverables

- `lib/services/form-drafter.ts`
- service-specific field maps
- per-field status:
  - known
  - inferred
  - extracted-from-doc
  - user-confirmed
  - missing
- review-ready draft objects

### Principle

The AI should produce a complete draft whenever possible.

The citizen should only fill:

- missing fields
- uncertain fields
- fields requiring explicit declaration

## Phase 5: Execution Adapters

This phase is what turns the app into an operator.

### Adapter families

- health
- passport / identity
- transport / license
- utilities
- tax
- education
- benefits
- grievances / complaints

### Each adapter should support

- intake normalization
- profile-to-form mapping
- document requirement resolution
- booking or submission payload generation
- reference capture
- response parsing
- follow-up steps

### Output modes

- guidance-only
- assisted execution
- direct execution

Every service must be tagged with one of these modes and upgraded over time.

## Phase 6: Review, Approval, and Safe Submission

This phase creates the trust layer.

### Required user experience

Before submission, the user sees:

- what the AI prepared
- which values came from profile
- which values came from uploaded docs
- which values were inferred
- what the app is about to submit

Then the user can:

- approve
- edit
- ask AI to revise

### Hard rules

No submission without explicit approval for:

- legal declarations
- payment actions
- sensitive personal data
- external government filings

## Phase 7: Post-Submission Case Operations

This phase ensures the app does not stop after "submitted."

### Deliverables

- submission references
- SLA timers
- reminder engine
- escalation engine
- department/provider follow-up states
- citizen-facing timeline

### Every task should track

- draft ready
- submitted
- acknowledged
- under review
- action requested
- approved
- rejected
- delivered / completed

## Phase 8: Learning Loop

This phase makes the AI better over time.

### Feedback signals

- user corrected route
- user edited AI draft
- submission failed
- department rejected field/doc
- user marked answer as wrong
- human ops reassigned case

### System outputs

- better routing prompts
- better triage policies
- better candidate ranking
- better field extraction rules
- better service-specific adapters

## Domain-by-Domain Rollout Order

This should be sequenced by leverage, not by completeness fantasy.

### Wave 1

- health navigation and appointment preparation
- passport renewal / new passport
- driver’s license renewal / new / trial
- NEA and KUKL bill flows

Why:

- high user demand
- clear pain
- strong visibility
- immediate proof of "AI does work for me"

### Wave 2

- citizenship
- PAN
- national ID
- ward recommendation
- local infrastructure complaints

### Wave 3

- education workflows
- tax and business registration support
- social protection and benefits
- land / property support

## Concrete Backend Changes Needed

## New core modules

- `lib/services/triage.ts`
- `lib/services/triage-policies/health.ts`
- `lib/services/triage-policies/passport.ts`
- `lib/services/triage-policies/license.ts`
- `lib/services/triage-policies/utilities.ts`
- `lib/services/form-drafter.ts`
- `lib/services/profile-memory.ts`
- `lib/services/document-intelligence.ts`
- `lib/services/execution-adapters/*`
- `lib/services/submission-review.ts`

## API surfaces to add

- `POST /api/services/triage`
- `POST /api/me/profile/extract-from-doc`
- `POST /api/me/service-tasks/:id/draft`
- `POST /api/me/service-tasks/:id/review`
- `POST /api/me/service-tasks/:id/submit`
- `POST /api/me/service-tasks/:id/escalate`
- `GET /api/me/service-tasks/:id/submission-status`

## Schema additions likely needed

- `service_task_drafts`
- `service_task_submission_attempts`
- `service_task_required_fields`
- `service_task_field_values`
- `service_task_missing_items`
- `profile_field_provenance`
- `document_extractions`
- `service_task_triage`

## Intelligence Standards

The AI should only ask a question if it changes the execution path.

Bad question:

- "Which hospital do you want?" when the app can infer nearest valid hospital set and ask only if needed

Good question:

- "Is this emergency labor, same-day checkup, or routine ANC?" because that changes urgency and target path

Bad question:

- "What is your full name?" when the account already has it

Good question:

- "Your passport expired in 2024. Should I use the same permanent address as your last application?" because that affects the filing

## Safety Boundaries

### Health

- no diagnosis
- no home-treatment advice for concerning symptoms
- emergency escalation rules
- pregnancy and child risk escalation rules

### Legal / identity / passport

- no silent declaration submission
- no hidden edits to legal identity fields
- explicit approval before submit

### Payments

- explicit approval before charge
- payment method must be intentionally selected or pre-authorized
- receipt capture after payment

## Success Metrics

We should measure this with operational metrics, not vibes.

### AI quality

- direct-route accuracy
- false-clarification rate
- wrong-route rate
- user correction rate

### Autopilot quality

- percent of fields auto-filled
- percent of workflows reaching review-ready draft
- percent of tasks submitted without manual ops rewrite
- time from first query to review-ready draft
- time from first query to submission

### Citizen friction

- average number of questions asked before draft ready
- average number of fields typed manually
- repeat-user autofill coverage

## Recommended Immediate Build Sequence

This is the sequence I would execute now.

### Step 1

Build `Phase 1` triage engine and make it authoritative for:

- health
- passport
- license
- utility bills

### Step 2

Build `Phase 2` profile-memory coverage and expose reusable field maps per service.

### Step 3

Build `Phase 3` document extraction for citizenship, passport, license, and utility bills.

### Step 4

Build `Phase 4` draft engine for:

- passport renewal
- license renewal
- hospital appointment request

### Step 5

Ship `Phase 6` review-and-approve screen before expanding submission automation.

## What "Done" Looks Like

For a mature service, the experience should be:

1. user says what they need
2. AI identifies exact path
3. AI loads known person and documents
4. AI asks only for missing execution-critical items
5. AI drafts the full request
6. user reviews once
7. AI submits or hands off at the deepest currently supported step
8. app tracks and escalates until resolution

That is the standard we should build toward for every major Nepal service family.
