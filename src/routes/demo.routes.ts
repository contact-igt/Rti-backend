import { Router } from 'express';
import { resetDemo } from '../controllers/demo.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireDemoMode } from '../middleware/require-demo-mode.js';

export const demoRouter = Router();
demoRouter.post('/reset', requireDemoMode, requireAuth, resetDemo);
