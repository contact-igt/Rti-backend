import { Router } from 'express';
import { draftRTI } from '../controllers/rti-draft.controller.js';

export const rtiDraftRouter = Router();
rtiDraftRouter.post('/draft', draftRTI);
