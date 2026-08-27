import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';
import { fail } from '../lib/api-response.js';

type ExpressBodyError = Error & { status?: number; type?: string };

export const errorHandler: ErrorRequestHandler = (error: ExpressBodyError, req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    return fail(res, 400, 'INVALID_INPUT', 'The request body contains malformed JSON.');
  }
  if (error.type === 'entity.too.large' || error.status === 413) {
    return fail(res, 413, 'REQUEST_TOO_LARGE', 'The JSON request body is too large.');
  }

  if (env.NODE_ENV === 'development') {
    console.error(`${req.method} ${req.path} failed: ${error.name}: ${error.message}`);
  } else {
    console.error(`${req.method} ${req.path} failed with an unexpected server error.`);
  }
  return fail(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
};
