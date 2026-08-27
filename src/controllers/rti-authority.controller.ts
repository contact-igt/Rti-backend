import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { authorityRequestSchema } from '../schemas/rti.js';
import { resolveAuthority } from '../services/rti-authority.service.js';

export const recommendAuthority: RequestHandler = (req, res) => {
  const request = authorityRequestSchema.safeParse(req.body);

  if (!request.success) {
    return fail(res, 400, 'INVALID_INPUT', 'Please provide a valid RTI analysis.');
  }

  const jurisdiction = request.data.jurisdictionAnswer ?? request.data.analysis.jurisdiction;
  if (jurisdiction === 'state' && request.data.state) {
    return fail(
      res,
      422,
      'STATE_FLOW_NOT_SUPPORTED',
      'State RTI authority coverage is not yet verified for filing in this release.'
    );
  }

  const data = resolveAuthority(request.data);
  return res.status(200).json({
    data,
    meta: { source: 'curated_matcher', degraded: false }
  });
};
