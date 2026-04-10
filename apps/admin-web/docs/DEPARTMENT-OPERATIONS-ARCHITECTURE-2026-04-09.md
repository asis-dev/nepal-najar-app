# Department Operations Architecture

Date: 2026-04-09

## Goal

NepalRepublic already supports the citizen side of the flow:

- create a case
- gather documents
- track progress
- route the case to the right office or role
- keep a history of what happened

The next system is the department side:

- receive the routed case
- review it
- respond to the citizen
- request clarification
- approve, reject, or escalate
- keep a complete audit trail

This should be built so new departments can be added with configuration and workflow definitions, not one-off product rewrites.

## Product Principle

Citizen side and department side should use the same core case object.

The citizen sees:

- what they submitted
- where it went
- what is waiting
- what they need to do next

The department sees:

- what arrived
- who owns it
- what evidence and documents are attached
- what action is required
- what service rules apply

## Current Foundation

The existing `service_tasks` system already gives us:

- routed case records
- workflow status and progress
- milestones and action state
- household targeting
- integrations and provider events
- task event history
- activity logging

This is the right base for the internal operations system.

## Missing Department-Side Layers

### 1. Department identities and roles

We need internal actor types such as:

- department admin
- office manager
- case worker
- reviewer
- approver
- verifier
- escalation owner

Suggested tables:

- `department_accounts`
- `department_memberships`
- `department_roles`

Key fields:

- department key
- office key
- role
- approval authority
- active status

### 2. Work queues

Each department needs inbox-style queues.

Base queues:

- new
- assigned
- waiting_on_citizen
- under_review
- approved
- rejected
- escalated
- closed

Suggested table:

- `service_task_assignments`

Key fields:

- task id
- assigned department key
- assigned office key
- assigned user id
- queue state
- assigned at
- due at
- sla status

### 3. Case actions

Departments need structured actions, not only notes.

Base actions:

- accept case
- request more information
- add internal note
- send citizen update
- approve
- reject
- escalate
- transfer to another office
- close

Suggested table:

- `service_task_decisions`

Key fields:

- task id
- actor id
- decision type
- public note
- private note
- attachments
- previous state
- next state

### 4. Citizen response thread

Citizen-facing updates should be explicit and auditable.

Suggested table:

- `service_task_messages`

Types:

- system
- citizen
- department

This allows:

- department asks for clarification
- citizen replies with document or note
- app maintains one case conversation

### 5. Approval policies

Different services need different authority rules.

Example:

- some tasks can be resolved by a case worker
- some require manager approval
- some need dual review

Suggested configuration layer:

- `service_workflow_policies`

Key fields:

- service slug
- department key
- required role for approval
- escalation thresholds
- allowed transitions

### 6. SLA and escalation

The system should know when cases are stuck.

Suggested fields:

- first response due
- resolution due
- last citizen update at
- escalation due

Base escalation rules:

- no owner after X hours
- no citizen response after Y days
- no department update after Z days

### 7. Visibility boundaries

Not every note should be visible to the citizen.

We need:

- public note
- internal note
- audit-only event

This is critical for trust and for safe internal operations.

## Data Model Recommendation

Do not create a separate department-only case model.

Use `service_tasks` as the shared root object, then add operations tables around it.

Recommended shape:

- `service_tasks`
- `service_task_events`
- `service_task_assignments`
- `service_task_messages`
- `service_task_decisions`
- `department_accounts`
- `department_memberships`
- `service_workflow_policies`

## UX Recommendation

### Citizen app

The citizen sees:

- current status
- assigned department or office
- latest public update
- requested next action
- due dates and reminders

### Department app

The department sees:

- inbox by queue
- filters by service, district, urgency, SLA
- case detail
- documents
- citizen conversation
- approve / reject / request info actions

This should likely live in a dedicated staff surface, not in the public citizen navigation.

## Rollout Order

### Phase 1: internal queueing

Build:

- department identities
- assignments
- queues
- internal notes
- public status updates

Outcome:

- routed citizen cases can be owned and worked by an internal team

### Phase 2: response and approval

Build:

- request-info loop
- decision records
- approval actions
- rejection reasons
- escalations

Outcome:

- full resolve/respond/approve workflow exists

### Phase 3: department portability

Build:

- service workflow policies
- department configuration UI
- reusable queue templates

Outcome:

- new departments can be added mostly by configuration

### Phase 4: external department integration

Build:

- portal adapters
- email/webhook connectors
- acknowledgment capture
- automated sync back into cases

Outcome:

- NepalRepublic starts acting as the operational layer between citizens and departments

## Immediate Build Recommendation

Next implementation slice:

1. add department account and membership tables
2. add task assignment table
3. add department inbox API
4. add department case actions API:
   - accept
   - request info
   - approve
   - reject
5. add public/private event visibility

This gives us the first real “other side” without overcommitting to every department integration at once.

## Why this matters

Right now NepalRepublic is getting strong at creating and routing cases.

The next leap is making sure every case can actually be worked, responded to, and resolved inside the same system.

That is the bridge from:

- smart citizen intake

to:

- full national case operating platform
