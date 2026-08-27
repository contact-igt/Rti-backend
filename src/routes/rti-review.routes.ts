import { Router } from 'express';
import { reviewFiling, validateApplicant } from '../controllers/rti-review.controller.js';

export const rtiReviewRouter = Router();
rtiReviewRouter.post('/applicant/validate', validateApplicant);
rtiReviewRouter.post('/review', reviewFiling);
