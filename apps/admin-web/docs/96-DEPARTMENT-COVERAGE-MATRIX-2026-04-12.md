# 96 Department Coverage Matrix

Date: 2026-04-12

## Purpose

This document turns the AI autopilot roadmap into an operational coverage map.

It is not only about ministries.

It tracks the 96 authority, desk, provider, and institutional clusters NepalRepublic would need to support if the product is going to act like an "everything app" for Nepal.

This is the correct lens because citizens do not think in terms of only ministries.

They think in terms of:

- passport
- hospital
- license
- water
- ward office
- school
- police
- land office
- bank

Each of those maps to one or more real authorities, providers, or institutional desks.

## Maturity Legend

- `Linked`
  NepalRepublic can explain and route, but execution still happens outside the app.
- `Assisted`
  NepalRepublic can create/track the case, collect documents, guide the user, and record references.
- `Semi-direct`
  NepalRepublic can prefill, initiate, verify part of the flow, or sync partial provider truth.
- `Direct target`
  NepalRepublic should be able to do most digital steps, reflect provider truth back, and drive the case close to completion.

## Important Truth

If the backbone in [AI-AUTOPILOT-ROADMAP-2026-04-12.md](/Users/priyanka.shrestha/Desktop/nepal-progress/apps/admin-web/docs/AI-AUTOPILOT-ROADMAP-2026-04-12.md) is fully built, the platform can support all 96 clusters.

But "support the backbone" is not the same thing as "fully integrated with all 96."

Each row below still needs:

- service adapters
- field maps
- document schemas
- route ownership
- submission path
- reply/status sync path
- escalation rules

## Coverage Summary

- `Wave 1 build first`: health, passport, license, utilities, local complaints
- `Wave 2`: citizenship, local government, PAN/NID, education core flows
- `Wave 3`: land, benefits, labor, justice, business
- `Wave 4`: deeper private/provider integrations, advanced status sync, long-tail institutions

## Matrix

| # | Authority / Desk Cluster | Service Family | Example Services | Current | Target | Main Gap |
|---|---|---|---|---|---|---|
| 1 | Department of Passports | Identity | New passport, renewal | Assisted | Direct target | Draft + submission adapter |
| 2 | District Administration Office | Identity | Citizenship by descent | Assisted | Assisted | Human review and DAO-specific routing |
| 3 | District Administration Office | Identity | Citizenship duplicate | Assisted | Assisted | Original-issuing-office logic |
| 4 | Department of National ID and Civil Registration | Identity | National ID enrollment | Linked | Assisted | Field requirements and booking support |
| 5 | Ward Vital Registration Desk | Civil status | Birth registration | Assisted | Assisted | Location-specific ward routing |
| 6 | Ward Vital Registration Desk | Civil status | Death registration | Linked | Assisted | Form drafting + ward submission path |
| 7 | Ward Vital Registration Desk | Civil status | Marriage registration | Assisted | Assisted | Document bundle and approval prep |
| 8 | Ward Vital Registration Desk | Civil status | Migration certificate / address change | Assisted | Assisted | Address proof + routing logic |
| 9 | DoTM License Desk | Transport | New license | Assisted | Semi-direct | Application draft + trial booking |
| 10 | DoTM Renewal Desk | Transport | License renewal | Assisted | Semi-direct | Prefill + payment + slot sync |
| 11 | DoTM Trial Desk | Transport | Trial booking | Linked | Semi-direct | Slot lookup and booking adapter |
| 12 | DoTM Vehicle Registration Desk | Transport | Vehicle registration | Linked | Assisted | Vehicle/entity workflow support |
| 13 | DoTM Bluebook Desk | Transport | Bluebook renewal | Assisted | Semi-direct | Vehicle record sync |
| 14 | DoTM Tax Desk | Transport | Vehicle tax payment | Assisted | Semi-direct | Payment-to-task bridge |
| 15 | Traffic Police Fine Desk | Enforcement | Traffic fine handling | Linked | Semi-direct | Fine lookup and receipt sync |
| 16 | Pollution Test Centers | Transport | Emission/pollution test | Linked | Assisted | Center directory and appointment prep |
| 17 | Nepal Electricity Authority Billing | Utilities | Electricity bill payment | Semi-direct | Direct target | Bill lookup from provider |
| 18 | Nepal Electricity Authority Connection Desk | Utilities | New connection | Assisted | Assisted | Application pack + status sync |
| 19 | Nepal Electricity Authority Fault Desk | Utilities | Power outage / service issue | Linked | Assisted | Complaint intake + escalation path |
| 20 | KUKL Billing | Utilities | Water bill payment | Assisted | Semi-direct | Account lookup and payment sync |
| 21 | KUKL Connection Desk | Utilities | New water connection | Linked | Assisted | Form drafting + provider queue |
| 22 | Municipality Sanitation Desk | Local services | Garbage/sanitation complaints | Linked | Assisted | Counterparty routing and SLA |
| 23 | Municipality Streetlight Desk | Local services | Streetlight complaint | Linked | Assisted | Geo-tagged issue routing |
| 24 | Ward / Municipality Infrastructure Desk | Local services | Roads, potholes, drainage | Assisted | Assisted | Evidence-to-case escalation loop |
| 25 | Bir Hospital OPD Desk | Health | OPD booking | Assisted | Semi-direct | Slot/booking adapter |
| 26 | TUTH OPD Desk | Health | Specialist appointment | Assisted | Semi-direct | Specialty booking normalization |
| 27 | Patan Hospital OPD Desk | Health | Hospital appointment | Assisted | Semi-direct | Provider status sync |
| 28 | Civil Service Hospital Desk | Health | OPD and specialist | Assisted | Semi-direct | Booking + reschedule/cancel |
| 29 | Kanti Children’s Hospital Desk | Health | Pediatric care | Assisted | Semi-direct | Child-specific triage + booking |
| 30 | Maternity Hospital Desk | Health | ANC, delivery, maternity care | Assisted | Semi-direct | Urgency triage + emergency routing |
| 31 | Ambulance / Emergency Dispatch | Health | Emergency ambulance | Assisted | Assisted | Live dispatch integration |
| 32 | Health Insurance Board | Health | Insurance enrollment / support | Linked | Assisted | Enrollment adapter and status sync |
| 33 | School Admission Office | Education | School admission | Linked | Assisted | Institution-specific draft packets |
| 34 | College Admission Office | Education | College admission | Linked | Assisted | Eligibility and doc bundles |
| 35 | TU Transcript Desk | Education | Transcript request | Assisted | Assisted | Application draft + queue sync |
| 36 | University Exam Controller | Education | Certificate verification | Linked | Assisted | Reference/status capture |
| 37 | NEB Result / Exam Support | Education | Exam status and result lookup | Linked | Semi-direct | Lookup adapter |
| 38 | Scholarship Unit | Education | Scholarship applications | Assisted | Assisted | Deadline engine + form drafting |
| 39 | MoE NOC Desk | Education | No objection certificate | Assisted | Assisted | Submission prep + tracking |
| 40 | Public Service Commission | Education / exams | Lok Sewa application | Assisted | Semi-direct | Form autopilot + payment bridge |
| 41 | Inland Revenue PAN Desk | Tax | PAN registration | Assisted | Semi-direct | Applicant draft + office sync |
| 42 | Inland Revenue Filing Desk | Tax | Income tax filing | Linked | Assisted | Declarative form support |
| 43 | Inland Revenue Clearance Desk | Tax | Tax clearance | Linked | Assisted | Eligibility + status lookup |
| 44 | VAT Registration Desk | Tax | VAT registration | Linked | Assisted | Business entity mapping |
| 45 | Municipality Revenue Desk | Local tax | House/land tax | Linked | Semi-direct | Local amount lookup |
| 46 | Customs / Import Support Desk | Finance | Customs support workflows | Linked | Assisted | Complex document chain |
| 47 | Insurance Enrollment Desk | Finance | Insurance onboarding | Linked | Assisted | Provider-specific adapters |
| 48 | Remittance / Payment Verification Desk | Finance | Remittance-linked identity flows | Linked | Assisted | Reference validation |
| 49 | Ward Office General Desk | Local government | Recommendations / letters | Assisted | Assisted | Location-specific templates |
| 50 | Municipality Executive Desk | Local government | Permits / municipal support | Linked | Assisted | Office-specific process rules |
| 51 | Rural Municipality Desk | Local government | Local approvals | Linked | Assisted | Local routing breadth |
| 52 | CDO General Services Desk | District admin | Attestations and district services | Linked | Assisted | District workflow adapters |
| 53 | Recommendation Letter Desk | Local government | Ward / local recommendation | Assisted | Assisted | Better prefill and draft review |
| 54 | Local Complaint Desk | Local government | Ward grievance | Assisted | Assisted | Two-way department messaging |
| 55 | Municipality Payment Counter | Local government | Local fee payment | Linked | Assisted | Local fee connectors |
| 56 | Local Records Desk | Local government | Residence / local record certification | Linked | Assisted | Record request drafting |
| 57 | Land Revenue Office | Land | Ownership transfer | Linked | Assisted | Multi-step document orchestration |
| 58 | Land Revenue Office | Land | Land tax / valuation | Linked | Assisted | Rate lookup and draft packet |
| 59 | Survey Office | Land | Cadastral / map records | Linked | Assisted | Record request adapter |
| 60 | House Map Approval Desk | Land / housing | Building approval support | Linked | Assisted | Municipality-specific forms |
| 61 | Tenancy Registration Desk | Housing | Rental / tenancy registration | Linked | Assisted | Drafting + local submission rules |
| 62 | Property Transfer Desk | Land | Rajinama / transfer support | Linked | Assisted | Approval chain logic |
| 63 | Land Search Desk | Land | Parcha / land search | Assisted | Assisted | Record retrieval bridge |
| 64 | Housing Utility Approval Desk | Housing | Related approvals / no objection paths | Linked | Assisted | Cross-office routing |
| 65 | Social Security Fund | Benefits | SSF enrollment / contribution | Assisted | Semi-direct | Employer/member workflow split |
| 66 | Senior Citizen Allowance Desk | Benefits | Senior allowance | Linked | Assisted | Eligibility and ward workflow |
| 67 | Disability Support Desk | Benefits | Disability support | Linked | Assisted | Proof + entitlement checks |
| 68 | Single Woman Support Desk | Benefits | Social protection requests | Linked | Assisted | Benefit-specific form drafting |
| 69 | Child Support Desk | Benefits | Child support schemes | Linked | Assisted | Family/guardian targeting |
| 70 | Health Benefit Desk | Benefits | Subsidy / health-related benefit | Linked | Assisted | Policy-specific rules |
| 71 | Vulnerable Family Support Desk | Benefits | Relief / vulnerable-family support | Linked | Assisted | Eligibility and case escalation |
| 72 | Benefit Renewal Desk | Benefits | Ongoing benefit renewal | Linked | Assisted | Reminder and renewal automation |
| 73 | Department of Labor Desk | Labor | Labor permit support | Linked | Assisted | Submission and status sync |
| 74 | Foreign Employment Desk | Migration | Migration documentation | Linked | Assisted | Multi-agency coordination |
| 75 | Worker Complaint Desk | Labor | Worker grievance | Linked | Assisted | Evidence + escalation workflow |
| 76 | Labor Approval Desk | Labor | Labor approvals / renewals | Linked | Assisted | Complex approval chains |
| 77 | Immigration / Travel Status Desk | Migration | Travel-related identity support | Linked | Assisted | Status lookups and cross-checks |
| 78 | NOC / Migration Clearance Desk | Migration | Clearance workflows | Assisted | Assisted | Submission-to-status bridge |
| 79 | Employment Permit Desk | Labor | Work permission support | Linked | Assisted | Permit-specific field map |
| 80 | Recruitment / Placement Verification Desk | Labor | Verification support | Linked | Assisted | Provider/authenticity checks |
| 81 | Nepal Police Complaint Desk | Justice | Police report / FIR support | Assisted | Assisted | Station-specific routing |
| 82 | CIAA Complaint Desk | Anti-corruption | Corruption complaint | Assisted | Assisted | Better filing adapter + evidence bundling |
| 83 | NHRC Complaint Desk | Rights | Human rights complaint | Assisted | Assisted | Stronger intake + status sync |
| 84 | Hello Sarkar / Lokpal Desk | Grievance | Government grievance | Assisted | Assisted | Better reference/status capture |
| 85 | District Court Legal Aid Desk | Justice | Legal aid | Linked | Assisted | Eligibility + assignment workflow |
| 86 | Supreme Court Lookup Desk | Justice | Case lookup | Linked | Semi-direct | Search adapter |
| 87 | RTI Filing Desk | Rights / transparency | Right to information requests | Linked | Assisted | Draft letter + escalation logic |
| 88 | Complaint Evidence Desk | Justice / grievance | Supporting documents and evidence | Assisted | Assisted | Better evidence packaging |
| 89 | Office of Company Registrar | Business | Company registration | Assisted | Semi-direct | Entity autofill + filing support |
| 90 | Department of Industry | Business | Industry registration | Linked | Assisted | Entity-specific workflow adapters |
| 91 | DFTQC / Food License Desk | Business | Food license | Linked | Assisted | Inspection and compliance steps |
| 92 | Business Renewal Desk | Business | License / renewal support | Linked | Assisted | Renewal reminder + draft prep |
| 93 | Bank Branch Account Desk | Banking | Bank account opening | Linked | Assisted | Secure KYC + branch workflow |
| 94 | Forex Desk | Banking | Foreign exchange request | Linked | Assisted | Travel-doc bundle and rules |
| 95 | eSewa / Wallet Desk | Digital finance | Wallet onboarding / bill pay | Semi-direct | Semi-direct | Stronger KYC and provider sync |
| 96 | Khalti / Wallet Desk | Digital finance | Wallet onboarding / bill pay | Semi-direct | Semi-direct | Stronger KYC and provider sync |

## What This Means

### If the roadmap is fully implemented

NepalRepublic can realistically support all 96 authority clusters through one shared execution backbone.

### What still will not be automatic by default

Some rows will remain constrained by external reality:

- biometric visits
- in-person identity verification
- paper-only offices
- institutions without stable digital surfaces
- approval steps that lawfully require a human authority

So "handle all 96" should be interpreted as:

- NepalRepublic can intake, route, draft, prefill, track, follow up, and escalate across all 96
- NepalRepublic can directly execute many, but not every, digital step
- NepalRepublic can still reduce user effort dramatically even where the last mile remains offline

## Final Readiness Standard

We should only call a row truly operational when it has all of these:

1. service definition
2. routing definition
3. triage logic
4. reusable profile field map
5. document requirements
6. draft engine support
7. review-and-approve path
8. submission or handoff path
9. status/ref number capture
10. escalation and audit trail

That is the standard required for NepalRepublic to become a real end-to-end citizen execution platform.
