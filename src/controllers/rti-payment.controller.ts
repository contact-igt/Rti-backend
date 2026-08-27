import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { demoPaymentRequestSchema } from '../schemas/rti.js';
import { createDemoPayment } from '../services/rti-payment.service.js';

export const makeDemoPayment: RequestHandler = (req, res) => {
  const request = demoPaymentRequestSchema.safeParse(req.body);
  if (!request.success) {
    return fail(res, 400, 'INVALID_INPUT', 'Please provide a valid demo payment request.');
  }

  const result = createDemoPayment(request.data, req.auth?.user.id ?? '');
  if (!result.success) {
    return fail(res, 422, result.error.code, result.error.message);
  }

  return res.status(200).json({ data: result.data, meta: { demo: true } });
};
