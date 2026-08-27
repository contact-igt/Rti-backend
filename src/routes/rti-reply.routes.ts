import { Router } from 'express';
import { analyseReply, attachReply } from '../controllers/rti-reply.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

export const rtiReplyRouter = Router();
rtiReplyRouter.post('/applications/:id/reply', requireAuth, attachReply);
rtiReplyRouter.post('/applications/:id/reply/analyse', requireAuth, analyseReply);
