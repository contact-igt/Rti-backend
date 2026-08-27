import { centralAuthorities } from '../data/rti-authorities.js';
import type { RTIAnalysis, SelectedAuthority } from '../types/rti.js';

export type FlowSafetyFailure = {
  code: 'STATE_FLOW_NOT_SUPPORTED' | 'AUTHORITY_NOT_SUPPORTED';
  message: string;
};

export function validateSupportedFilingFlow(
  analysis: RTIAnalysis,
  authority: SelectedAuthority
): FlowSafetyFailure | null {
  if (analysis.jurisdiction !== 'central' || authority.jurisdiction !== 'central') {
    return {
      code: 'STATE_FLOW_NOT_SUPPORTED',
      message:
        'State RTI filing is not supported until the relevant State authority and rules are verified.'
    };
  }

  const verifiedAuthority = centralAuthorities.find(
    (candidate) =>
      candidate.id === authority.authorityId && candidate.name === authority.authorityName
  );
  if (!verifiedAuthority) {
    return {
      code: 'AUTHORITY_NOT_SUPPORTED',
      message: 'Select a verified Central public authority before continuing.'
    };
  }
  return null;
}
