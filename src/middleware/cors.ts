import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { fail } from '../lib/api-response.js';

const ALLOWED_METHODS = 'GET,POST,OPTIONS';
const ALLOWED_HEADERS = 'Authorization,Content-Type';

export const corsPolicy: RequestHandler = (req, res, next) => {
  const origin = req.header('origin');
  const configuredOrigin = env.FRONTEND_ORIGIN ?? env.FRONTEND_URL;
  if (!origin) {
    return next();
  }

  if (!configuredOrigin || origin !== configuredOrigin) {
    return fail(res, 403, 'CORS_ORIGIN_DENIED', 'This origin is not permitted.');
  }

  res.setHeader('Access-Control-Allow-Origin', configuredOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.setHeader('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  return next();
};
