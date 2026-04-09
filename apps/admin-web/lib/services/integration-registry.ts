export type IntegrationMode = 'direct' | 'assisted' | 'linked' | 'planned';

export interface ServiceIntegrationSurface {
  serviceSlug: string;
  provider: string;
  mode: IntegrationMode;
  officialSurface: string;
  channels: string[];
  currentState: string;
  blockers: string[];
  nextBuildStep: string;
}

export const SERVICE_INTEGRATIONS: ServiceIntegrationSurface[] = [
  {
    serviceSlug: 'nea-electricity-bill',
    provider: 'Nepal Electricity Authority (NEA)',
    mode: 'assisted',
    officialSurface: 'https://www.nea.org.np',
    channels: ['NEA website', 'Khalti billers', 'eSewa billers', 'ConnectIPS / wallet apps'],
    currentState: 'The app can route and track the payment workflow, but payment confirmation is still user-confirmed rather than provider-verified.',
    blockers: [
      'No provider receipt webhook is connected into NepalRepublic yet.',
      'Customer lookup and outstanding balance fetch are not integrated.',
    ],
    nextBuildStep: 'Add provider-backed payment confirmation and store receipt metadata against the task.',
  },
  {
    serviceSlug: 'drivers-license-renewal',
    provider: 'Department of Transport Management (DoTM)',
    mode: 'assisted',
    officialSurface: 'https://www.dotm.gov.np',
    channels: ['DoTM website', 'wallet payment providers', 'office visit'],
    currentState: 'The app can guide and track appointment/payment/office milestones, but booking and payment are still completed on external surfaces.',
    blockers: [
      'No stable booking API is wired into NepalRepublic.',
      'No official DoTM status-sync or card-delivery sync is connected.',
    ],
    nextBuildStep: 'Model appointment slot data and wire in external booking confirmation storage first, then add delivery/status sync.',
  },
  {
    serviceSlug: 'bir-hospital-opd',
    provider: 'Bir Hospital',
    mode: 'linked',
    officialSurface: 'https://www.bhnepal.gov.np',
    channels: ['hospital website', 'phone', 'in-person queue'],
    currentState: 'The app can now recognize Bir Hospital queries correctly, but hospital appointment execution still depends on the hospital’s own process.',
    blockers: [
      'No unified hospital booking API exists in the app.',
      'Slot availability and confirmation are not synced back into NepalRepublic.',
    ],
    nextBuildStep: 'Create a reusable hospital appointment adapter with slot, booking, and confirmation abstractions.',
  },
  {
    serviceSlug: 'tuth-opd',
    provider: 'Tribhuvan University Teaching Hospital (TUTH)',
    mode: 'linked',
    officialSurface: 'https://iom.edu.np/tuth',
    channels: ['hospital website', 'phone', 'in-person queue'],
    currentState: 'TUTH can be surfaced correctly as a hospital option, but not booked directly from inside the product yet.',
    blockers: [
      'No official appointment connector is implemented.',
      'No normalized schedule model exists across hospital providers.',
    ],
    nextBuildStep: 'Extend the hospital appointment adapter to handle TUTH-specific routing and office metadata.',
  },
];

export function getServiceIntegration(serviceSlug: string) {
  return SERVICE_INTEGRATIONS.find((entry) => entry.serviceSlug === serviceSlug) || null;
}
