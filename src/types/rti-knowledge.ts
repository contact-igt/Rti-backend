import type { z } from 'zod';
import type {
  rtiKnowledgeAnswerSchema,
  rtiKnowledgeModelAnswerSchema,
  rtiKnowledgeRequestSchema,
  rtiKnowledgeSourceSchema
} from '../schemas/rti-knowledge.js';

export type RTIKnowledgeRequest = z.infer<typeof rtiKnowledgeRequestSchema>;
export type RTIKnowledgeSource = z.infer<typeof rtiKnowledgeSourceSchema>;
export type RTIKnowledgeAnswer = z.infer<typeof rtiKnowledgeAnswerSchema>;
export type RTIKnowledgeModelAnswer = z.infer<typeof rtiKnowledgeModelAnswerSchema>;

export type RTIKnowledgeResult = {
  data: RTIKnowledgeAnswer;
  meta: {
    source: 'rag' | 'fallback';
    degraded: boolean;
  };
};
