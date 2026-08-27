import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { rtiApplicationCreateRequestSchema } from '../schemas/rti.js';
import {
  createApplication,
  getOwnedApplicationById,
  listApplications
} from '../services/rti-application.service.js';

export const submitApplication: RequestHandler = (req, res) => {
  const request = rtiApplicationCreateRequestSchema.safeParse(req.body);
  if (!request.success) {
    return fail(res, 400, 'INVALID_INPUT', 'Please provide a valid application submission.');
  }

  const result = createApplication(request.data, req.auth?.user.id ?? '');
  if (!result.success) {
    return fail(res, 422, result.error.code, result.error.message);
  }

  return res.status(200).json({ data: result.data, meta: { demo: true } });
};

export const getApplications: RequestHandler = (req, res) => {
  const applications = listApplications(req.auth?.user.id ?? '');
  return res.status(200).json({ data: applications, meta: { count: applications.length } });
};

export const getApplication: RequestHandler = (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const application = getOwnedApplicationById(id, req.auth?.user.id ?? '');
  if (!application) {
    return fail(res, 404, 'APPLICATION_NOT_FOUND', 'RTI application not found.');
  }

  return res.status(200).json({ data: application });
};
