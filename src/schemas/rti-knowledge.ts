import { z } from 'zod';

export const rtiKnowledgeRequestSchema = z.object({
  question: z.string().trim().min(5).max(2_000),
  jurisdiction: z.enum(['central', 'state', 'unknown']).nullable().optional().default(null),
  context: z
    .enum(['general', 'filing', 'tracking', 'reply', 'appeal'])
    .nullable()
    .optional()
    .default(null)
});

export const rtiKnowledgeSourceSchema = z.object({
  fileId: z.string().min(1),
  filename: z.string().min(1),
  score: z.number().min(0).max(1).nullable(),
  excerpt: z.string().max(400).nullable()
});

export const rtiKnowledgeAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(4_000),
  confidence: z.enum(['high', 'medium', 'low']),
  grounded: z.boolean(),
  sources: z.array(rtiKnowledgeSourceSchema).max(5),
  limitations: z.array(z.string().trim().min(1).max(500)).max(5),
  disclaimer: z.string().trim().min(1).max(500)
});

export const rtiKnowledgeModelAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(4_000),
  supported: z.boolean(),
  limitations: z.array(z.string().trim().min(1).max(500)).max(5)
});
