import type { RequestHandler } from 'express';
import { getHealthSnapshot } from '../services/health.service.js';

export const health: RequestHandler = async (_req, res, next) => {
  try {
    return res.status(200).json(await getHealthSnapshot());
  } catch (error) {
    return next(error);
  }
};
