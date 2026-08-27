import { Router } from 'express';
import { draftFirstAppeal, getAppealGuidance } from '../controllers/rti-appeal.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

export const rtiAppealRouter = Router();
rtiAppealRouter.get('/applications/:id/appeal/guidance', requireAuth, getAppealGuidance);
rtiAppealRouter.post('/applications/:id/appeal/draft', requireAuth, draftFirstAppeal);
