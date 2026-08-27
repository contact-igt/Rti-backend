import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { rtiDraftRequestSchema } from '../schemas/rti.js';
import { generateRTIDraft } from '../services/rti-draft.service.js';
import { validateSupportedFilingFlow } from '../services/rti-flow-safety.service.js';

export const draftRTI: RequestHandler = async (req, res, next) => {
  const request = rtiDraftRequestSchema.safeParse(req.body);

  if (!request.success) {
    return fail(res, 400, 'INVALID_INPUT', 'Please provide a valid problem, analysis, and authority.');
  }

  const flowFailure = validateSupportedFilingFlow(request.data.analysis, request.data.authority);
  if (flowFailure) {
    return fail(res, 422, flowFailure.code, flowFailure.message);
  }

  try {
    const result = await generateRTIDraft(request.data);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
