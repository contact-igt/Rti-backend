import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { governmentReplyRequestSchema } from '../schemas/rti.js';
import { analyseApplicationReply } from '../services/rti-reply-analysis.service.js';
import { attachDemoReply } from '../services/rti-reply.service.js';

export const attachReply: RequestHandler = (req, res) => {
  const request = governmentReplyRequestSchema.safeParse(req.body);
  if (!request.success) {
    return fail(res, 400, 'INVALID_INPUT', 'Please provide a valid demo reply.');
  }

  const applicationId = singleParameter(req.params.id);
  const result = attachDemoReply(applicationId, req.auth?.user.id ?? '', request.data);
  if (!result.success) {
    return fail(res, 404, result.error.code, result.error.message);
  }

  return res.status(200).json({ data: result.data, meta: { demo: true } });
};

export const analyseReply: RequestHandler = async (req, res, next) => {
  try {
    const result = await analyseApplicationReply(
      singleParameter(req.params.id),
      req.auth?.user.id ?? ''
    );
    if (!result.success) {
      return fail(res, result.error.code === 'APPLICATION_NOT_FOUND' ? 404 : 422, result.error.code, result.error.message);
    }
    return res.status(200).json({ data: result.data, meta: result.meta });
  } catch (error) {
    return next(error);
  }
};

function singleParameter(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}
