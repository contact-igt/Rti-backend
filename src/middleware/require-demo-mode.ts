import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { fail } from '../lib/api-response.js';

export const requireDemoMode: RequestHandler = (_req, res, next) => {
  if (!env.DEMO_MODE) {
    return fail(res, 403, 'DEMO_MODE_REQUIRED', 'This endpoint is available only in demo mode.');
  }
  return next();
};
