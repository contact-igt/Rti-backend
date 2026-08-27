import { z } from 'zod';

export const rtiJurisdictionSchema = z.enum(['central', 'state', 'unknown']);

export const rtiAnalysisSchema = z.object({
  issueType: z.string().min(1),
  informationNeeded: z.array(z.string().min(1)).min(1),
  jurisdiction: rtiJurisdictionSchema,
  clarificationNeeded: z.boolean(),
  clarificationQuestion: z.string().min(1).nullable()
});

export const analyseRTIRequestSchema = z.object({
  problem: z.string().trim().min(10).max(5000)
});

export const authorityAlternativeSchema = z.object({
  authorityId: z.string().min(1),
  authorityName: z.string().min(1),
  department: z.string().min(1).optional(),
  jurisdiction: z.enum(['central', 'state']),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1)
});

export const authorityRecommendationSchema = authorityAlternativeSchema.extend({
  alternatives: z.array(authorityAlternativeSchema)
});

export const authorityResolutionSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('clarification_required'),
    jurisdiction: rtiJurisdictionSchema,
    question: z.string().min(1)
  }),
  z.object({
    status: z.literal('recommended'),
    recommendation: authorityRecommendationSchema
  })
]);

export const authorityRequestSchema = z.object({
  analysis: rtiAnalysisSchema,
  jurisdictionAnswer: rtiJurisdictionSchema.optional(),
  state: z.string().trim().min(1).max(100).nullable().optional()
});

export const rtiDraftSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  context: z.string().trim().min(1).max(800).nullable(),
  questions: z.array(z.string().trim().min(1).max(600)).min(3).max(7),
  authorityId: z.string().min(1),
  warnings: z.array(z.string().trim().min(1).max(250)).max(5)
});

export const selectedAuthoritySchema = z.object({
  authorityId: z.string().trim().min(1),
  authorityName: z.string().trim().min(1),
  jurisdiction: z.enum(['central', 'state'])
});

export const rtiDraftRequestSchema = analyseRTIRequestSchema.extend({
  analysis: rtiAnalysisSchema,
  authority: selectedAuthoritySchema
});

const optionalEmailSchema = z.string().trim().email().max(254).nullable().optional().default(null);
const optionalPhoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(25)
  .refine((value) => /^\+?[0-9 ()-]+$/.test(value), 'Invalid phone number')
  .refine((value) => {
    const digitCount = value.replace(/\D/g, '').length;
    return digitCount >= 7 && digitCount <= 15;
  }, 'Invalid phone number')
  .nullable()
  .optional()
  .default(null);

export const rtiApplicantSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
  addressLine1: z.string().trim().min(5).max(250),
  addressLine2: z.string().trim().min(1).max(250).nullable().optional().default(null),
  city: z.string().trim().min(2).max(100),
  stateOrUt: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().regex(/^[1-9][0-9]{5}$/),
  country: z.literal('India'),
  citizenshipConfirmed: z.boolean(),
  bplStatus: z.enum(['yes', 'no'])
});

export const supportingDocumentSchema = z.object({
  id: z.string().trim().min(1).max(100),
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine((value) => !/[\\/]/.test(value), 'File name must not contain a path'),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
  purpose: z.string().trim().min(1).max(200).nullable().optional().default(null)
});

export const filingFeeStatusSchema = z.enum(['standard_fee', 'bpl_exempt']);

export const rtiFilingReviewRequestSchema = rtiDraftRequestSchema.extend({
  draft: rtiDraftSchema,
  applicant: rtiApplicantSchema,
  documents: z.array(supportingDocumentSchema).max(5)
});

export const rtiFilingReviewSchema = rtiFilingReviewRequestSchema.extend({
  feeStatus: filingFeeStatusSchema
});

export const demoPaymentModeSchema = z.enum([
  'demo_upi',
  'demo_card',
  'demo_netbanking',
  'bpl_exempt'
]);

export const demoPaymentSchema = z.object({
  status: z.enum(['not_required', 'pending', 'paid', 'failed']),
  amountPaise: z.number().int().nonnegative(),
  mode: demoPaymentModeSchema,
  transactionId: z.string().min(1).nullable(),
  paidAt: z.string().datetime().nullable()
});

export const demoPaymentProofTokenSchema = z.string().trim().min(32).max(200);

export const demoPaymentRequestSchema = z.object({
  feeStatus: filingFeeStatusSchema,
  mode: demoPaymentModeSchema,
  simulateFailure: z.boolean().optional().default(false)
});

const nullableReplyTextSchema = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable().optional().default(null);

export const governmentReplyInputSchema = z.object({
  body: z.string().trim().min(1).max(20_000),
  referenceNumber: nullableReplyTextSchema(200),
  subject: nullableReplyTextSchema(300),
  officerName: nullableReplyTextSchema(200),
  officerDesignation: nullableReplyTextSchema(200),
  attachments: z.array(supportingDocumentSchema).max(5).optional().default([])
});

export const demoReplyScenarioRequestSchema = z.object({
  scenario: z.literal('pension_partial_reply')
});

export const governmentReplyRequestSchema = z.union([
  governmentReplyInputSchema,
  demoReplyScenarioRequestSchema
]);

export const governmentReplySchema = governmentReplyInputSchema.extend({
  id: z.string().min(1),
  receivedAt: z.string().datetime(),
  source: z.literal('demo'),
  prototype: z.literal(true)
});

export const replyAssessmentStatusSchema = z.enum([
  'answered',
  'partially_answered',
  'not_answered',
  'unclear'
]);

export const replyAnalysisSchema = z.object({
  summary: z.string().trim().min(1).max(2_000),
  overallStatus: replyAssessmentStatusSchema,
  questionAssessments: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(600),
        status: replyAssessmentStatusSchema,
        explanation: z.string().trim().min(1).max(1_000)
      })
    )
    .min(1)
    .max(7),
  keyInformation: z.array(z.string().trim().min(1).max(600)).max(10),
  missingInformation: z.array(z.string().trim().min(1).max(600)).max(10),
  replySignals: z.object({
    transferMentioned: z.boolean(),
    rejectionMentioned: z.boolean(),
    exemptionMentioned: z.boolean(),
    recordsUnavailableMentioned: z.boolean()
  }),
  recommendedAction: z.enum([
    'no_action',
    'review_reply',
    'seek_clarification',
    'consider_first_appeal'
  ]),
  actionReason: z.string().trim().min(1).max(1_000),
  disclaimer: z.string().trim().min(1).max(500)
});

export const firstAppealGuidanceSchema = z.object({
  applicationId: z.string().min(1),
  registrationNumber: z.string().min(1),
  status: z.enum(['not_yet_due', 'may_consider', 'recommended', 'not_currently_recommended']),
  reason: z.enum([
    'no_reply_after_30_days',
    'incomplete_reply',
    'unanswered_information',
    'unclear_reply',
    'reply_appears_complete',
    'awaiting_response'
  ]),
  explanation: z.string().trim().min(1).max(1_500),
  daysSinceSubmission: z.number().int().nonnegative(),
  responseReceived: z.boolean(),
  unansweredCount: z.number().int().nonnegative(),
  partiallyAnsweredCount: z.number().int().nonnegative(),
  feeRequired: z.literal(false),
  originalRegistrationNumber: z.string().min(1),
  disclaimer: z.string().trim().min(1).max(500)
});

export const firstAppealDraftRequestSchema = z.object({
  citizenNotes: z.string().trim().min(1).max(2_000).nullable().optional().default(null)
});

export const firstAppealDraftSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  addressedTo: z.object({
    title: z.literal('First Appellate Authority'),
    publicAuthorityName: z.string().trim().min(1).max(300)
  }),
  originalRegistrationNumber: z.string().min(1),
  applicationDate: z.string().datetime(),
  replyDate: z.string().datetime().nullable(),
  grounds: z.array(z.string().trim().min(1).max(1_000)).min(1).max(10),
  requestedRelief: z.array(z.string().trim().min(1).max(1_000)).min(1).max(10),
  closingStatement: z.string().trim().min(1).max(1_000),
  warnings: z.array(z.string().trim().min(1).max(500)).max(5),
  feeRequired: z.literal(false),
  disclaimer: z.string().trim().min(1).max(500)
});

export const applicationStatusSchema = z.enum([
  'draft',
  'submitted',
  'received',
  'transferred',
  'in_progress',
  'response_received',
  'action_required',
  'completed'
]);

export const timelineEventSchema = z.object({
  id: z.string().min(1),
  status: applicationStatusSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  occurredAt: z.string().datetime()
});

export const rtiApplicationSchema = rtiFilingReviewSchema.extend({
  id: z.string().min(1),
  ownerUserId: z.string().min(1),
  registrationNumber: z.string().min(1),
  status: applicationStatusSchema,
  payment: demoPaymentSchema,
  submittedAt: z.string().datetime(),
  timeline: z.array(timelineEventSchema).min(1),
  governmentReply: governmentReplySchema.nullable().optional().default(null),
  replyAnalysis: replyAnalysisSchema.nullable().optional().default(null),
  firstAppealDraft: firstAppealDraftSchema.nullable().optional().default(null),
  prototype: z.literal(true)
});

export const rtiReceiptSchema = z.object({
  registrationNumber: z.string().min(1),
  applicationId: z.string().min(1),
  authorityName: z.string().min(1),
  submittedAt: z.string().datetime(),
  payment: z.object({
    status: z.enum(['paid', 'not_required']),
    amountPaise: z.number().int().nonnegative(),
    transactionId: z.string().min(1).nullable()
  }),
  status: z.literal('submitted'),
  prototypeNotice: z.string().min(1)
});

export const rtiApplicationCreateRequestSchema = z.object({
  submissionKey: z.string().trim().min(8).max(200),
  review: rtiFilingReviewSchema,
  payment: demoPaymentSchema,
  paymentProofToken: demoPaymentProofTokenSchema
});
