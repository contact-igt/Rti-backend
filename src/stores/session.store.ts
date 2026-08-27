import { randomBytes } from 'node:crypto';
import { demoSessionSchema } from '../schemas/auth.js';
import type { DemoSession } from '../types/auth.js';

export class InMemoryDemoSessionStore {
  private readonly sessions = new Map<string, DemoSession>();

  create(userId: string, ttlMinutes: number, now: Date = new Date()): DemoSession {
    const session = demoSessionSchema.parse({
      token: randomBytes(32).toString('base64url'),
      userId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString()
    });
    this.sessions.set(session.token, session);
    return structuredClone(session);
  }

  findByToken(token: string): DemoSession | undefined {
    const session = this.sessions.get(token);
    return session ? structuredClone(session) : undefined;
  }

  delete(token: string): boolean {
    return this.sessions.delete(token);
  }

  clear(): void {
    this.sessions.clear();
  }

  deleteExpired(now: Date = new Date()): void {
    for (const [token, session] of this.sessions) {
      if (Date.parse(session.expiresAt) <= now.getTime()) {
        this.sessions.delete(token);
      }
    }
  }
}

export const sessionStore = new InMemoryDemoSessionStore();
