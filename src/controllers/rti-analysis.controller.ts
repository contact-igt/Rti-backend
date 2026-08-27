import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { analyseRTIRequestSchema } from '../schemas/rti.js';
import { analyseCitizenProblem } from '../services/rti-analysis.service.js';

export const analyseRTI: RequestHandler = async (req, res, next) => {
  const request = analyseRTIRequestSchema.safeParse(req.body);

  if (!request.success) {
    return fail(
      res,
      400,
      'INVALID_INPUT',
      'Please describe what information you want to obtain.'
    );
  }

  try {
    const result = await analyseCitizenProblem(request.data.problem);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
