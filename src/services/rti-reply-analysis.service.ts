import { zodTextFormat } from 'openai/helpers/zod';
import { env } from '../config/env.js';
import { openaiClient } from '../lib/ai/client.js';
import { createFallbackReplyAnalysis } from '../lib/ai/fallback.js';
import { replyAnalysisSchema, rtiApplicationSchema } from '../schemas/rti.js';
import { applicationStore } from '../stores/application.store.js';
import { getOwnedApplicationById } from './rti-application.service.js';
import type { GovernmentReply, ReplyAnalysis } from '../types/rti.js';

const REPLY_ANALYSIS_INSTRUCTIONS = `You help an Indian citizen understand a demo reply to an RTI information request.
Compare every original RTI question with the reply. Classify each as answered, partially_answered, not_answered, or unclear, preserving each question exactly and in order.
Summarize in plain citizen-friendly language, list information provided and information that appears missing, and identify mentions of transfer, rejection, exemption, or unavailable records.
Recommend only a cautious action category. Do not provide legal conclusions, claim anyone violated the law, invent facts, or generate a first appeal.`;

export type ReplyAnalysisProvider = (
  questions: string[],
  reply: GovernmentReply
) => Promise<unknown>;

type AnalysisMeta = {
  source: 'ai' | 'fallback' | 'stored';
  degraded: boolean;
  reused: boolean;
  demo: true;
};

export type AnalyseReplyResult =
  | { success: true; data: ReplyAnalysis; meta: AnalysisMeta }
  | {
      success: false;
      error: {
        code: 'APPLICATION_NOT_FOUND' | 'REPLY_NOT_FOUND';
        message: string;
      };
    };

export async function analyseApplicationReply(
  applicationId: string,
  ownerUserId: string,
  provider?: ReplyAnalysisProvider
): Promise<AnalyseReplyResult> {
  const application = getOwnedApplicationById(applicationId, ownerUserId);
  if (!application) {
    return failure('APPLICATION_NOT_FOUND', 'RTI application not found.');
  }
  if (!application.governmentReply) {
    return failure('REPLY_NOT_FOUND', 'No reply is available for this RTI application yet.');
  }
  if (application.replyAnalysis) {
    return {
      success: true,
      data: application.replyAnalysis,
      meta: { source: 'stored', degraded: false, reused: true, demo: true }
    };
  }

  const questions = application.draft.questions;
  let analysis: ReplyAnalysis;
  let source: 'ai' | 'fallback' = 'fallback';
  let degraded = true;

  const selectedProvider = provider ?? (openaiClient && env.OPENAI_MODEL ? openAIProvider : undefined);
  if (selectedProvider) {
    try {
      const candidate = replyAnalysisSchema.parse(
        await selectedProvider(questions, application.governmentReply)
      );
      assertQuestionCoverage(candidate, questions);
      analysis = candidate;
      source = 'ai';
      degraded = false;
    } catch {
      console.warn('RTI reply analysis provider failed; using fallback.');
      analysis = createFallbackReplyAnalysis(questions, application.governmentReply.body);
    }
  } else {
    analysis = createFallbackReplyAnalysis(questions, application.governmentReply.body);
  }

  const updated = rtiApplicationSchema.parse({
    ...application,
    replyAnalysis: analysis,
    firstAppealDraft: null
  });
  if (!applicationStore.update(updated)) {
    return failure('APPLICATION_NOT_FOUND', 'RTI application not found.');
  }

  return {
    success: true,
    data: analysis,
    meta: { source, degraded, reused: false, demo: true }
  };
}

async function openAIProvider(questions: string[], reply: GovernmentReply): Promise<unknown> {
  if (!openaiClient || !env.OPENAI_MODEL) {
    throw new Error('Reply analysis provider is unavailable');
  }

  const response = await openaiClient.responses.parse({
    model: env.OPENAI_MODEL,
    instructions: REPLY_ANALYSIS_INSTRUCTIONS,
    input: JSON.stringify({ questions, reply: { body: reply.body } }),
    text: { format: zodTextFormat(replyAnalysisSchema, 'rti_reply_analysis') }
  });
  if (!response.output_parsed) {
    throw new Error('RTI reply analysis output was incomplete');
  }
  return response.output_parsed;
}

function assertQuestionCoverage(analysis: ReplyAnalysis, questions: string[]): void {
  if (
    analysis.questionAssessments.length !== questions.length ||
    analysis.questionAssessments.some((assessment, index) => assessment.question !== questions[index])
  ) {
    throw new Error('RTI reply analysis did not preserve all original questions');
  }
}

function failure(
  code: 'APPLICATION_NOT_FOUND' | 'REPLY_NOT_FOUND',
  message: string
): AnalyseReplyResult {
  return { success: false, error: { code, message } };
}
