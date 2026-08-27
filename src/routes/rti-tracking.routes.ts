import { Router } from 'express';
import { trackByRegistrationNumber } from '../controllers/rti-tracking.controller.js';

export const rtiTrackingRouter = Router();
rtiTrackingRouter.get('/track/:registrationNumber', trackByRegistrationNumber);
