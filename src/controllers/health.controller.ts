import type { RequestHandler } from 'express';
import { ok } from '../lib/api-response.js';
import { checkDatabase } from '../services/health.service.js';

export const health: RequestHandler = async (_req, res, next) => {
  try {
    const database = await checkDatabase();
    return ok(res, { status: 'ok', database });
  } catch (error) {
    return next(error);
  }
};
