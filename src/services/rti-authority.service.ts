import { centralAuthorities, type AuthorityRecord } from '../data/rti-authorities.js';
import { authorityResolutionSchema } from '../schemas/rti.js';
import type { AuthorityResolution, RTIAnalysis, RTIJurisdiction } from '../types/rti.js';

type AuthorityRequest = {
  analysis: RTIAnalysis;
  jurisdictionAnswer?: RTIJurisdiction;
  state?: string | null;
};

type ScoredAuthority = {
  authority: AuthorityRecord;
  score: number;
  matchedTopics: string[];
  matchedKeywords: string[];
};

export function resolveAuthority(request: AuthorityRequest): AuthorityResolution {
  const jurisdiction = request.jurisdictionAnswer ?? request.analysis.jurisdiction;

  if (jurisdiction === 'unknown') {
    return clarification(
      'unknown',
      request.analysis.clarificationQuestion ??
        'Is this matter handled by the Central Government or by a State Government?'
    );
  }

  if (jurisdiction === 'state') {
    if (!request.state) {
      return clarification('state', 'Which State or Union Territory handles this matter?');
    }

    return clarification(
      'state',
      'We need the relevant State public authority for this service before recommending where to file.'
    );
  }

  const searchableText = normalize(
    [request.analysis.issueType, ...request.analysis.informationNeeded].join(' ')
  );
  const ranked = centralAuthorities
    .map((authority) => scoreAuthority(authority, searchableText))
    .sort((left, right) => right.score - left.score);
  const primary = ranked[0];

  if (!primary || primary.matchedTopics.length === 0) {
    return clarification(
      'central',
      'Which government service, department, scheme or office is this request related to?'
    );
  }

  const alternatives = ranked
    .slice(1)
    .filter((candidate) => candidate.score > 0)
    .slice(0, 2)
    .map((candidate) => toAlternative(candidate));

  return authorityResolutionSchema.parse({
    status: 'recommended',
    recommendation: {
      ...toAlternative(primary),
      alternatives
    }
  });
}

function scoreAuthority(authority: AuthorityRecord, searchableText: string): ScoredAuthority {
  const matchedTopics = authority.topics.filter((topic) => searchableText.includes(normalize(topic)));
  const matchedKeywords = authority.keywords.filter((keyword) =>
    searchableText.includes(normalize(keyword))
  );

  return {
    authority,
    score: matchedTopics.length * 4 + matchedKeywords.length,
    matchedTopics,
    matchedKeywords
  };
}

function toAlternative(candidate: ScoredAuthority) {
  const matchedAreas = [...candidate.matchedTopics, ...candidate.matchedKeywords].slice(0, 3);
  const reason = matchedAreas.length
    ? `Your request matches curated areas for this authority: ${matchedAreas.join(', ')}. ${candidate.authority.description}`
    : candidate.authority.description;

  return {
    authorityId: candidate.authority.id,
    authorityName: candidate.authority.name,
    department: candidate.authority.department,
    jurisdiction: candidate.authority.jurisdiction,
    confidence: confidenceFor(candidate.score),
    reason
  };
}

function confidenceFor(score: number): number {
  if (score >= 12) return 0.93;
  if (score >= 8) return 0.88;
  if (score >= 4) return 0.78;
  return 0.6;
}

function clarification(jurisdiction: RTIJurisdiction, question: string): AuthorityResolution {
  return authorityResolutionSchema.parse({
    status: 'clarification_required',
    jurisdiction,
    question
  });
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
