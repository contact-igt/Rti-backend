import { QueryTypes, type Sequelize, type Transaction } from 'sequelize';
import { rtiApplicationSchema } from '../schemas/rti.js';
import type { RTIApplication } from '../types/rti.js';
import {
  InMemoryDemoApplicationStore,
  type ApplicationStore,
  type StoredApplication
} from './application.store.js';

type ApplicationRow = {
  application_json: string | object;
  submission_key: string | null;
};

export class MySqlApplicationStore implements ApplicationStore {
  private readonly memory = new InMemoryDemoApplicationStore();
  private pendingWrite: Promise<void> = Promise.resolve();
  private persistenceError: Error | null = null;

  constructor(private readonly database: Sequelize) {}

  async hydrate(): Promise<number> {
    const rows = await this.database.query<ApplicationRow>(
      `SELECT application_json, submission_key
       FROM rti_applications
       ORDER BY created_at ASC, id ASC`,
      { type: QueryTypes.SELECT }
    );
    const records = rows.map((row) => ({
      application: parseApplication(row.application_json),
      submissionKey: row.submission_key
    }));
    this.memory.replaceStored(records);
    return records.length;
  }

  create(application: RTIApplication, submissionKey: string): RTIApplication {
    const stored = this.memory.create(application, submissionKey);
    this.enqueue((transaction) => this.insert(stored, submissionKey, transaction));
    return stored;
  }

  update(application: RTIApplication): RTIApplication | undefined {
    const stored = this.memory.update(application);
    if (stored) {
      this.enqueue(async (transaction) => {
        const [, affectedRows] = await this.database.query(
          `UPDATE rti_applications
           SET owner_user_id = ?, registration_number = ?, application_json = ?
           WHERE id = ?`,
          {
            replacements: [
              stored.ownerUserId,
              stored.registrationNumber,
              JSON.stringify(stored),
              stored.id
            ],
            transaction
          }
        );
        if (Number(affectedRows) === 0) {
          throw new Error(`Cannot persist missing RTI application ${stored.id}`);
        }
      });
    }
    return stored;
  }

  clear(): void {
    this.memory.clear();
    this.enqueue(async (transaction) => {
      await this.database.query('DELETE FROM rti_applications', { transaction });
    });
  }

  replaceAll(applications: RTIApplication[]): void {
    const stored = applications.map((application) => structuredClone(application));
    this.memory.replaceAll(stored);
    this.enqueue(async (transaction) => {
      await this.database.query('DELETE FROM rti_applications', { transaction });
      for (const application of stored) {
        await this.insert(application, null, transaction);
      }
    });
  }

  findById(id: string): RTIApplication | undefined {
    return this.memory.findById(id);
  }

  findByRegistrationNumber(registrationNumber: string): RTIApplication | undefined {
    return this.memory.findByRegistrationNumber(registrationNumber);
  }

  findBySubmissionKey(submissionKey: string): RTIApplication | undefined {
    return this.memory.findBySubmissionKey(submissionKey);
  }

  list(): RTIApplication[] {
    return this.memory.list();
  }

  listByOwnerUserId(ownerUserId: string): RTIApplication[] {
    return this.memory.listByOwnerUserId(ownerUserId);
  }

  async flush(): Promise<void> {
    await this.pendingWrite;
    if (this.persistenceError) {
      const error = this.persistenceError;
      this.persistenceError = null;
      throw error;
    }
  }

  private enqueue(operation: (transaction: Transaction) => Promise<void>): void {
    this.pendingWrite = this.pendingWrite.then(async () => {
      try {
        await this.database.transaction(operation);
      } catch (error) {
        const persistenceError = toError(error);
        this.persistenceError ??= persistenceError;
        console.error('Failed to persist RTI application state to MySQL.', persistenceError);
      }
    });
  }

  private async insert(
    application: RTIApplication,
    submissionKey: string | null,
    transaction: Transaction
  ): Promise<void> {
    await this.database.query(
      `INSERT INTO rti_applications
       (id, owner_user_id, registration_number, submission_key, application_json)
       VALUES (?, ?, ?, ?, ?)`,
      {
        replacements: [
          application.id,
          application.ownerUserId,
          application.registrationNumber,
          submissionKey,
          JSON.stringify(application)
        ],
        transaction
      }
    );
  }
}

function parseApplication(value: string | object): RTIApplication {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return rtiApplicationSchema.parse(parsed);
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
