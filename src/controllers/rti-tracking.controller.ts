import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { trackApplication } from '../services/rti-application.service.js';

export const trackByRegistrationNumber: RequestHandler = (req, res) => {
  const registrationNumber =
    typeof req.params.registrationNumber === 'string' ? req.params.registrationNumber : '';
  const application = trackApplication(registrationNumber);
  if (!application) {
    return fail(
      res,
      404,
      'APPLICATION_NOT_FOUND',
      'No RTI application was found for this registration number.'
    );
  }

  return res.status(200).json({ data: application, meta: { demo: true } });
};
