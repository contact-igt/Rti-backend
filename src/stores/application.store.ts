import type { RTIApplication } from '../types/rti.js';

export type StoredApplication = {
  application: RTIApplication;
  submissionKey: string | null;
};

export interface ApplicationStore {
  create(application: RTIApplication, submissionKey: string): RTIApplication;
  update(application: RTIApplication): RTIApplication | undefined;
  clear(): void;
  replaceAll(applications: RTIApplication[]): void;
  findById(id: string): RTIApplication | undefined;
  findByRegistrationNumber(registrationNumber: string): RTIApplication | undefined;
  findBySubmissionKey(submissionKey: string): RTIApplication | undefined;
  list(): RTIApplication[];
  listByOwnerUserId(ownerUserId: string): RTIApplication[];
}

export class InMemoryDemoApplicationStore implements ApplicationStore {
  private readonly byId = new Map<string, RTIApplication>();
  private readonly idByRegistrationNumber = new Map<string, string>();
  private readonly idBySubmissionKey = new Map<string, string>();

  create(application: RTIApplication, submissionKey: string): RTIApplication {
    const stored = structuredClone(application);
    if (this.byId.has(stored.id) || this.idByRegistrationNumber.has(stored.registrationNumber)) {
      throw new Error('Application ID or registration number already exists');
    }
    this.byId.set(stored.id, stored);
    this.idByRegistrationNumber.set(stored.registrationNumber, stored.id);
    this.idBySubmissionKey.set(submissionKey, stored.id);
    return structuredClone(stored);
  }

  update(application: RTIApplication): RTIApplication | undefined {
    const current = this.byId.get(application.id);
    if (!current) {
      return undefined;
    }

    const stored = structuredClone(application);
    const conflictingId = this.idByRegistrationNumber.get(stored.registrationNumber);
    if (conflictingId && conflictingId !== stored.id) {
      throw new Error('Registration number already exists');
    }
    if (current.registrationNumber !== stored.registrationNumber) {
      this.idByRegistrationNumber.delete(current.registrationNumber);
    }
    this.byId.set(stored.id, stored);
    this.idByRegistrationNumber.set(stored.registrationNumber, stored.id);
    return structuredClone(stored);
  }

  clear(): void {
    this.byId.clear();
    this.idByRegistrationNumber.clear();
    this.idBySubmissionKey.clear();
  }

  replaceAll(applications: RTIApplication[]): void {
    this.replaceStored(applications.map((application) => ({ application, submissionKey: null })));
  }

  replaceStored(records: StoredApplication[]): void {
    const copies = records.map(({ application, submissionKey }) => ({
      application: structuredClone(application),
      submissionKey
    }));
    const ids = new Set(copies.map(({ application }) => application.id));
    const registrations = new Set(copies.map(({ application }) => application.registrationNumber));
    const submissionKeys = copies
      .map(({ submissionKey }) => submissionKey)
      .filter((submissionKey): submissionKey is string => submissionKey !== null);
    if (ids.size !== copies.length || registrations.size !== copies.length) {
      throw new Error('Demo applications must have unique IDs and registration numbers');
    }
    if (new Set(submissionKeys).size !== submissionKeys.length) {
      throw new Error('Application submission keys must be unique');
    }

    this.clear();
    for (const { application, submissionKey } of copies) {
      this.byId.set(application.id, application);
      this.idByRegistrationNumber.set(application.registrationNumber, application.id);
      if (submissionKey) {
        this.idBySubmissionKey.set(submissionKey, application.id);
      }
    }
  }

  findById(id: string): RTIApplication | undefined {
    return this.clone(this.byId.get(id));
  }

  findByRegistrationNumber(registrationNumber: string): RTIApplication | undefined {
    const id = this.idByRegistrationNumber.get(registrationNumber);
    return id ? this.findById(id) : undefined;
  }

  findBySubmissionKey(submissionKey: string): RTIApplication | undefined {
    const id = this.idBySubmissionKey.get(submissionKey);
    return id ? this.findById(id) : undefined;
  }

  list(): RTIApplication[] {
    return [...this.byId.values()].map((application) => structuredClone(application));
  }

  listByOwnerUserId(ownerUserId: string): RTIApplication[] {
    return this.list().filter((application) => application.ownerUserId === ownerUserId);
  }

  private clone(application: RTIApplication | undefined): RTIApplication | undefined {
    return application ? structuredClone(application) : undefined;
  }
}

class ApplicationStoreFacade implements ApplicationStore {
  private delegate: ApplicationStore = new InMemoryDemoApplicationStore();

  use(store: ApplicationStore): void {
    this.delegate = store;
  }

  create(application: RTIApplication, submissionKey: string): RTIApplication {
    return this.delegate.create(application, submissionKey);
  }

  update(application: RTIApplication): RTIApplication | undefined {
    return this.delegate.update(application);
  }

  clear(): void {
    this.delegate.clear();
  }

  replaceAll(applications: RTIApplication[]): void {
    this.delegate.replaceAll(applications);
  }

  findById(id: string): RTIApplication | undefined {
    return this.delegate.findById(id);
  }

  findByRegistrationNumber(registrationNumber: string): RTIApplication | undefined {
    return this.delegate.findByRegistrationNumber(registrationNumber);
  }

  findBySubmissionKey(submissionKey: string): RTIApplication | undefined {
    return this.delegate.findBySubmissionKey(submissionKey);
  }

  list(): RTIApplication[] {
    return this.delegate.list();
  }

  listByOwnerUserId(ownerUserId: string): RTIApplication[] {
    return this.delegate.listByOwnerUserId(ownerUserId);
  }
}

export const applicationStore = new ApplicationStoreFacade();

export function useApplicationStore(store: ApplicationStore): void {
  applicationStore.use(store);
}
