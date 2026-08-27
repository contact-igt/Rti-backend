import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { lookupSession } from '../services/demo-auth.service.js';

export const requireAuth: RequestHandler = (req, res, next) => {
  const authorization = req.header('authorization');
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  if (!match?.[1]) {
    return fail(res, 401, 'AUTHENTICATION_REQUIRED', 'A valid demo session is required.');
  }

  const result = lookupSession(match[1]);
  if (result.status === 'expired') {
    return fail(res, 401, 'SESSION_EXPIRED', 'The demo session has expired. Please log in again.');
  }
  if (result.status === 'invalid') {
    return fail(res, 401, 'AUTHENTICATION_REQUIRED', 'A valid demo session is required.');
  }

  req.auth = {
    user: result.user,
    token: result.session.token,
    expiresAt: result.session.expiresAt
  };
  return next();
};
