# NepalRepublic Real-World Test Plan

Date: 2026-04-12

## Purpose

Validate the full NepalRepublic app the way real people and partner teams will use it:

- public discovery and trust surfaces
- AI-first service intake and routing
- citizen auth and profile flows
- document upload, extraction, and reuse
- draft, review, submit, and tracking workflows
- payments, notifications, and government-side task handling
- production operations, cron, and release readiness

This plan is intended for real-world testing, not just unit or API correctness. A feature is only considered healthy if the user can complete the intended outcome with low friction and without getting misrouted.

## Test Goals

1. Confirm the app understands user intent correctly across vague, natural, and high-stakes inputs.
2. Confirm service tasks move from intake to review-ready state without losing user context.
3. Confirm users only need to fill missing information, not re-enter data the app already has.
4. Confirm review, submission, tracking, and escalation flows behave consistently.
5. Confirm public accountability, news, and government-tracking surfaces still work while services expand.
6. Confirm production is safe to promote and stable under real usage.

## Scope

In scope:

- landing, about, onboarding, login, signup, me, services, report-card, search, daily brief, explore, leaderboard, corruption, ministers, government
- AI advisor and service routing
- service task creation and lifecycle
- vault upload, scan, extraction, and reminders
- profile memory and payment profile
- review, submit, messages, appointment, integrations, send-to-govt, feedback, status, events
- ops inbox, department routing, member assignment, action completion
- payments and callbacks
- OG/share surfaces for public links
- release checks and production monitoring

Out of scope for signoff as "fully direct":

- any external provider action that is still assisted-only rather than true direct submission
- biometric or in-person legal requirements outside app control

## Environments

Primary:

- Production: [www.nepalrepublic.org](https://www.nepalrepublic.org)

Secondary:

- Local dev: `http://localhost:3000`

## Preconditions

Before running the full plan, confirm:

- production env vars are present per [PRODUCTION-OPERATIONS-CHECKLIST-2026-04-10.md](/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/docs/PRODUCTION-OPERATIONS-CHECKLIST-2026-04-10.md)
- authenticated test user exists and can log in
- test vault documents are available
- payment sandbox or test-safe path is available
- at least one live AI model path is configured for routing in the target environment

Recommended test fixtures:

- one fresh citizen account
- one returning citizen account with profile and vault data
- one ops/admin account
- one department/member test account if government-side routing is enabled
- sample docs:
  - citizenship card
  - passport
  - driver's license
  - utility bill
  - hospital slip or appointment proof

## Test Layers

### 1. Release Gate

Run these first on the target build:

1. `node scripts/launch-preflight.js`
2. `npx tsc -p tsconfig.json --noEmit`
3. `npm run build`
4. `npx tsx scripts/test-real-world.ts`
5. `npm run release:check`

Pass criteria:

- all commands succeed
- no unexpected route regressions
- no auth regressions
- no broken pages in major public paths

### 2. Automated Real-World Smoke

Baseline automated coverage already exists in [test-real-world.ts](/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/scripts/test-real-world.ts).

Minimum expected coverage:

- major public pages load
- major service category and service detail pages load
- public APIs respond successfully
- authenticated citizen flows work
- service task APIs respond correctly

Pass criteria:

- production suite passes cleanly
- no skipped auth tests in final release signoff

### 3. Manual Real-World Journeys

These are mandatory because the hardest problems here are routing quality, UX friction, and end-to-end state handling.

## Severity Levels

- `Blocker`: user cannot complete the flow or is misrouted in a high-stakes flow
- `High`: major friction, wrong recommendation, broken review/submit/tracking
- `Medium`: confusing UX, missing autofill, avoidable extra questions
- `Low`: copy, styling, analytics, minor polish

## Execution Rules

- test each scenario on desktop and mobile viewport
- test in English and Nepali where supported
- use both typed and voice-style natural input where possible
- record screenshots, exact input text, expected result, actual result, and task ID
- for AI routing tests, capture whether the app:
  - routed directly
  - asked one justified question
  - asked a weak or unnecessary question
  - routed incorrectly

## Core Test Matrix

### A. Public Trust and Discovery

Test:

1. Home page first impression
2. About page messaging and stats
3. Services landing clarity
4. Report card and accountability surfaces
5. Search and corruption tracking
6. Shared links and OG cards in chat apps

Verify:

- current branding and hero copy appear
- no stale OG/share preview
- pages load quickly and without layout breakage
- trust and service value proposition are both visible

### B. Auth and Onboarding

Test:

1. signup
2. login
3. onboarding checklist
4. onboarding extraction
5. return user resume flow

Verify:

- sign-in is fast enough to feel reliable
- no dead-end after login
- onboarding captures only necessary info
- extracted fields are reasonable
- returning users are not forced through irrelevant prompts

### C. AI Intake and Routing

Use natural-language prompts, not just clean intent labels.

Required prompts:

1. `I am not feeling well`
2. `My stomach hurts`
3. `My wife is having labor pain`
4. `I need to renew my passport`
5. `I need to renew my driver's license`
6. `I need to pay my electricity bill`
7. `I want to open a bank account`
8. `My water bill is wrong`
9. `I need SEE results`
10. `How do I register a birth`
11. `I want to file a consumer complaint`
12. `My land record is missing`

Verify:

- correct domain and likely service are selected
- severe health scenarios are escalated appropriately
- low-risk scenarios do not trigger emergency handling
- the system routes directly when intent is clear
- clarifying questions are minimal and useful
- no fallback to obviously wrong deterministic routes

Pass criteria:

- at least 90 percent of clear prompts route correctly without unnecessary questioning
- 100 percent of emergency-style prompts avoid obviously unsafe routing

### D. Health Triage and Care Navigation

Test:

1. mild symptom intake
2. moderate symptom requiring appointment
3. emergency symptom requiring urgent escalation
4. pregnancy/labor urgency
5. nearest hospital or appointment recommendation flow

Verify:

- severity handling differs meaningfully by input
- the app does not treat all health prompts the same
- the app avoids irrelevant services like passport or license routing
- hospital appointment requests create the right downstream task

### E. Profile Memory and Autofill

Test with a returning user who already has data and docs.

Scenarios:

1. passport renewal
2. driver's license renewal
3. utility bill lookup
4. profile edit and re-run

Verify:

- known fields prefill automatically
- only missing deltas are requested
- profile changes propagate into later flows
- old incorrect values do not override newer verified ones

### F. Vault, Scan, and Document Extraction

Test:

1. upload citizenship card
2. upload passport
3. upload driver's license
4. upload utility bill
5. run extract-from-doc

Verify:

- upload succeeds
- extracted fields are mapped sensibly
- document appears in vault list
- extracted values can be reused in draft flows
- invalid or blurry docs fail gracefully

### G. Draft, Review, and Submit

For each Wave 1 flow:

- passport
- driver's license
- health/hospital appointment
- utilities

Test:

1. create task from natural input
2. generate draft
3. load review package
4. approve or edit
5. submit
6. inspect status and events

Verify:

- draft uses profile and document data where available
- review reflects actual attached docs
- missing docs are explicitly identified
- submit creates a persistent result
- status and event history are visible afterward

### H. Payments

Test:

1. initiate payment
2. callback success path
3. callback failure path
4. retry behavior

Verify:

- payment profile can be stored and reused safely
- success and failure states are clearly shown
- task and event history reflect payment outcome
- callbacks do not leave the task in a broken partial state

### I. Messaging, Integrations, and Government Handoff

Test:

1. send-to-govt
2. task messages
3. integrations listing
4. escalation
5. department assignment on ops side

Verify:

- the right target department or counterparty is selected
- internal task state updates after handoff
- messages and escalation history are preserved
- no route sends the user to the wrong department family

### J. Ops and Department-Side Workflow

Using admin/ops accounts, test:

1. ops inbox
2. department queue
3. member assignment
4. AI assistance on ops task
5. action completion
6. stats endpoints

Verify:

- a task created on the citizen side can be seen and acted on by the ops side
- assignment and completion are traceable
- no department queue silently drops tasks

### K. Accountability and Intelligence Surfaces

Test:

1. daily brief
2. ministers
3. explore tracker
4. what changed
5. leaderboard
6. corruption pages

Verify:

- pages load with current data
- links work
- no production errors after service-platform changes

### L. Sharing and OG Cards

Test:

1. share home page
2. share service page
3. share report card
4. share corruption page
5. share inbox or story item where applicable

Verify:

- the preview image is current
- title/subtitle are correct
- no stale old-version preview appears

### M. Voice and Interactive Input

Test:

1. voice search UI loads
2. typed input and voice-style input produce similar routing
3. long messy input still reaches the correct service family

Verify:

- voice UI does not degrade routing accuracy
- interactive input feels like guided assistance, not just a search box

## Required Scenario Pack

These are the exact end-to-end scenarios that must pass before broad rollout.

1. `Hospital guidance`
Input: `I am not feeling well`
Expected:
- asks a smart follow-up only if needed
- stays in health domain
- offers hospital or appointment path, not unrelated services

2. `Emergency maternity`
Input: `My wife is having labor pain`
Expected:
- high urgency handling
- nearest hospital/emergency guidance
- no low-urgency generic flow

3. `Passport renewal`
Input: `Renew my passport`
Expected:
- uses stored identity data where possible
- surfaces missing documents
- produces draft and review package

4. `Driver's license renewal`
Input: `Renew my driver's license`
Expected:
- transport route only
- pulls known data
- guides appointment/payment/review correctly

5. `Electricity bill`
Input: `Pay my electricity bill`
Expected:
- utility route only
- bill lookup or payment path is correct
- no backend schema errors

6. `Document-led autofill`
Input:
- upload citizenship or passport
- then start a related service
Expected:
- extracted fields are reused
- user is not asked to retype the same information

7. `Citizen to ops handoff`
Flow:
- create service task
- review and submit
- confirm task appears in ops side
- assign and update status
Expected:
- traceable lifecycle end to end

## Non-Functional Checks

### Performance

Measure:

- login time
- initial page load
- service task creation latency
- draft generation latency
- review load latency

Targets:

- login should not feel stalled
- common public pages should render promptly on mobile data
- AI routing should feel responsive enough to sustain trust

### Reliability

Check:

- repeated refreshes do not lose task state
- failed payment or failed extraction does not corrupt the task
- retrying a draft or review does not duplicate records incorrectly

### Safety

Check:

- health guidance does not make unsafe leaps
- sensitive actions require explicit approval
- auth-protected routes reject unauthorized access
- ops/admin protections remain intact

## Defect Logging Template

For every failure, log:

- date/time
- environment
- tester
- account used
- exact input
- route or URL
- task ID if created
- expected result
- actual result
- severity
- screenshot or response payload
- likely area:
  - routing
  - triage
  - profile memory
  - vault
  - review
  - submit
  - payments
  - ops
  - public page

## Exit Criteria

The app is ready for broader user traffic when all of the following are true:

1. `Release gate passes`
- `npm run release:check` passes

2. `Real-world smoke passes`
- [test-real-world.ts](/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/scripts/test-real-world.ts) passes cleanly in the target environment

3. `Scenario pack passes`
- all seven required scenario flows pass without blocker issues

4. `AI quality threshold is met`
- no obvious misroutes on high-stakes prompts
- emergency-style health prompts are handled safely
- clear intents auto-route with minimal questioning

5. `Operational continuity is confirmed`
- citizen-side task can move into ops-side handling
- tracking and event history remain visible

6. `Sharing and trust surfaces are current`
- no stale share cards
- public narrative still reflects current product

## Known Risk Areas To Watch Closely

Based on current implementation direction, pay extra attention to:

- AI routing falling back to weak deterministic choices
- health triage severity quality
- profile-memory and document-extraction reuse accuracy
- review using placeholder instead of real attachment state
- submit flows that appear direct but are still only assisted
- schema drift between code and production database

## Suggested Test Cadence

Before every production release:

- run release gate
- run automated real-world smoke
- manually run the seven required scenarios

Twice weekly:

- run a wider manual regression across services, accountability, and ops

After any routing or triage change:

- rerun all AI intake scenarios
- rerun all health scenarios

After any payments, review, or submit change:

- rerun the full draft-review-submit matrix

## Ownership

- Engineering: release gate, automated smoke, backend integrity
- Product/QA: scenario pack, AI quality, UX friction review
- Ops/Admin: department-side handling and assignment validation

## Final Signoff Format

For each release candidate, record:

- commit SHA
- environment tested
- release gate result
- smoke suite result
- scenario pack result
- blocker count
- high severity count
- go / no-go decision
- signoff owner

