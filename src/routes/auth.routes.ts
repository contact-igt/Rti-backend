import { Router } from 'express';
import { getSession, login, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireDemoMode } from '../middleware/require-demo-mode.js';
import { loginRateLimit } from '../middleware/login-rate-limit.js';

export const authRouter = Router();
authRouter.post('/login', requireDemoMode, loginRateLimit, login);
authRouter.get('/session', requireDemoMode, requireAuth, getSession);
authRouter.post('/logout', requireDemoMode, requireAuth, logout);
