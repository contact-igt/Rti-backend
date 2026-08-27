import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { demoCitizen } from '../data/demo-users.js';
import { sessionStore } from '../stores/session.store.js';
import type { DemoSession, DemoUser } from '../types/auth.js';

export type SessionLookup =
  | { status: 'valid'; session: DemoSession; user: DemoUser }
  | { status: 'expired' }
  | { status: 'invalid' };

export function loginDemoUser(email: string, password: string):
  | { success: true; user: DemoUser; session: DemoSession }
  | { success: false } {
  const emailMatches = safeEqual(email.trim().toLowerCase(), demoCitizen.email.toLowerCase());
  const passwordMatches = safeEqual(password, env.DEMO_USER_PASSWORD);
  if (!emailMatches || !passwordMatches || env.DEMO_USER_PASSWORD.length === 0) {
    return { success: false };
  }

  return {
    success: true,
    user: demoCitizen,
    session: sessionStore.create(demoCitizen.id, env.DEMO_SESSION_TTL_MINUTES)
  };
}

export function lookupSession(token: string, now: Date = new Date()): SessionLookup {
  const session = sessionStore.findByToken(token);
  if (!session || session.userId !== demoCitizen.id) {
    return { status: 'invalid' };
  }
  if (Date.parse(session.expiresAt) <= now.getTime()) {
    sessionStore.delete(token);
    return { status: 'expired' };
  }
  return { status: 'valid', session, user: demoCitizen };
}

export function logoutDemoSession(token: string): void {
  sessionStore.delete(token);
}

function safeEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left).digest();
  const rightDigest = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}
