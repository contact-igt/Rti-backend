import { Router } from 'express';
import { analyseRTI } from '../controllers/rti-analysis.controller.js';

export const rtiAnalysisRouter = Router();
rtiAnalysisRouter.post('/analyse', analyseRTI);
