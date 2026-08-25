import type { ErrorRequestHandler } from 'express';
import { fail } from '../lib/api-response.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  return fail(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
};
