import { zodTextFormat } from 'openai/helpers/zod';
import { env } from '../config/env.js';
import { openaiClient } from '../lib/ai/client.js';
import { createFallbackFirstAppealDraft } from '../lib/ai/fallback.js';
import {
  firstAppealDraftRequestSchema,
  firstAppealDraftSchema,
  rtiApplicationSchema
} from '../schemas/rti.js';
import { applicationStore } from '../stores/application.store.js';
import { buildGuidance } from './rti-appeal-guidance.service.js';
import { getOwnedApplicationById } from './rti-application.service.js';
import type { FirstAppealDraft, FirstAppealGuidance, RTIApplication } from '../types/rti.js';
import type { z } from 'zod';

const APPEAL_INSTRUCTIONS = `You assist an Indian citizen in preparing a concise, editable first appeal draft for an RTI request.
Use only the supplied application, reply analysis, guidance, and citizen notes. Write factual, respectful grounds focused only on information assessed as partially answered, not answered, or unclear.
Do not accuse officials, make legal findings, invent facts, dates, people, contacts, addresses, or appellate-authority details, request punishment, or generate a submission.
Preserve the original registration number and dates exactly. Address it only to the First Appellate Authority of the selected public authority. This is assistance, not legal advice.`;

type DraftRequest = z.infer<typeof firstAppealDraftRequestSchema>;
export type AppealDraftProvider = (input: unknown) => Promise<unknown>;
type DraftErrorCode =
  | 'APPLICATION_NOT_FOUND'
  | 'STATE_FLOW_NOT_SUPPORTED'
  | 'APPEAL_NOT_YET_DUE'
  | 'REPLY_ANALYSIS_REQUIRED'
  | 'APPEAL_NOT_RECOMMENDED';

export type AppealDraftResult =
  | {
      success: true;
      data: FirstAppealDraft;
      meta: { source: 'ai' | 'fallback' | 'stored'; degraded: boolean; reused: boolean; demo: true };
    }
  | { success: false; error: { code: DraftErrorCode; message: string } };

export async function generateFirstAppealDraft(
  applicationId: string,
  ownerUserId: string,
  request: DraftRequest,
  provider?: AppealDraftProvider,
  now: Date = new Date()
): Promise<AppealDraftResult> {
  const application = getOwnedApplicationById(applicationId, ownerUserId);
  if (!application) {
    return failure('APPLICATION_NOT_FOUND', 'RTI application not found.');
  }
  if (application.authority.jurisdiction !== 'central') {
    return failure(
      'STATE_FLOW_NOT_SUPPORTED',
      'State-specific first appeal drafting is unavailable without verified State rules.'
    );
  }

  const guidance = buildGuidance(application, now);
  if (guidance.status === 'not_yet_due') {
    return failure('APPEAL_NOT_YET_DUE', 'The normal 30-day response period has not yet elapsed.');
  }
  if (application.governmentReply && !application.replyAnalysis) {
    return failure('REPLY_ANALYSIS_REQUIRED', 'Analyse the reply before generating first appeal grounds.');
  }
  if (guidance.status === 'not_currently_recommended') {
    return failure('APPEAL_NOT_RECOMMENDED', 'The available reply analysis does not currently indicate unanswered information.');
  }
  if (application.firstAppealDraft) {
    return {
      success: true,
      data: application.firstAppealDraft,
      meta: { source: 'stored', degraded: false, reused: true, demo: true }
    };
  }

  let draft: FirstAppealDraft;
  let source: 'ai' | 'fallback' = 'fallback';
  let degraded = true;
  const selectedProvider = provider ?? (openaiClient && env.OPENAI_MODEL ? openAIProvider : undefined);

  if (selectedProvider) {
    try {
      draft = firstAppealDraftSchema.parse(await selectedProvider(providerInput(application, guidance, request)));
      assertDraftIntegrity(draft, application);
      source = 'ai';
      degraded = false;
    } catch {
      console.warn('RTI first appeal draft provider failed; using fallback.');
      draft = createFallbackFirstAppealDraft(application, guidance, request.citizenNotes);
    }
  } else {
    draft = createFallbackFirstAppealDraft(application, guidance, request.citizenNotes);
  }

  const updated = rtiApplicationSchema.parse({ ...application, firstAppealDraft: draft });
  if (!applicationStore.update(updated)) {
    return failure('APPLICATION_NOT_FOUND', 'RTI application not found.');
  }

  return {
    success: true,
    data: draft,
    meta: { source, degraded, reused: false, demo: true }
  };
}

async function openAIProvider(input: unknown): Promise<unknown> {
  if (!openaiClient || !env.OPENAI_MODEL) {
    throw new Error('Appeal draft provider is unavailable');
  }
  const response = await openaiClient.responses.parse({
    model: env.OPENAI_MODEL,
    instructions: APPEAL_INSTRUCTIONS,
    input: JSON.stringify(input),
    text: { format: zodTextFormat(firstAppealDraftSchema, 'rti_first_appeal_draft') }
  });
  if (!response.output_parsed) {
    throw new Error('First appeal draft output was incomplete');
  }
  return response.output_parsed;
}

function providerInput(
  application: RTIApplication,
  guidance: FirstAppealGuidance,
  request: DraftRequest
): unknown {
  return {
    registrationNumber: application.registrationNumber,
    submittedAt: application.submittedAt,
    authorityName: application.authority.authorityName,
    questions: application.draft.questions,
    replyReceivedAt: application.governmentReply?.receivedAt ?? null,
    replyAnalysis: application.replyAnalysis,
    guidance,
    citizenNotes: request.citizenNotes
  };
}

function assertDraftIntegrity(draft: FirstAppealDraft, application: RTIApplication): void {
  if (
    draft.originalRegistrationNumber !== application.registrationNumber ||
    draft.addressedTo.publicAuthorityName !== application.authority.authorityName ||
    draft.applicationDate !== application.submittedAt ||
    draft.replyDate !== (application.governmentReply?.receivedAt ?? null) ||
    draft.feeRequired !== false
  ) {
    throw new Error('Appeal draft did not preserve canonical application data');
  }
  const content = [...draft.grounds, ...draft.requestedRelief].join(' ');
  if (/\b(corrupt|illegal|misconduct|punish(?:ment)?|criminal action|compensation)\b/i.test(content)) {
    throw new Error('Appeal draft included unsupported accusations or relief');
  }
}

function failure(code: DraftErrorCode, message: string): AppealDraftResult {
  return { success: false, error: { code, message } };
}
