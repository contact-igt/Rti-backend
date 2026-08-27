import type { z } from 'zod';
import type {
  authorityAlternativeSchema,
  authorityRecommendationSchema,
  authorityResolutionSchema,
  applicationStatusSchema,
  demoPaymentSchema,
  filingFeeStatusSchema,
  firstAppealDraftSchema,
  firstAppealGuidanceSchema,
  governmentReplyInputSchema,
  governmentReplySchema,
  rtiApplicationSchema,
  rtiApplicantSchema,
  rtiAnalysisSchema,
  rtiDraftSchema,
  rtiFilingReviewSchema,
  rtiJurisdictionSchema,
  rtiReceiptSchema,
  replyAnalysisSchema,
  selectedAuthoritySchema,
  supportingDocumentSchema,
  timelineEventSchema
} from '../schemas/rti.js';

export type RTIJurisdiction = z.infer<typeof rtiJurisdictionSchema>;
export type RTIAnalysis = z.infer<typeof rtiAnalysisSchema>;
export type AuthorityAlternative = z.infer<typeof authorityAlternativeSchema>;
export type AuthorityRecommendation = z.infer<typeof authorityRecommendationSchema>;
export type AuthorityResolution = z.infer<typeof authorityResolutionSchema>;
export type RTIDraft = z.infer<typeof rtiDraftSchema>;
export type SelectedAuthority = z.infer<typeof selectedAuthoritySchema>;
export type RTIApplicant = z.infer<typeof rtiApplicantSchema>;
export type SupportingDocument = z.infer<typeof supportingDocumentSchema>;
export type FilingFeeStatus = z.infer<typeof filingFeeStatusSchema>;
export type RTIFilingReview = z.infer<typeof rtiFilingReviewSchema>;
export type DemoPayment = z.infer<typeof demoPaymentSchema>;
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type RTIApplication = z.infer<typeof rtiApplicationSchema>;
export type RTIReceipt = z.infer<typeof rtiReceiptSchema>;
export type GovernmentReplyInput = z.infer<typeof governmentReplyInputSchema>;
export type GovernmentReply = z.infer<typeof governmentReplySchema>;
export type ReplyAnalysis = z.infer<typeof replyAnalysisSchema>;
export type FirstAppealGuidance = z.infer<typeof firstAppealGuidanceSchema>;
export type FirstAppealDraft = z.infer<typeof firstAppealDraftSchema>;
