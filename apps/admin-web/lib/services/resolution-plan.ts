import type { AssistantTaskIntake, TaskResolutionPlan } from './task-types';

function buildCitizenContext(intake?: AssistantTaskIntake | null) {
  if (!intake || !intake.domain || intake.domain === 'general') return null;

  if (intake.domain === 'health') {
    const bits = ['Health case'];
    if (intake.subject && intake.subject !== 'unknown') bits.push(`for ${intake.subject}`);
    if (intake.care_need && intake.care_need !== 'unknown') bits.push(`need: ${intake.care_need.replace(/_/g, ' ')}`);
    if (intake.health?.specialtyHint && intake.health.specialtyHint !== 'unknown') {
      bits.push(`specialty: ${intake.health.specialtyHint}`);
    }
    return bits.join(' · ');
  }

  if (intake.domain === 'utilities') {
    const bits = ['Utility payment'];
    if (intake.utilities?.provider && intake.utilities.provider !== 'unknown') {
      bits.push(`provider: ${intake.utilities.provider.toUpperCase()}`);
    }
    if (typeof intake.utilities?.accountKnown === 'boolean') {
      bits.push(intake.utilities.accountKnown ? 'account known' : 'account missing');
    }
    if (typeof intake.utilities?.amountKnown === 'boolean') {
      bits.push(intake.utilities.amountKnown ? 'amount known' : 'amount missing');
    }
    return bits.join(' · ');
  }

  if (intake.domain === 'license' && intake.license?.intent && intake.license.intent !== 'unknown') {
    return `License case · ${intake.license.intent}`;
  }
  if (intake.domain === 'citizenship' && intake.citizenship?.intent && intake.citizenship.intent !== 'unknown') {
    return `Citizenship case · ${intake.citizenship.intent}`;
  }
  if (intake.domain === 'passport' && intake.passport?.intent && intake.passport.intent !== 'unknown') {
    return `Passport case · ${intake.passport.intent}`;
  }

  return intake.domain;
}

export function buildTaskResolutionPlan(task: Record<string, any>): TaskResolutionPlan {
  const blockers: string[] = [];
  const intake = task.answers?.assistant_intake || null;
  const citizenContext = buildCitizenContext(intake);
  const queueState = task.queue_state || null;
  const waitingOnParty = task.waiting_on_party || null;
  const missingDocs = Array.isArray(task.missing_docs) ? task.missing_docs : [];
  const utilityLookup = task.answers?.utility_lookup || null;
  const appointmentRequested = Boolean(task.action_state?.appointment_requested?.completed);
  const appointmentBooked = Boolean(task.action_state?.appointment_booked?.completed);

  if (missingDocs.length > 0) {
    blockers.push(`Missing documents: ${missingDocs.map((doc: any) => doc.label).join(', ')}`);
  }

  if (task.service_category === 'utilities' && !utilityLookup?.customer_id) {
    blockers.push('Account identifier not saved yet');
  }
  if (task.service_category === 'utilities' && utilityLookup?.customer_id && !utilityLookup?.due_amount_npr) {
    blockers.push('Current amount due still missing');
  }

  if (task.workflow_mode === 'appointment' || task.requires_appointment) {
    if (!appointmentRequested) blockers.push('Appointment preference has not been saved');
    else if (!appointmentBooked) blockers.push('Booking reference or ticket has not been confirmed');
  }

  if (!task.assigned_department_name && !['completed', 'resolved', 'closed'].includes(queueState || '')) {
    blockers.push('Department route still needs confirmation');
  }

  if (task.status === 'completed' || ['resolved', 'closed', 'approved'].includes(queueState || '')) {
    return {
      status: 'resolved',
      headline: 'This service request has a clear recorded resolution.',
      citizenAction: 'Keep the receipt, reference, or issued document in your records.',
      departmentAction: 'No further action required unless the citizen reopens the case.',
      providerAction: 'No provider follow-up required.',
      blockers: [],
      citizenContext,
    };
  }

  if (missingDocs.length > 0) {
    return {
      status: 'needs_citizen',
      headline: 'This case cannot move until the missing documents are added.',
      citizenAction: `Upload the missing document${missingDocs.length === 1 ? '' : 's'} and continue the workflow.`,
      departmentAction: 'Wait for the citizen to provide the required documents, then resume review.',
      providerAction: 'No provider action yet.',
      blockers,
      citizenContext,
    };
  }

  if (queueState === 'waiting_on_citizen' || waitingOnParty === 'citizen') {
    return {
      status: 'needs_citizen',
      headline: 'The next move is with the citizen.',
      citizenAction: task.next_action || 'Complete the requested step and send the missing information.',
      departmentAction: 'Monitor for citizen response and resume review as soon as the new information arrives.',
      providerAction: 'No provider action until citizen response is received.',
      blockers,
      citizenContext,
    };
  }

  if (queueState === 'waiting_on_provider' || waitingOnParty === 'provider') {
    return {
      status: 'needs_provider',
      headline: 'The case is waiting on an external provider or institution.',
      citizenAction: 'No new action unless the provider asks for more information.',
      departmentAction: 'Follow up with the provider, confirm status, and update the citizen.',
      providerAction: 'Return booking, payment, approval, or processing status.',
      blockers,
      citizenContext,
    };
  }

  if (task.service_category === 'utilities' && !utilityLookup?.customer_id) {
    return {
      status: 'needs_citizen',
      headline: 'The payment flow is started, but the bill account details are still missing.',
      citizenAction: 'Save the SC number or customer ID first so the bill can be looked up and paid.',
      departmentAction: 'If the citizen is stuck, request the account identifier or a bill photo.',
      providerAction: 'No provider action yet.',
      blockers,
      citizenContext,
    };
  }

  if ((task.workflow_mode === 'appointment' || task.requires_appointment) && !appointmentRequested) {
    return {
      status: 'needs_citizen',
      headline: 'The appointment path has started, but the visit preference is not saved yet.',
      citizenAction: task.next_action || 'Choose the likely department and save the preferred appointment window.',
      departmentAction: 'Guide the citizen to the correct department or booking path if they are unsure.',
      providerAction: 'No provider action until the citizen requests or books the visit.',
      blockers,
      citizenContext,
    };
  }

  if ((task.workflow_mode === 'appointment' || task.requires_appointment) && appointmentRequested && !appointmentBooked) {
    return {
      status: 'needs_citizen',
      headline: 'The visit preference is saved, but the booking or OPD ticket still needs confirmation.',
      citizenAction: 'Complete the hospital booking or collect the OPD ticket, then save the reference on the case.',
      departmentAction: 'If needed, help the citizen verify the correct hospital surface or next booking step.',
      providerAction: 'Provide booking confirmation, token, or appointment time.',
      blockers,
      citizenContext,
    };
  }

  return {
    status: 'needs_department',
    headline: 'The case is active and should move through review or execution now.',
    citizenAction: task.next_action || 'Stay available for follow-up questions and keep receipts or references ready.',
    departmentAction: 'Review the current task state, take the next queue action, and keep the citizen informed.',
    providerAction: 'Respond if the assigned office or provider is asked to confirm the next step.',
    blockers,
    citizenContext,
  };
}
