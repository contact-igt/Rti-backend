import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { fail } from '../lib/api-response.js';

type AttemptWindow = { count: number; resetAt: number };
const attempts = new Map<string, AttemptWindow>();

export const loginRateLimit: RequestHandler = (req, res, next) => {
  const now = Date.now();
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'unknown';
  const key = `${req.ip ?? req.socket.remoteAddress ?? 'unknown'}:${email}`;
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + env.LOGIN_RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (current.count >= env.LOGIN_RATE_LIMIT_MAX) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((current.resetAt - now) / 1000)).toString());
    return fail(res, 429, 'TOO_MANY_ATTEMPTS', 'Too many login attempts. Please try again later.');
  }

  current.count += 1;
  return next();
};

export function clearLoginRateLimits(): void {
  attempts.clear();
}
