import { createDemoApplications } from '../data/demo-applications.js';
import { applicationStore } from '../stores/application.store.js';
import { sessionStore } from '../stores/session.store.js';
import { paymentProofStore } from '../stores/payment-proof.store.js';
import { setRegistrationSequence } from './rti-application.service.js';

const seedAnchor = new Date();
let initialized = false;

export type DemoStateSummary = {
  reset: boolean;
  applications: number;
  registrationNumbers: string[];
};

export function initializeDemoState(): DemoStateSummary {
  if (!initialized) {
    if (applicationStore.list().length === 0) {
      return resetDemoState();
    }
    setRegistrationSequence(
      maxRegistrationSequence(applicationStore.list().map((item) => item.registrationNumber))
    );
    initialized = true;
  }
  return summary(false);
}

export function resetDemoState(): DemoStateSummary {
  const applications = createDemoApplications(seedAnchor);
  applicationStore.replaceAll(applications);
  setRegistrationSequence(maxRegistrationSequence(applications.map((item) => item.registrationNumber)));
  sessionStore.clear();
  paymentProofStore.clear();
  initialized = true;
  return summary(true);
}

function summary(reset: boolean): DemoStateSummary {
  const applications = applicationStore.list();
  return {
    reset,
    applications: applications.length,
    registrationNumbers: applications
      .map((application) => application.registrationNumber)
      .filter((registrationNumber) => /-00000[12]$/.test(registrationNumber))
      .sort()
  };
}

function maxRegistrationSequence(registrationNumbers: string[]): number {
  return registrationNumbers.reduce((maximum, registrationNumber) => {
    const sequence = Number.parseInt(registrationNumber.match(/-(\d{6})$/)?.[1] ?? '0', 10);
    return Math.max(maximum, sequence);
  }, 0);
}
