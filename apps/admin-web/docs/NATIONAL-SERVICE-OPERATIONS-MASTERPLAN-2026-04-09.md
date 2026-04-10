# National Service Operations Masterplan

Date: 2026-04-09

## North Star

NepalRepublic should make it possible for a citizen to say what they need in plain language, have the app route it correctly, and then have the responsible office, provider, or department work the case to resolution with clear updates.

The system must support both sides:

- citizen intake
- department/provider resolution

If either side is weak, the experience breaks.

## Full Operating Model

Every service should pass through the same backbone:

1. intake
2. routing
3. case creation
4. document collection
5. ownership assignment
6. review
7. request-for-info loop
8. approval / rejection / resolution
9. public updates
10. audit trail

This is the reusable core.

The per-department logic should plug into that core instead of replacing it.

## Department / Provider Coverage Map

This is the high-level map we should plan around so no major service family gets missed.

### 1. Identity and civil status

Examples:

- citizenship
- passport
- birth registration
- death registration
- marriage registration
- migration / address change
- national ID

Primary operating needs:

- document-heavy workflows
- district / local office routing
- approval chains
- appointment or biometric visit coordination

### 2. Transport and mobility

Examples:

- driving license
- vehicle registration
- bluebook / renewal
- road tax
- route permits
- traffic fine handling

Primary operating needs:

- payments
- booking
- office visit milestones
- status sync

### 3. Utilities and household services

Examples:

- electricity bills
- water bills
- internet service issues
- garbage / sanitation requests
- streetlight complaints

Primary operating needs:

- account lookup
- bill/payment verification
- provider escalation
- service-ticket follow-up

### 4. Health and care access

Examples:

- hospital appointments
- OPD tickets
- specialist referrals
- maternal care
- child health
- emergency guidance

Primary operating needs:

- triage questions
- urgency handling
- provider-specific booking adapters
- family / delegate support

### 5. Education

Examples:

- school admissions
- exam registration
- scholarship applications
- certificate verification
- transfer certificates

Primary operating needs:

- institution-specific document requirements
- time-bound deadlines
- approval and verification loops

### 6. Tax, finance, and payments

Examples:

- PAN registration
- tax payments
- bank onboarding support
- insurance workflows
- remittance-linked identity tasks

Primary operating needs:

- secure sensitive-data handling
- payment confirmation
- strong audit logging

### 7. Local government and municipality

Examples:

- ward recommendations
- local permits
- business registration support
- local taxes and fees
- local issue escalation

Primary operating needs:

- location-aware routing
- municipality-specific desks
- hybrid digital + counter workflows

### 8. Property, land, and housing

Examples:

- land records
- ownership transfer
- house map approval
- property tax
- tenancy registration support

Primary operating needs:

- long-running cases
- many document dependencies
- multiple authority hops

### 9. Social protection and benefits

Examples:

- social security allowance
- disability support
- senior citizen support
- single-woman / vulnerable-family support

Primary operating needs:

- family/delegate workflows
- eligibility checks
- document validation

### 10. Labor, migration, and work

Examples:

- labor permit support
- foreign employment documentation
- worker complaints
- migration-related approvals

Primary operating needs:

- status tracking
- complex approval chains
- escalation paths

### 11. Justice, complaints, and enforcement

Examples:

- public complaints
- corruption-related submissions
- police or administrative follow-up
- public grievance routing

Primary operating needs:

- evidence
- public/private visibility
- escalation
- auditability

### 12. Business and compliance

Examples:

- company registration
- renewals
- licenses
- permits
- tax filings

Primary operating needs:

- entity-aware workflows
- document bundles
- approval checkpoints

## Process Types That Must Exist

These are the process shapes we need to support across all departments.

### A. Guidance-only

For services where NepalRepublic explains the path but does not yet execute it.

### B. Assisted execution

For services where the app:

- structures the workflow
- keeps the case
- captures receipts/references
- guides the user through external steps

### C. Direct execution

For services where NepalRepublic can:

- fetch data from provider
- create booking / payment / request
- receive confirmation back
- update the case automatically

### D. Hybrid escalation

For services where the path starts digital but ends in a human office or provider desk.

## Internal Roles Needed

Every department-side rollout should support:

- intake reviewer
- case worker
- manager
- approver
- escalation owner
- viewer / audit-only role

Not every department needs every role on day one, but the model should support them.

## Case States Needed

Citizen-facing service status already exists.

Department-facing queue state should now support:

- new
- assigned
- in_review
- waiting_on_citizen
- waiting_on_provider
- approved
- rejected
- escalated
- resolved
- closed

This lets the system distinguish:

- what the citizen is doing
- what the department is doing

## Messaging Modes Needed

Every case should support:

- public status update
- request for more information
- internal note
- decision record
- system event

This is essential for trust and auditability.

## Decision Types Needed

The department-side engine should support:

- accept
- assign
- transfer
- request info
- approve
- reject
- escalate
- resolve
- close

These should be reusable across service families.

## Minimum Data Every Department Case Needs

- who the citizen is
- who the case is for
- service slug
- department key
- current queue state
- assigned worker
- due dates
- latest public update
- documents
- integrations / references / receipts
- full action log

## What “easy to solve any issue” requires

The magic is not only smarter intake.

It also requires:

- the right office owns the case
- the case has a queue
- someone can respond
- someone can ask for missing info
- someone can approve or reject
- escalation happens when stuck
- the citizen can see progress

That is what turns the app from a smart front door into a real national service layer.

## Build Order Recommendation

### Phase 1: generic service operations

Already started in this pass:

- service department registry
- department memberships
- queue state on service tasks
- assignment table
- messages
- decisions
- inbox API
- action API

### Phase 2: department surfaces

Build:

- department inbox UI
- case detail UI
- public/internal thread
- assign / approve / reject controls

### Phase 3: department policy configuration

Build:

- SLA tuning
- required approval role
- queue defaults
- transfer permissions

### Phase 4: provider adapters

Build:

- direct integrations for utilities, hospitals, transport, identity services

### Phase 5: analytics and management

Build:

- queue health
- backlog by department
- SLA breaches
- citizen satisfaction
- stuck-case reporting

## What should be added first

The first departments/providers to operationalize fully:

1. electricity
2. health
3. transport
4. district administration
5. passport
6. tax

This covers:

- bills
- appointments
- licenses
- identity
- documents
- payments

That is enough to make the app feel genuinely powerful.

## Final Principle

Do not build one-off service hacks.

Build:

- a generic case engine
- a generic department operating layer
- per-service adapters and policies on top

That is how NepalRepublic becomes easy to extend and capable of handling almost any issue over time.
