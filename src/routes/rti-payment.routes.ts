import { Router } from 'express';
import { makeDemoPayment } from '../controllers/rti-payment.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

export const rtiPaymentRouter = Router();
rtiPaymentRouter.post('/payment', requireAuth, makeDemoPayment);
