import { randomUUID } from 'node:crypto';
import { applicationStore } from '../stores/application.store.js';
import {
  rtiApplicationCreateRequestSchema,
  rtiApplicationSchema,
  rtiReceiptSchema
} from '../schemas/rti.js';
import type { RTIApplication, RTIReceipt } from '../types/rti.js';
import type { z } from 'zod';
import { validateSupportedFilingFlow } from './rti-flow-safety.service.js';
import {
  consumeDemoPaymentProof,
  verifyDemoPaymentProof
} from './rti-payment.service.js';

const PROTOTYPE_NOTICE =
  'This is a demonstration acknowledgement. No application has been transmitted to a government system.';

type ApplicationRequest = z.infer<typeof rtiApplicationCreateRequestSchema>;

type ApplicationErrorCode =
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_MISMATCH'
  | 'BPL_PROOF_REQUIRED'
  | 'SUBMISSION_KEY_CONFLICT'
  | 'STATE_FLOW_NOT_SUPPORTED'
  | 'AUTHORITY_NOT_SUPPORTED'
  | 'FILING_VALIDATION_FAILED'
  | 'PAYMENT_PROOF_INVALID'
  | 'PAYMENT_PROOF_EXPIRED'
  | 'PAYMENT_PROOF_USED';

export type ApplicationCreationResult =
  | { success: true; data: { application: RTIApplication; receipt: RTIReceipt } }
  | { success: false; error: { code: ApplicationErrorCode; message: string } };

export type ApplicationListItem = {
  id: string;
  registrationNumber: string;
  subject: string;
  authorityName: string;
  status: RTIApplication['status'];
  submittedAt: string;
};

export type ApplicationTrackingView = {
  applicationId: string;
  registrationNumber: string;
  subject: string;
  authority: Pick<
    RTIApplication['authority'],
    'authorityId' | 'authorityName' | 'jurisdiction'
  >;
  status: RTIApplication['status'];
  submittedAt: string;
  timeline: RTIApplication['timeline'];
  prototype: true;
};

let registrationSequence = 0;

export function setRegistrationSequence(value: number): void {
  registrationSequence = Math.max(0, Math.trunc(value));
}

export function createApplication(
  request: ApplicationRequest,
  ownerUserId: string
): ApplicationCreationResult {
  const existing = applicationStore.findBySubmissionKey(request.submissionKey);
  if (existing) {
    return existing.ownerUserId === ownerUserId
      ? success(existing)
      : {
          success: false,
          error: {
            code: 'SUBMISSION_KEY_CONFLICT',
            message: 'Use a new submission key for this filing.'
          }
        };
  }

  const flowFailure = validateSupportedFilingFlow(request.review.analysis, request.review.authority);
  if (flowFailure) {
    return { success: false, error: flowFailure };
  }

  const expectedFeeStatus = request.review.applicant.bplStatus === 'yes' ? 'bpl_exempt' : 'standard_fee';
  if (request.review.feeStatus !== expectedFeeStatus) {
    return {
      success: false,
      error: {
        code: 'FILING_VALIDATION_FAILED',
        message: 'The filing fee status does not match the server-validated applicant review.'
      }
    };
  }

  const paymentProof = verifyDemoPaymentProof(
    request.paymentProofToken,
    ownerUserId,
    request.review.feeStatus,
    request.payment
  );
  if (!paymentProof.success) {
    return paymentProof;
  }

  const paymentFailure = validatePayment(request);
  if (paymentFailure) {
    return { success: false, error: paymentFailure };
  }

  if (request.review.feeStatus === 'bpl_exempt' && !hasBplProof(request)) {
    return {
      success: false,
      error: {
        code: 'BPL_PROOF_REQUIRED',
        message: 'Add BPL proof before continuing with the fee-exempt filing.'
      }
    };
  }

  const submittedAt = new Date().toISOString();
  const application = rtiApplicationSchema.parse({
    ...request.review,
    id: `app_${randomUUID()}`,
    ownerUserId,
    registrationNumber: nextRegistrationNumber(),
    status: 'submitted',
    payment: request.payment,
    submittedAt,
    timeline: [
      {
        id: `event_${randomUUID()}`,
        status: 'submitted',
        title: 'RTI request prepared',
        description: 'Your demo RTI application has been created in RTI Saathi.',
        occurredAt: submittedAt
      }
    ],
    prototype: true
  });

  const stored = applicationStore.create(application, request.submissionKey);
  if (!consumeDemoPaymentProof(request.paymentProofToken)) {
    throw new Error('Demo payment proof could not be consumed after application creation');
  }
  return success(stored);
}

export function listApplications(ownerUserId: string): ApplicationListItem[] {
  return applicationStore
    .listByOwnerUserId(ownerUserId)
    .map((application, insertionOrder) => ({ application, insertionOrder }))
    .sort(
      (left, right) =>
        Date.parse(right.application.submittedAt) - Date.parse(left.application.submittedAt) ||
        right.insertionOrder - left.insertionOrder
    )
    .map(({ application }) => ({
      id: application.id,
      registrationNumber: application.registrationNumber,
      subject: application.draft.subject,
      authorityName: application.authority.authorityName,
      status: application.status,
      submittedAt: application.submittedAt
    }));
}

export function getOwnedApplicationById(
  id: string,
  ownerUserId: string
): RTIApplication | undefined {
  const application = applicationStore.findById(id.trim());
  return application?.ownerUserId === ownerUserId ? application : undefined;
}

export function trackApplication(registrationNumber: string): ApplicationTrackingView | undefined {
  const application = applicationStore.findByRegistrationNumber(registrationNumber.trim());
  if (!application) {
    return undefined;
  }

  return {
    applicationId: application.id,
    registrationNumber: application.registrationNumber,
    subject: application.draft.subject,
    authority: {
      authorityId: application.authority.authorityId,
      authorityName: application.authority.authorityName,
      jurisdiction: application.authority.jurisdiction
    },
    status: application.status,
    submittedAt: application.submittedAt,
    timeline: application.timeline,
    prototype: application.prototype
  };
}

function validatePayment(
  request: ApplicationRequest
): { code: ApplicationErrorCode; message: string } | null {
  const { feeStatus } = request.review;
  const payment = request.payment;

  if (feeStatus === 'standard_fee') {
    if (payment.status === 'failed') {
      return { code: 'PAYMENT_FAILED', message: 'The demo payment failed. Try again before submitting.' };
    }
    if (payment.status !== 'paid') {
      return { code: 'PAYMENT_REQUIRED', message: 'Complete the demo payment before submitting.' };
    }
    if (
      payment.amountPaise !== 1000 ||
      payment.mode === 'bpl_exempt' ||
      !payment.transactionId ||
      !payment.paidAt
    ) {
      return { code: 'PAYMENT_MISMATCH', message: 'The demo payment does not match the standard filing fee.' };
    }
    return null;
  }

  if (
    payment.status !== 'not_required' ||
    payment.amountPaise !== 0 ||
    payment.mode !== 'bpl_exempt' ||
    payment.transactionId !== null ||
    payment.paidAt !== null
  ) {
    return { code: 'PAYMENT_MISMATCH', message: 'The payment does not match the BPL-exempt filing.' };
  }

  return null;
}

function hasBplProof(request: ApplicationRequest): boolean {
  return request.review.documents.some((document) => {
    const metadata = `${document.fileName} ${document.purpose ?? ''}`;
    return /\b(bpl|below poverty)\b/i.test(metadata);
  });
}

function nextRegistrationNumber(): string {
  const year = new Date().getUTCFullYear();
  let registrationNumber: string;
  do {
    registrationSequence += 1;
    registrationNumber = `RTISAATHI-DEMO-${year}-${registrationSequence.toString().padStart(6, '0')}`;
  } while (applicationStore.findByRegistrationNumber(registrationNumber));
  return registrationNumber;
}

function createReceipt(application: RTIApplication): RTIReceipt {
  return rtiReceiptSchema.parse({
    registrationNumber: application.registrationNumber,
    applicationId: application.id,
    authorityName: application.authority.authorityName,
    submittedAt: application.submittedAt,
    payment: {
      status: application.payment.status,
      amountPaise: application.payment.amountPaise,
      transactionId: application.payment.transactionId
    },
    status: 'submitted',
    prototypeNotice: PROTOTYPE_NOTICE
  });
}

function success(application: RTIApplication): ApplicationCreationResult {
  return {
    success: true,
    data: { application, receipt: createReceipt(application) }
  };
}
