import { firstAppealGuidanceSchema } from '../schemas/rti.js';
import { getOwnedApplicationById } from './rti-application.service.js';
import type { FirstAppealGuidance, RTIApplication } from '../types/rti.js';

const DAY_MS = 24 * 60 * 60 * 1_000;
const GUIDANCE_DISCLAIMER =
  'This is informational prototype guidance, not a legal determination. Verify the applicable appeal requirements before filing.';

export type AppealGuidanceResult =
  | { success: true; data: FirstAppealGuidance }
  | {
      success: false;
      error: { code: 'APPLICATION_NOT_FOUND' | 'STATE_FLOW_NOT_SUPPORTED'; message: string };
    };

export function getFirstAppealGuidance(
  applicationId: string,
  ownerUserId: string,
  now: Date = new Date()
): AppealGuidanceResult {
  const application = getOwnedApplicationById(applicationId, ownerUserId);
  if (!application) {
    return {
      success: false,
      error: { code: 'APPLICATION_NOT_FOUND', message: 'RTI application not found.' }
    };
  }
  if (application.authority.jurisdiction !== 'central') {
    return {
      success: false,
      error: {
        code: 'STATE_FLOW_NOT_SUPPORTED',
        message: 'State-specific first appeal guidance is unavailable without verified State rules.'
      }
    };
  }

  return { success: true, data: buildGuidance(application, now) };
}

export function buildGuidance(application: RTIApplication, now: Date): FirstAppealGuidance {
  const daysSinceSubmission = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(application.submittedAt)) / DAY_MS)
  );
  const base = {
    applicationId: application.id,
    registrationNumber: application.registrationNumber,
    daysSinceSubmission,
    responseReceived: application.governmentReply !== null,
    feeRequired: false as const,
    originalRegistrationNumber: application.registrationNumber,
    disclaimer: GUIDANCE_DISCLAIMER
  };

  if (!application.governmentReply) {
    return firstAppealGuidanceSchema.parse({
      ...base,
      status: daysSinceSubmission >= 30 ? 'recommended' : 'not_yet_due',
      reason: daysSinceSubmission >= 30 ? 'no_reply_after_30_days' : 'awaiting_response',
      explanation:
        daysSinceSubmission >= 30
          ? 'According to this RTI Saathi demo record, no reply has been recorded after the normal 30-day response period, so a first appeal may be worth considering.'
          : 'No reply is recorded in this demo application, but 30 days have not yet elapsed since submission.',
      unansweredCount: application.draft.questions.length,
      partiallyAnsweredCount: 0
    });
  }

  const analysis = application.replyAnalysis;
  if (!analysis) {
    return firstAppealGuidanceSchema.parse({
      ...base,
      status: 'may_consider',
      reason: 'unclear_reply',
      explanation: 'Analyse the reply first for more specific appeal guidance.',
      unansweredCount: 0,
      partiallyAnsweredCount: 0
    });
  }

  const unansweredCount = analysis.questionAssessments.filter(
    (assessment) => assessment.status === 'not_answered'
  ).length;
  const partiallyAnsweredCount = analysis.questionAssessments.filter(
    (assessment) => assessment.status === 'partially_answered'
  ).length;
  if (analysis.overallStatus === 'answered' && analysis.missingInformation.length === 0) {
    return firstAppealGuidanceSchema.parse({
      ...base,
      status: 'not_currently_recommended',
      reason: 'reply_appears_complete',
      explanation: 'The available analysis indicates that the reply appears to address the original information requests.',
      unansweredCount,
      partiallyAnsweredCount
    });
  }

  if (analysis.overallStatus === 'unclear') {
    return firstAppealGuidanceSchema.parse({
      ...base,
      status: 'may_consider',
      reason: 'unclear_reply',
      explanation: 'The reply analysis is unclear. Review it carefully before deciding whether a first appeal is appropriate.',
      unansweredCount,
      partiallyAnsweredCount
    });
  }

  return firstAppealGuidanceSchema.parse({
    ...base,
    status: 'recommended',
    reason: unansweredCount > 0 ? 'unanswered_information' : 'incomplete_reply',
    explanation: 'Some requested information appears unanswered or only partially answered, so a first appeal may be worth considering.',
    unansweredCount,
    partiallyAnsweredCount
  });
}
