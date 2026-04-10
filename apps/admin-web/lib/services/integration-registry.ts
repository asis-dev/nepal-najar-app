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

import { resolveServiceCounterpartyRoute } from '@/lib/service-ops/counterparty-routing';

export const SERVICE_INTEGRATIONS: ServiceIntegrationSurface[] = [
  {
    serviceSlug: 'nea-electricity-bill',
    provider: 'Nepal Electricity Authority (NEA)',
    mode: 'assisted',
    officialSurface: 'https://www.nea.org.np',
    channels: ['NEA website', 'Khalti billers', 'eSewa billers', 'ConnectIPS / wallet apps'],
    currentState:
      'The app can route and track the payment workflow, initiate eSewa/Khalti payment, verify callbacks, and now attach verified receipts back into the user’s service task automatically. The missing piece is fetching NEA customer/balance data directly before payment.',
    blockers: [
      'NEA customer lookup and outstanding balance fetch are not integrated.',
      'ConnectIPS and other payment channels are not normalized through one provider adapter.',
    ],
    nextBuildStep:
      'Add NEA customer lookup so amount-due can be fetched before payment, then normalize ConnectIPS and other channels through the same adapter.',
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
    mode: 'assisted',
    officialSurface: 'https://iom.edu.np/tuth',
    channels: ['hospital website', 'phone', 'in-person queue'],
    currentState: 'TUTH can now be surfaced through the hospital appointment adapter, including normalized specialties, preferred windows, and task-side appointment preference capture. Final booking still happens on the hospital surface.',
    blockers: [
      'No official appointment connector is implemented.',
      'No normalized schedule model exists across hospital providers.',
    ],
    nextBuildStep: 'Connect the task-side appointment preference and future booking reference directly to a provider-specific TUTH connector.',
  },
  {
    serviceSlug: 'patan-hospital-opd',
    provider: 'Patan Hospital',
    mode: 'assisted',
    officialSurface: 'https://patanhospital.gov.np',
    channels: ['hospital website', 'phone', 'in-person queue'],
    currentState: 'Patan Hospital now runs through the reusable hospital appointment adapter, so users can save specialty and preferred window inside NepalRepublic even though booking still finishes on the hospital side.',
    blockers: [
      'No official appointment connector is implemented.',
      'No booking confirmation sync is wired back from the provider.',
    ],
    nextBuildStep: 'Add provider-specific booking confirmation and token/reference sync for Patan Hospital.',
  },
  {
    serviceSlug: 'civil-hospital-opd',
    provider: 'Civil Service Hospital',
    mode: 'assisted',
    officialSurface: '',
    channels: ['phone', 'in-person queue'],
    currentState: 'Civil Hospital can now use the shared hospital adapter for preference capture and task-side routing, but there is not yet a confirmed official online booking surface wired into the app.',
    blockers: [
      'No official appointment connector is implemented.',
      'Scheduling and token confirmation are still external to the app.',
    ],
    nextBuildStep: 'Add Civil-specific booking/token sync once a stable digital surface is confirmed.',
  },
];

export function getServiceIntegration(serviceSlug: string) {
  return SERVICE_INTEGRATIONS.find((entry) => entry.serviceSlug === serviceSlug) || null;
}

export async function resolveServiceIntegration(serviceSlug: string, departmentKey?: string | null): Promise<ServiceIntegrationSurface | null> {
  const route = await resolveServiceCounterpartyRoute(serviceSlug, departmentKey);
  if (route?.counterparty) {
    const submissionMode = String(route.submission_mode || 'manual');
    const responseMode = String(route.response_capture_mode || 'manual');
    const mode: IntegrationMode =
      submissionMode === 'direct_api' && responseMode === 'direct_api'
        ? 'direct'
        : submissionMode === 'manual'
          ? 'planned'
          : route.supports_status_updates
            ? 'assisted'
            : 'linked';

    const blockers: string[] = [];
    if (!route.supports_status_updates) blockers.push('Live status sync is not wired yet.');
    if (!route.supports_payment_confirmation) blockers.push('Payment confirmation is not normalized for this route yet.');
    if (route.required_human_review) blockers.push('A human department or provider review is still required.');

    return {
      serviceSlug,
      provider: route.counterparty.name,
      mode,
      officialSurface: route.counterparty.contact_email || route.counterparty.contact_phone || route.counterparty.name,
      channels: [submissionMode, responseMode],
      currentState:
        route.metadata?.strategy ||
        `This service is routed through ${route.counterparty.name} using ${submissionMode} submission and ${responseMode} response capture.`,
      blockers,
      nextBuildStep:
        route.supports_status_updates
          ? 'Increase direct automation depth on this mapped route and reduce human handoff.'
          : 'Add stronger response/status capture on the mapped counterparty route.',
    };
  }

  return getServiceIntegration(serviceSlug);
}
