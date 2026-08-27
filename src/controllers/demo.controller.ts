import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { fail } from '../lib/api-response.js';
import { resetDemoState } from '../services/demo-state.service.js';

export const resetDemo: RequestHandler = (_req, res) => {
  if (!env.DEMO_MODE) {
    return fail(res, 403, 'DEMO_MODE_REQUIRED', 'Demo reset is available only when demo mode is enabled.');
  }

  return res.status(200).json({ data: resetDemoState(), meta: { demo: true } });
};
