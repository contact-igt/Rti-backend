import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { rtiApplicantSchema, rtiFilingReviewRequestSchema } from '../schemas/rti.js';
import { buildFilingReview, validateApplicantRules } from '../services/rti-review.service.js';
import { validateSupportedFilingFlow } from '../services/rti-flow-safety.service.js';

export const validateApplicant: RequestHandler = (req, res) => {
  const applicant = rtiApplicantSchema.safeParse(req.body);
  if (!applicant.success) {
    return fail(res, 400, 'INVALID_INPUT', 'Please provide valid applicant details.');
  }

  const ruleFailure = validateApplicantRules(applicant.data);
  if (ruleFailure) {
    return fail(res, 422, ruleFailure.code, ruleFailure.message);
  }

  return res.status(200).json({ data: applicant.data });
};

export const reviewFiling: RequestHandler = (req, res) => {
  const request = rtiFilingReviewRequestSchema.safeParse(req.body);
  if (!request.success) {
    return fail(res, 400, 'INVALID_INPUT', 'Please provide a valid RTI filing review payload.');
  }

  const flowFailure = validateSupportedFilingFlow(request.data.analysis, request.data.authority);
  if (flowFailure) {
    return fail(res, 422, flowFailure.code, flowFailure.message);
  }

  const result = buildFilingReview(request.data);
  if (!result.success) {
    return fail(res, 422, result.error.code, result.error.message);
  }

  return res.status(200).json({ data: result.data });
};
