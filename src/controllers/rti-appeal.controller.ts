import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { firstAppealDraftRequestSchema } from '../schemas/rti.js';
import { generateFirstAppealDraft } from '../services/rti-appeal-draft.service.js';
import { getFirstAppealGuidance } from '../services/rti-appeal-guidance.service.js';

export const getAppealGuidance: RequestHandler = (req, res) => {
  const result = getFirstAppealGuidance(
    singleParameter(req.params.id),
    req.auth?.user.id ?? ''
  );
  if (!result.success) {
    return fail(
      res,
      result.error.code === 'APPLICATION_NOT_FOUND' ? 404 : 422,
      result.error.code,
      result.error.message
    );
  }
  return res.status(200).json({ data: result.data, meta: { demo: true } });
};

export const draftFirstAppeal: RequestHandler = async (req, res, next) => {
  const request = firstAppealDraftRequestSchema.safeParse(req.body ?? {});
  if (!request.success) {
    return fail(res, 400, 'INVALID_INPUT', 'Please provide valid optional citizen notes.');
  }

  try {
    const result = await generateFirstAppealDraft(
      singleParameter(req.params.id),
      req.auth?.user.id ?? '',
      request.data
    );
    if (!result.success) {
      return fail(
        res,
        result.error.code === 'APPLICATION_NOT_FOUND' ? 404 : 422,
        result.error.code,
        result.error.message
      );
    }
    return res.status(200).json({ data: result.data, meta: result.meta });
  } catch (error) {
    return next(error);
  }
};

function singleParameter(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}
