import { rtiKnowledgeAnswerSchema } from '../schemas/rti-knowledge.js';
import type { RTIKnowledgeAnswer, RTIKnowledgeRequest } from '../types/rti-knowledge.js';

const DISCLAIMER =
  'RTI Saathi provides informational assistance and is not a legal authority.';
const UNAVAILABLE =
  "RTI Saathi's reference knowledge is currently unavailable for this question. Please verify this point using the appropriate official RTI source.";
const LIMITATION =
  'The configured RTI knowledge store was unavailable or did not contain a relevant source.';

export function createRTIKnowledgeFallback(
  request: RTIKnowledgeRequest
): RTIKnowledgeAnswer {
  const question = request.question.toLowerCase();
  const injection = /ignore (all |any )?(previous|prior) instructions|invent .{0,30}(rule|law)/i.test(
    request.question
  );

  if (injection) {
    return unavailable();
  }

  if (isCentral(request, question) && /first\s+appeal/.test(question) && /fee|cost|pay/.test(question)) {
    return limited(
      'In RTI Saathi\'s existing Central RTI demo workflow, no fee is required for a first appeal. Verify the current requirements on the appropriate official portal before filing.'
    );
  }

  if (isCentral(request, question) && /\b(bpl|below poverty line)\b/.test(question) && /fee|cost|pay|exempt/.test(question)) {
    return limited(
      'In RTI Saathi\'s existing Central RTI demo workflow, a BPL applicant is treated as fee-exempt and must provide BPL proof. Verify the current official filing requirements.'
    );
  }

  if (
    isCentral(request, question) &&
    /\b(application|filing|file|rti)\b/.test(question) &&
    /fee|cost|pay/.test(question) &&
    !/appeal/.test(question)
  ) {
    return limited(
      'RTI Saathi\'s existing Central RTI demo workflow uses a standard application fee of ₹10. Verify the current amount and payment procedure on the appropriate official portal.'
    );
  }

  if (/\b(reply|response|respond|answer)\b/.test(question) && /\b(how long|deadline|time|days?|when)\b/.test(question)) {
    return limited(
      'RTI Saathi\'s existing prototype guidance uses a normal 30-day response period. Special cases may differ, so verify the applicable official RTI guidance.'
    );
  }

  return unavailable();
}

function isCentral(request: RTIKnowledgeRequest, question: string): boolean {
  return request.jurisdiction === 'central' || /\bcentral\b/.test(question);
}

function limited(answer: string): RTIKnowledgeAnswer {
  return rtiKnowledgeAnswerSchema.parse({
    answer,
    confidence: 'low',
    grounded: false,
    sources: [],
    limitations: [
      'This limited fallback reuses a rule already encoded in the RTI Saathi prototype; File Search grounding was unavailable.'
    ],
    disclaimer: DISCLAIMER
  });
}

function unavailable(): RTIKnowledgeAnswer {
  return rtiKnowledgeAnswerSchema.parse({
    answer: UNAVAILABLE,
    confidence: 'low',
    grounded: false,
    sources: [],
    limitations: [LIMITATION],
    disclaimer: DISCLAIMER
  });
}
