import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { demoPaymentRequestSchema, demoPaymentSchema } from '../schemas/rti.js';
import { paymentProofStore } from '../stores/payment-proof.store.js';
import type { DemoPayment, FilingFeeStatus } from '../types/rti.js';
import type { z } from 'zod';

type PaymentRequest = z.infer<typeof demoPaymentRequestSchema>;

export type PaymentResult =
  | {
      success: true;
      data: { payment: DemoPayment; paymentProofToken: string; expiresAt: string };
    }
  | {
      success: false;
      error: { code: 'PAYMENT_MISMATCH'; message: string };
    };

export function createDemoPayment(request: PaymentRequest, ownerUserId: string): PaymentResult {
  if (request.feeStatus === 'bpl_exempt') {
    if (request.mode !== 'bpl_exempt') {
      return mismatch('Use the BPL-exempt payment mode for this fee-exempt filing.');
    }

    return issuedProof(ownerUserId, request.feeStatus, demoPaymentSchema.parse({
        status: 'not_required',
        amountPaise: 0,
        mode: 'bpl_exempt',
        transactionId: null,
        paidAt: null
      }));
  }

  if (request.mode === 'bpl_exempt') {
    return mismatch('Select a demo payment mode for the standard filing fee.');
  }

  if (request.simulateFailure) {
    return issuedProof(ownerUserId, request.feeStatus, demoPaymentSchema.parse({
        status: 'failed',
        amountPaise: 1000,
        mode: request.mode,
        transactionId: null,
        paidAt: null
      }));
  }

  const paidAt = new Date();
  return issuedProof(ownerUserId, request.feeStatus, demoPaymentSchema.parse({
      status: 'paid',
      amountPaise: 1000,
      mode: request.mode,
      transactionId: demoTransactionId(paidAt),
      paidAt: paidAt.toISOString()
    }));
}

export type PaymentProofVerification =
  | { success: true }
  | {
      success: false;
      error: {
        code: 'PAYMENT_PROOF_INVALID' | 'PAYMENT_PROOF_EXPIRED' | 'PAYMENT_PROOF_USED';
        message: string;
      };
    };

export function verifyDemoPaymentProof(
  token: string,
  ownerUserId: string,
  feeStatus: FilingFeeStatus,
  payment: DemoPayment
): PaymentProofVerification {
  const lookup = paymentProofStore.lookup(token);
  if (lookup.status === 'expired') {
    return proofFailure('PAYMENT_PROOF_EXPIRED', 'The demo payment proof has expired. Create a new demo payment.');
  }
  if (lookup.status === 'used') {
    return proofFailure('PAYMENT_PROOF_USED', 'The demo payment proof has already been used.');
  }
  if (lookup.status === 'invalid') {
    return proofFailure(
      'PAYMENT_PROOF_INVALID',
      'The application does not match a server-issued demo payment proof.'
    );
  }
  if (
    lookup.proof.ownerUserId !== ownerUserId ||
    lookup.proof.feeStatus !== feeStatus ||
    !paymentsMatch(lookup.proof.payment, payment)
  ) {
    return proofFailure('PAYMENT_PROOF_INVALID', 'The application does not match a server-issued demo payment proof.');
  }
  return { success: true };
}

export function consumeDemoPaymentProof(token: string): boolean {
  return paymentProofStore.consume(token);
}

function issuedProof(
  ownerUserId: string,
  feeStatus: FilingFeeStatus,
  payment: DemoPayment
): PaymentResult {
  const proof = paymentProofStore.create(
    ownerUserId,
    feeStatus,
    payment,
    env.DEMO_PAYMENT_PROOF_TTL_MINUTES
  );
  return {
    success: true,
    data: { payment, paymentProofToken: proof.token, expiresAt: proof.expiresAt }
  };
}

function paymentsMatch(left: DemoPayment, right: DemoPayment): boolean {
  return (
    left.status === right.status &&
    left.amountPaise === right.amountPaise &&
    left.mode === right.mode &&
    left.transactionId === right.transactionId &&
    left.paidAt === right.paidAt
  );
}

function proofFailure(
  code: 'PAYMENT_PROOF_INVALID' | 'PAYMENT_PROOF_EXPIRED' | 'PAYMENT_PROOF_USED',
  message: string
): PaymentProofVerification {
  return { success: false, error: { code, message } };
}

function demoTransactionId(date: Date): string {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = randomBytes(3).toString('hex').toUpperCase();
  return `DEMO-PAY-${datePart}-${randomPart}`;
}

function mismatch(message: string): PaymentResult {
  return { success: false, error: { code: 'PAYMENT_MISMATCH', message } };
}
