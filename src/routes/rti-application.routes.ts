import { Router } from 'express';
import {
  getApplication,
  getApplications,
  submitApplication
} from '../controllers/rti-application.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

export const rtiApplicationRouter = Router();
rtiApplicationRouter.get('/applications', requireAuth, getApplications);
rtiApplicationRouter.get('/applications/:id', requireAuth, getApplication);
rtiApplicationRouter.post('/applications', requireAuth, submitApplication);
