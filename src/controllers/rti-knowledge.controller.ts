import type { RequestHandler } from 'express';
import { fail } from '../lib/api-response.js';
import { rtiKnowledgeRequestSchema } from '../schemas/rti-knowledge.js';
import { answerRTIKnowledgeQuestion } from '../services/rti-knowledge.service.js';

export const askRTIKnowledge: RequestHandler = async (req, res, next) => {
  const request = rtiKnowledgeRequestSchema.safeParse(req.body);
  if (!request.success) {
    return fail(res, 400, 'INVALID_INPUT', 'Please provide a valid RTI question.');
  }

  try {
    const result = await answerRTIKnowledgeQuestion(request.data);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
