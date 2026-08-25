import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';

export const notFound: RequestHandler = (_req, res) =>
  fail(res, 404, 'NOT_FOUND', 'Route not found');
