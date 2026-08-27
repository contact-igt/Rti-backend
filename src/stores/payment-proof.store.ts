import { randomBytes } from 'node:crypto';
import type { DemoPayment, FilingFeeStatus } from '../types/rti.js';

type PaymentProof = {
  token: string;
  ownerUserId: string;
  feeStatus: FilingFeeStatus;
  payment: DemoPayment;
  expiresAt: string;
  usedAt: string | null;
};

export type PaymentProofLookup =
  | { status: 'valid'; proof: PaymentProof }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'used' };

export class InMemoryPaymentProofStore {
  private readonly proofs = new Map<string, PaymentProof>();

  create(
    ownerUserId: string,
    feeStatus: FilingFeeStatus,
    payment: DemoPayment,
    ttlMinutes: number,
    now: Date = new Date()
  ): PaymentProof {
    this.deleteExpired(now);
    const proof: PaymentProof = {
      token: randomBytes(32).toString('base64url'),
      ownerUserId,
      feeStatus,
      payment: structuredClone(payment),
      expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
      usedAt: null
    };
    this.proofs.set(proof.token, proof);
    return structuredClone(proof);
  }

  lookup(token: string, now: Date = new Date()): PaymentProofLookup {
    const proof = this.proofs.get(token);
    if (!proof) return { status: 'invalid' };
    if (proof.usedAt) return { status: 'used' };
    if (Date.parse(proof.expiresAt) <= now.getTime()) {
      this.proofs.delete(token);
      return { status: 'expired' };
    }
    return { status: 'valid', proof: structuredClone(proof) };
  }

  consume(token: string, now: Date = new Date()): boolean {
    const proof = this.proofs.get(token);
    if (!proof || proof.usedAt || Date.parse(proof.expiresAt) <= now.getTime()) return false;
    proof.usedAt = now.toISOString();
    return true;
  }

  clear(): void {
    this.proofs.clear();
  }

  private deleteExpired(now: Date): void {
    for (const [token, proof] of this.proofs) {
      if (Date.parse(proof.expiresAt) <= now.getTime()) this.proofs.delete(token);
    }
  }
}

export const paymentProofStore = new InMemoryPaymentProofStore();
