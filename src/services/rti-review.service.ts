import { rtiFilingReviewRequestSchema, rtiFilingReviewSchema } from '../schemas/rti.js';
import type { RTIApplicant, RTIFilingReview } from '../types/rti.js';
import type { z } from 'zod';

type ReviewRequest = z.infer<typeof rtiFilingReviewRequestSchema>;

export type FilingRuleFailure = {
  code: 'CITIZENSHIP_CONFIRMATION_REQUIRED' | 'FILING_VALIDATION_FAILED';
  message: string;
};

export type FilingReviewResult =
  | { success: true; data: RTIFilingReview }
  | { success: false; error: FilingRuleFailure };

export function validateApplicantRules(applicant: RTIApplicant): FilingRuleFailure | null {
  if (!applicant.citizenshipConfirmed) {
    return {
      code: 'CITIZENSHIP_CONFIRMATION_REQUIRED',
      message: 'Confirm Indian citizenship before continuing with this RTI filing.'
    };
  }

  return null;
}

export function buildFilingReview(request: ReviewRequest): FilingReviewResult {
  const applicantFailure = validateApplicantRules(request.applicant);
  if (applicantFailure) {
    return { success: false, error: applicantFailure };
  }

  if (request.draft.authorityId !== request.authority.authorityId) {
    return {
      success: false,
      error: {
        code: 'FILING_VALIDATION_FAILED',
        message: 'The selected authority does not match the authority used in the RTI draft.'
      }
    };
  }

  const data = rtiFilingReviewSchema.parse({
    ...request,
    feeStatus: request.applicant.bplStatus === 'yes' ? 'bpl_exempt' : 'standard_fee'
  });

  return { success: true, data };
}
