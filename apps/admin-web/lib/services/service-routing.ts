import type { Service } from './types';

export interface ServiceRoutingSnapshot {
  departmentKey: string;
  departmentName: string;
  authorityLevel: 'local' | 'district' | 'provincial' | 'federal' | 'provider';
  officeName: string | null;
  officeAddress: string | null;
  roleTitle: string;
  personHint: string | null;
  routeType: 'digital' | 'counter' | 'hybrid';
  routingReason: string;
  confidence: number;
}

function firstOffice(service: Service) {
  return service.offices[0] || null;
}

/** Maps service category → department key when no slug override exists */
const CATEGORY_DEPARTMENT_MAP: Record<string, { key: string; name: string; authority: ServiceRoutingSnapshot['authorityLevel']; role: string }> = {
  identity:   { key: 'district-administration', name: 'District Administration Office', authority: 'district', role: 'Registration Officer' },
  transport:  { key: 'transport', name: 'Department of Transport Management (DoTM)', authority: 'district', role: 'Transport Officer' },
  tax:        { key: 'tax', name: 'Inland Revenue Department', authority: 'district', role: 'Taxpayer Service Officer' },
  health:     { key: 'health', name: 'Hospital & OPD Services', authority: 'provider', role: 'Appointment Desk' },
  utilities:  { key: 'utilities', name: 'Utility Provider', authority: 'provider', role: 'Billing Support' },
  business:   { key: 'business', name: 'Office of Company Registrar / Dept of Industry', authority: 'federal', role: 'Business Registration Officer' },
  land:       { key: 'land', name: 'Land Revenue / Survey Office', authority: 'district', role: 'Land Registration Officer' },
  banking:    { key: 'banking', name: 'Nepal Rastra Bank / Bank Provider', authority: 'provider', role: 'Account Service Officer' },
  education:  { key: 'education', name: 'Ministry of Education / University', authority: 'federal', role: 'Academic Service Officer' },
  legal:      { key: 'legal', name: 'Commission / Ombudsman', authority: 'federal', role: 'Case Intake Officer' },
};

function buildDefaultRouting(service: Service): ServiceRoutingSnapshot {
  const office = firstOffice(service);
  const routeType =
    service.providerType === 'utility' && service.slug.includes('bill')
      ? 'digital'
      : office
        ? 'hybrid'
        : 'digital';

  const catMap = CATEGORY_DEPARTMENT_MAP[service.category];

  return {
    departmentKey: catMap?.key || service.category,
    departmentName: catMap?.name || service.providerName,
    authorityLevel: catMap?.authority || (
      service.providerType === 'gov' ? 'federal' : 'provider'
    ),
    officeName: office?.name.en || null,
    officeAddress: office?.address.en || null,
    roleTitle: catMap?.role || (
      service.providerType === 'hospital' ? 'Appointment Desk'
      : service.providerType === 'utility' ? 'Billing Support'
      : 'Service Officer'
    ),
    personHint: null,
    routeType,
    routingReason: `${service.providerName} is the primary authority for ${service.title.en}.`,
    confidence: catMap ? 0.82 : 0.72,
  };
}

const SERVICE_OVERRIDES: Record<string, Partial<ServiceRoutingSnapshot>> = {
  // ── Transport ─────────────────────────────────────────────────
  'drivers-license-renewal': {
    departmentKey: 'transport', departmentName: 'Department of Transport Management (DoTM)',
    authorityLevel: 'district', roleTitle: 'License Renewal Officer', routeType: 'hybrid',
    routingReason: 'License renewals are handled by DoTM through appointment, payment, and an in-person office visit.',
    confidence: 0.96,
  },
  'drivers-license-new': {
    departmentKey: 'transport', departmentName: 'Department of Transport Management (DoTM)',
    authorityLevel: 'district', roleTitle: 'New License Officer', routeType: 'hybrid',
    routingReason: 'New license applications require written + practical trial at DoTM.',
    confidence: 0.95,
  },
  'drivers-license-trial': {
    departmentKey: 'transport', departmentName: 'Department of Transport Management (DoTM)',
    authorityLevel: 'district', roleTitle: 'Trial Booking Desk', routeType: 'hybrid',
    routingReason: 'Trial bookings route to DoTM trial scheduling desk.',
    confidence: 0.94,
  },
  'vehicle-registration': {
    departmentKey: 'transport', departmentName: 'Department of Transport Management (DoTM)',
    authorityLevel: 'district', roleTitle: 'Vehicle Registration Officer', routeType: 'hybrid',
    routingReason: 'Vehicle registration is processed at DoTM district offices.',
    confidence: 0.93,
  },
  'pollution-test': {
    departmentKey: 'transport', departmentName: 'DoTM / Authorized Test Center',
    authorityLevel: 'district', roleTitle: 'Pollution Test Center', routeType: 'counter',
    routingReason: 'Pollution tests are conducted at DoTM-authorized centers.',
    confidence: 0.90,
  },
  'bike-bluebook-renewal': {
    departmentKey: 'transport', departmentName: 'Department of Transport Management (DoTM)',
    authorityLevel: 'district', roleTitle: 'Bluebook Officer', routeType: 'hybrid',
    routingReason: 'Bluebook renewals are processed at DoTM offices.',
    confidence: 0.92,
  },
  'vehicle-tax-payment': {
    departmentKey: 'transport', departmentName: 'Department of Transport Management (DoTM)',
    authorityLevel: 'district', roleTitle: 'Vehicle Tax Officer', routeType: 'digital',
    routingReason: 'Vehicle tax payments can be done online or at DoTM counters.',
    confidence: 0.91,
  },

  // ── Passport & Identity ───────────────────────────────────────
  'new-passport': {
    departmentKey: 'passport', departmentName: 'Department of Passports',
    authorityLevel: 'federal', roleTitle: 'Passport Enrollment Officer', routeType: 'hybrid',
    routingReason: 'New passports route through the Department of Passports for biometrics and issuance.',
    confidence: 0.95,
  },
  'citizenship-by-descent': {
    departmentKey: 'district-administration', departmentName: 'District Administration Office',
    authorityLevel: 'district', roleTitle: 'Citizenship Officer', routeType: 'counter',
    routingReason: 'Citizenship by descent is issued through the DAO tied to the family citizenship district.',
    confidence: 0.95,
  },
  'citizenship-duplicate': {
    departmentKey: 'district-administration', departmentName: 'District Administration Office',
    authorityLevel: 'district', roleTitle: 'Citizenship Officer', routeType: 'counter',
    routingReason: 'Duplicate citizenship certificates are issued at the original issuing DAO.',
    confidence: 0.94,
  },
  'national-id-nid': {
    departmentKey: 'district-administration', departmentName: 'Dept of National ID & Civil Registration',
    authorityLevel: 'federal', roleTitle: 'NID Enrollment Officer', routeType: 'hybrid',
    routingReason: 'National ID enrollment routes through DONIDCR enrollment centers.',
    confidence: 0.93,
  },
  'birth-registration': {
    departmentKey: 'local-govt', departmentName: 'Local Ward Office',
    authorityLevel: 'local', roleTitle: 'Vital Registration Officer', routeType: 'counter',
    routingReason: 'Birth registration is done at the ward office within 35 days.',
    confidence: 0.94,
  },
  'marriage-registration': {
    departmentKey: 'local-govt', departmentName: 'Local Ward Office',
    authorityLevel: 'local', roleTitle: 'Vital Registration Officer', routeType: 'counter',
    routingReason: 'Marriage registration is processed at the local ward office.',
    confidence: 0.94,
  },
  'migration-certificate': {
    departmentKey: 'local-govt', departmentName: 'Local Ward Office',
    authorityLevel: 'local', roleTitle: 'Ward Secretary', routeType: 'counter',
    routingReason: 'Migration certificates are issued by the ward office.',
    confidence: 0.93,
  },
  'police-report': {
    departmentKey: 'district-administration', departmentName: 'Nepal Police / District Police Office',
    authorityLevel: 'district', roleTitle: 'Police Report Desk', routeType: 'counter',
    routingReason: 'Police reports (FIR) are filed at the nearest police station.',
    confidence: 0.92,
  },

  // ── Tax ────────────────────────────────────────────────────────
  'pan-individual': {
    departmentKey: 'tax', departmentName: 'Inland Revenue Department',
    authorityLevel: 'district', roleTitle: 'Taxpayer Service Officer', routeType: 'hybrid',
    routingReason: 'Personal PAN registration starts online but is finalized by the IRD office.',
    confidence: 0.92,
  },
  'income-tax-filing': {
    departmentKey: 'tax', departmentName: 'Inland Revenue Department',
    authorityLevel: 'federal', roleTitle: 'Tax Filing Officer', routeType: 'digital',
    routingReason: 'Income tax filing is done via the IRD taxpayer portal.',
    confidence: 0.93,
  },
  'tax-clearance': {
    departmentKey: 'tax', departmentName: 'Inland Revenue Department',
    authorityLevel: 'district', roleTitle: 'Tax Clearance Officer', routeType: 'hybrid',
    routingReason: 'Tax clearance certificates are issued by the IRD office.',
    confidence: 0.91,
  },
  'vat-registration': {
    departmentKey: 'tax', departmentName: 'Inland Revenue Department',
    authorityLevel: 'district', roleTitle: 'VAT Registration Officer', routeType: 'hybrid',
    routingReason: 'VAT registration is processed at IRD district offices.',
    confidence: 0.90,
  },

  // ── Utilities ──────────────────────────────────────────────────
  'nea-electricity-bill': {
    departmentKey: 'electricity', departmentName: 'Nepal Electricity Authority (NEA)',
    authorityLevel: 'provider', roleTitle: 'Billing Support', routeType: 'digital',
    routingReason: 'Electricity bill payments route to NEA via wallet/banking integrations.',
    confidence: 0.94,
  },
  'nea-new-connection': {
    departmentKey: 'electricity', departmentName: 'Nepal Electricity Authority (NEA)',
    authorityLevel: 'provider', roleTitle: 'Connection Officer', routeType: 'hybrid',
    routingReason: 'New electricity connections require application at the local NEA office.',
    confidence: 0.93,
  },
  'kukl-water-bill': {
    departmentKey: 'water', departmentName: 'Kathmandu Upatyaka Khanepani Limited (KUKL)',
    authorityLevel: 'provider', roleTitle: 'Billing Support', routeType: 'digital',
    routingReason: 'Water bill payments route through KUKL billing channels.',
    confidence: 0.93,
  },
  'kukl-new-connection': {
    departmentKey: 'water', departmentName: 'Kathmandu Upatyaka Khanepani Limited (KUKL)',
    authorityLevel: 'provider', roleTitle: 'Connection Officer', routeType: 'hybrid',
    routingReason: 'New water connections require application at the local KUKL office.',
    confidence: 0.92,
  },

  // ── Health ─────────────────────────────────────────────────────
  'bir-hospital-opd': {
    departmentKey: 'health', departmentName: 'Bir Hospital',
    authorityLevel: 'provider', roleTitle: 'OPD Appointment Desk', routeType: 'hybrid',
    routingReason: 'Bir Hospital OPD requests route to the appointment desk and relevant department clinic.',
    confidence: 0.94,
  },
  'tuth-opd': {
    departmentKey: 'health', departmentName: 'Tribhuvan University Teaching Hospital',
    authorityLevel: 'provider', roleTitle: 'OPD Appointment Desk', routeType: 'hybrid',
    routingReason: 'TUTH OPD visits route through the appointment desk and specialty outpatient counters.',
    confidence: 0.94,
  },
  'patan-hospital-opd': {
    departmentKey: 'health', departmentName: 'Patan Hospital',
    authorityLevel: 'provider', roleTitle: 'OPD Appointment Desk', routeType: 'hybrid',
    routingReason: 'Patan Hospital OPD requests route through the appointment desk.',
    confidence: 0.94,
  },
  'civil-hospital-opd': {
    departmentKey: 'health', departmentName: 'Civil Service Hospital',
    authorityLevel: 'provider', roleTitle: 'OPD Appointment Desk', routeType: 'hybrid',
    routingReason: 'Civil Hospital OPD requests route through the appointment desk.',
    confidence: 0.93,
  },
  'kanti-childrens-hospital': {
    departmentKey: 'health', departmentName: 'Kanti Children\'s Hospital',
    authorityLevel: 'provider', roleTitle: 'Pediatric OPD Desk', routeType: 'hybrid',
    routingReason: 'Pediatric cases route to Kanti Children\'s Hospital OPD.',
    confidence: 0.94,
  },
  'maternity-hospital': {
    departmentKey: 'health', departmentName: 'Prasuti Griha (Maternity Hospital)',
    authorityLevel: 'provider', roleTitle: 'Maternity OPD Desk', routeType: 'hybrid',
    routingReason: 'Maternity cases route to Prasuti Griha OPD and ANC clinic.',
    confidence: 0.94,
  },
  'vaccination-child': {
    departmentKey: 'health', departmentName: 'Local Health Post / Hospital',
    authorityLevel: 'local', roleTitle: 'Immunization Desk', routeType: 'counter',
    routingReason: 'Child vaccination follows the national immunization schedule at local health posts.',
    confidence: 0.92,
  },
  'health-insurance-board': {
    departmentKey: 'health', departmentName: 'Health Insurance Board',
    authorityLevel: 'federal', roleTitle: 'Enrollment Officer', routeType: 'hybrid',
    routingReason: 'Health insurance enrollment is processed by the Health Insurance Board.',
    confidence: 0.91,
  },
  'ambulance-102': {
    departmentKey: 'health', departmentName: 'Emergency Medical Service',
    authorityLevel: 'provider', roleTitle: 'Emergency Dispatch', routeType: 'digital',
    routingReason: 'Ambulance service is dispatched by calling 102.',
    confidence: 0.98,
  },

  // ── Business ───────────────────────────────────────────────────
  'company-registration-ocr': {
    departmentKey: 'business', departmentName: 'Office of Company Registrar (OCR)',
    authorityLevel: 'federal', roleTitle: 'Company Registration Officer', routeType: 'hybrid',
    routingReason: 'Company registration routes through OCR portal and office.',
    confidence: 0.93,
  },
  'industry-registration': {
    departmentKey: 'business', departmentName: 'Department of Industry',
    authorityLevel: 'federal', roleTitle: 'Industry Registration Officer', routeType: 'hybrid',
    routingReason: 'Industry registration is processed at the Department of Industry.',
    confidence: 0.92,
  },
  'fssai-food-license': {
    departmentKey: 'business', departmentName: 'Dept of Food Technology & Quality Control (DFTQC)',
    authorityLevel: 'federal', roleTitle: 'Food License Officer', routeType: 'hybrid',
    routingReason: 'Food business licenses are issued by DFTQC.',
    confidence: 0.91,
  },

  // ── Land ───────────────────────────────────────────────────────
  'land-parcha': {
    departmentKey: 'land', departmentName: 'Land Revenue / Survey Office',
    authorityLevel: 'district', roleTitle: 'Land Search Officer', routeType: 'counter',
    routingReason: 'Land parcha (search) is conducted at the district land revenue office.',
    confidence: 0.93,
  },
  'land-valuation': {
    departmentKey: 'land', departmentName: 'Land Revenue Office',
    authorityLevel: 'district', roleTitle: 'Valuation Officer', routeType: 'counter',
    routingReason: 'Land valuations are issued by the district land revenue office.',
    confidence: 0.92,
  },
  'land-registration': {
    departmentKey: 'land', departmentName: 'Land Revenue Office',
    authorityLevel: 'district', roleTitle: 'Land Registration Officer', routeType: 'counter',
    routingReason: 'Land ownership transfer (rajinama) is processed at the land revenue office.',
    confidence: 0.94,
  },
  'house-land-tax': {
    departmentKey: 'local-govt', departmentName: 'Municipality / Rural Municipality',
    authorityLevel: 'local', roleTitle: 'Revenue Officer', routeType: 'hybrid',
    routingReason: 'House and land tax is paid at the local municipality office.',
    confidence: 0.93,
  },

  // ── Education ──────────────────────────────────────────────────
  'tu-transcript': {
    departmentKey: 'education', departmentName: 'Tribhuvan University (TU)',
    authorityLevel: 'federal', roleTitle: 'Transcript Officer', routeType: 'counter',
    routingReason: 'Academic transcripts are issued by the university exam controller.',
    confidence: 0.92,
  },
  'noc-foreign-study': {
    departmentKey: 'education', departmentName: 'Ministry of Education',
    authorityLevel: 'federal', roleTitle: 'NOC Officer', routeType: 'hybrid',
    routingReason: 'No Objection Certificates for foreign study are issued by MoE.',
    confidence: 0.91,
  },
  'loksewa-application': {
    departmentKey: 'education', departmentName: 'Public Service Commission (PSC)',
    authorityLevel: 'federal', roleTitle: 'Examination Officer', routeType: 'digital',
    routingReason: 'Lok Sewa applications route through the PSC online portal.',
    confidence: 0.93,
  },

  // ── Legal / Complaints ─────────────────────────────────────────
  'ciaa-complaint': {
    departmentKey: 'legal', departmentName: 'CIAA (Commission for Investigation of Abuse of Authority)',
    authorityLevel: 'federal', roleTitle: 'Complaint Intake Officer', routeType: 'hybrid',
    routingReason: 'Anti-corruption complaints route to CIAA (hotline 107).',
    confidence: 0.95,
  },
  'consumer-complaint': {
    departmentKey: 'legal', departmentName: 'Department of Commerce, Supplies & Consumer Protection',
    authorityLevel: 'federal', roleTitle: 'Consumer Protection Officer', routeType: 'hybrid',
    routingReason: 'Consumer complaints route to the Dept of Commerce and Supplies.',
    confidence: 0.92,
  },
  'human-rights-complaint': {
    departmentKey: 'legal', departmentName: 'National Human Rights Commission (NHRC)',
    authorityLevel: 'federal', roleTitle: 'Human Rights Officer', routeType: 'hybrid',
    routingReason: 'Human rights complaints route to NHRC.',
    confidence: 0.94,
  },
  'lokpal-complaint': {
    departmentKey: 'legal', departmentName: 'Commission for Investigation of Abuse of Authority',
    authorityLevel: 'federal', roleTitle: 'Grievance Officer', routeType: 'hybrid',
    routingReason: 'Government service grievances route through CIAA / Lokpal.',
    confidence: 0.91,
  },

  // ── Foreign Employment ─────────────────────────────────────────
  'labor-permit': {
    departmentKey: 'labor', departmentName: 'Department of Foreign Employment (DoFE)',
    authorityLevel: 'federal', roleTitle: 'Labor Permit Officer', routeType: 'hybrid',
    routingReason: 'Labor permits are issued through FEIMS at DoFE.',
    confidence: 0.94,
  },

  // ── Banking ────────────────────────────────────────────────────
  'bank-account-opening': {
    departmentKey: 'banking', departmentName: 'Bank Provider',
    authorityLevel: 'provider', roleTitle: 'Account Officer', routeType: 'counter',
    routingReason: 'Bank account opening requires in-person KYC at the bank branch.',
    confidence: 0.88,
  },
  'forex-card-nrb': {
    departmentKey: 'banking', departmentName: 'Nepal Rastra Bank / Licensed Bank',
    authorityLevel: 'federal', roleTitle: 'Forex Officer', routeType: 'counter',
    routingReason: 'Foreign exchange services route through NRB-licensed banks.',
    confidence: 0.89,
  },
};

export function resolveServiceRouting(service: Service): ServiceRoutingSnapshot {
  const office = firstOffice(service);
  const base = buildDefaultRouting(service);
  const override = SERVICE_OVERRIDES[service.slug] || {};

  return {
    ...base,
    ...override,
    officeName: override.officeName ?? office?.name.en ?? base.officeName,
    officeAddress: override.officeAddress ?? office?.address.en ?? base.officeAddress,
    personHint:
      override.personHint ??
      (service.providerType === 'hospital'
        ? 'Front desk staff will usually send the case to the specialty clinic after intake.'
        : service.providerType === 'gov'
          ? 'Frontline officers or help desk staff typically escalate to the responsible section chief.'
          : null),
  };
}
