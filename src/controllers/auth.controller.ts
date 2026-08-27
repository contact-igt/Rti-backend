import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { loginRequestSchema } from '../schemas/auth.js';
import { loginDemoUser, logoutDemoSession } from '../services/demo-auth.service.js';

export const login: RequestHandler = (req, res) => {
  const request = loginRequestSchema.safeParse(req.body);
  if (!request.success) {
    return fail(res, 400, 'INVALID_INPUT', 'Please provide a valid email and password.');
  }

  const result = loginDemoUser(request.data.email, request.data.password);
  if (!result.success) {
    return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  return res.status(200).json({
    data: {
      user: result.user,
      session: { token: result.session.token, expiresAt: result.session.expiresAt }
    },
    meta: { demo: true }
  });
};

export const getSession: RequestHandler = (req, res) => {
  return res.status(200).json({
    data: {
      authenticated: true,
      user: req.auth?.user,
      expiresAt: req.auth?.expiresAt
    },
    meta: { demo: true }
  });
};

export const logout: RequestHandler = (req, res) => {
  if (req.auth) {
    logoutDemoSession(req.auth.token);
  }
  return res.status(200).json({ data: { loggedOut: true }, meta: { demo: true } });
};
