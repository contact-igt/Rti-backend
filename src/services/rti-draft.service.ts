import { zodTextFormat } from 'openai/helpers/zod';
import { env } from '../config/env.js';
import { openaiClient } from '../lib/ai/client.js';
import { createFallbackDraft, jurisdictionWarning } from '../lib/ai/fallback.js';
import { rtiDraftRequestSchema, rtiDraftSchema } from '../schemas/rti.js';
import type { RTIDraft } from '../types/rti.js';
import type { z } from 'zod';

const MAX_DRAFT_CONTENT_LENGTH = 2800;

const DRAFT_INSTRUCTIONS = `You help Indian citizens prepare a concise, editable request for information under a Right to Information workflow.
Use only the citizen's description, validated analysis, and citizen-selected authority.
Seek identifiable existing records such as status, dates, documents, file movement, file notes, orders, communications, action-taken records, recorded reasons, and recorded names or designations.
Do not provide legal advice, accuse officials, invent facts or identifiers, change the selected authority, request new opinions, or write a grievance letter.
Keep one subject, use plain respectful language, and produce 3 to 7 focused questions.`;

type DraftRequest = z.infer<typeof rtiDraftRequestSchema>;

export type RTIDraftResult = {
  data: RTIDraft;
  meta: {
    source: 'ai' | 'fallback';
    degraded: boolean;
  };
};

export async function generateRTIDraft(request: DraftRequest): Promise<RTIDraftResult> {
  if (!openaiClient || !env.OPENAI_MODEL) {
    return fallbackResult(request);
  }

  try {
    const response = await openaiClient.responses.parse({
      model: env.OPENAI_MODEL,
      instructions: DRAFT_INSTRUCTIONS,
      input: JSON.stringify(request),
      text: {
        format: zodTextFormat(rtiDraftSchema, 'rti_draft')
      }
    });

    if (!response.output_parsed) {
      throw new Error('RTI draft output was incomplete');
    }

    const draft = rtiDraftSchema.parse(response.output_parsed);
    if (draft.authorityId !== request.authority.authorityId) {
      throw new Error('RTI draft did not preserve selected authority');
    }

    return {
      data: finalizeDraft(draft, request),
      meta: { source: 'ai', degraded: false }
    };
  } catch {
    console.warn('RTI draft provider failed; using fallback.');
    return fallbackResult(request);
  }
}

function fallbackResult(request: DraftRequest): RTIDraftResult {
  const draft = createFallbackDraft(request.analysis, request.authority);
  return {
    data: finalizeDraft(draft, request),
    meta: { source: 'fallback', degraded: true }
  };
}

function finalizeDraft(draft: RTIDraft, request: DraftRequest): RTIDraft {
  const warnings = [...new Set([...draft.warnings, ...jurisdictionWarning(request.analysis, request.authority)])];
  const validated = rtiDraftSchema.parse({ ...draft, authorityId: request.authority.authorityId, warnings });

  if (draftContentLength(validated) <= MAX_DRAFT_CONTENT_LENGTH) {
    return validated;
  }

  return rtiDraftSchema.parse({
    ...validated,
    subject: truncate(validated.subject, 180),
    context: validated.context ? truncate(validated.context, 400) : null,
    questions: validated.questions.map((question) => truncate(question, 300)),
    warnings: [
      ...validated.warnings.slice(0, 4),
      'The draft was shortened to fit the online application text limit.'
    ]
  });
}

export function draftContentLength(draft: RTIDraft): number {
  return [draft.subject, draft.context ?? '', ...draft.questions].join('\n').length;
}

function truncate(value: string, maximum: number): string {
  if (value.length <= maximum) return value;
  return `${value.slice(0, maximum - 1).trimEnd()}…`;
}
