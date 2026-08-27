import {
  firstAppealDraftSchema,
  replyAnalysisSchema,
  rtiAnalysisSchema,
  rtiDraftSchema
} from '../../schemas/rti.js';
import type {
  FirstAppealDraft,
  FirstAppealGuidance,
  ReplyAnalysis,
  RTIAnalysis,
  RTIDraft,
  RTIJurisdiction,
  RTIApplication,
  SelectedAuthority
} from '../../types/rti.js';

const ANALYSIS_DISCLAIMER =
  'This automated explanation is for guidance only and is not a legal conclusion.';
const APPEAL_DISCLAIMER =
  'This is an editable demonstration draft, not legal advice and not a submitted first appeal.';

function detectJurisdiction(problem: string): RTIJurisdiction {
  const text = problem.toLowerCase();

  if (/\b(central government|union government|railways?|income tax|epfo|passport|psk)\b/.test(text)) {
    return 'central';
  }

  if (/\b(state government|municipal|municipality|panchayat|tehsil|district collector)\b/.test(text)) {
    return 'state';
  }

  return 'unknown';
}

export function createFallbackAnalysis(problem: string): RTIAnalysis {
  const jurisdiction = detectJurisdiction(problem);
  const needsClarification = jurisdiction === 'unknown';
  const clarificationQuestion = needsClarification
    ? 'Is this matter handled by the Central Government or by a State Government?'
    : null;

  if (/\b(pension|retirement benefit)\b/i.test(problem)) {
    return rtiAnalysisSchema.parse({
      issueType: 'Pension application processing delay',
      informationNeeded: [
        'Current application status',
        'Records showing the processing history',
        'Recorded reasons for delay',
        'Office or designation currently handling the application'
      ],
      jurisdiction,
      clarificationNeeded: needsClarification,
      clarificationQuestion: needsClarification
        ? 'Is your pension handled by the Central Government or by a State Government?'
        : null
    });
  }

  if (/\b(passport|passport seva|psk)\b/i.test(problem)) {
    return rtiAnalysisSchema.parse({
      issueType: 'Passport application status and processing',
      informationNeeded: [
        'Current passport application status',
        'Records showing file movement and processing history',
        'Recorded action taken on the passport application'
      ],
      jurisdiction: 'central',
      clarificationNeeded: false,
      clarificationQuestion: null
    });
  }

  return rtiAnalysisSchema.parse({
    issueType: 'Government information request',
    informationNeeded: [
      'Current status or relevant government records',
      'Available processing or decision records related to the request'
    ],
    jurisdiction,
    clarificationNeeded: needsClarification,
    clarificationQuestion
  });
}

export function createFallbackDraft(
  analysis: RTIAnalysis,
  authority: SelectedAuthority
): RTIDraft {
  const warnings = jurisdictionWarning(analysis, authority);

  if (/\b(pension|retirement benefit)\b/i.test(analysis.issueType)) {
    return rtiDraftSchema.parse({
      subject: 'Information regarding processing of pension application',
      context: 'I seek information regarding the status and processing of my pending pension application.',
      questions: [
        'Please provide the current status of the pension application.',
        'Please provide the dates and available records showing movement of the application during processing.',
        'Please provide copies of records or file notings in which reasons for the delay have been recorded.',
        'Please provide the name and designation of the office or officer currently handling the application.'
      ],
      authorityId: authority.authorityId,
      warnings
    });
  }

  return rtiDraftSchema.parse({
    subject: `Information regarding ${sentenceFragment(analysis.issueType)}`,
    context: `I seek information and available records regarding ${sentenceFragment(analysis.issueType)}.`,
    questions: genericQuestions(analysis),
    authorityId: authority.authorityId,
    warnings
  });
}

export function createFallbackReplyAnalysis(
  questions: string[],
  replyBody: string
): ReplyAnalysis {
  const text = replyBody.toLowerCase();
  const questionAssessments = questions.map((question) => assessReplyQuestion(question, text));
  const statuses = questionAssessments.map((assessment) => assessment.status);
  const hasAnswer = statuses.some((status) => status === 'answered' || status === 'partially_answered');
  const hasGap = statuses.some((status) => status === 'not_answered' || status === 'unclear');
  const overallStatus = hasAnswer && hasGap
    ? 'partially_answered'
    : statuses.every((status) => status === 'answered')
      ? 'answered'
      : statuses.every((status) => status === 'not_answered')
        ? 'not_answered'
        : 'unclear';

  const keyInformation: string[] = [];
  if (/\b(under examination|being examined|under process|pending)\b/.test(text)) {
    keyInformation.push('The reply says the matter is still under examination or processing.');
  }
  const receivedDate = replyBody.match(/\breceived on\s+([A-Za-z0-9 ,/-]{3,40})[.\n]/i);
  if (receivedDate?.[1]) {
    keyInformation.push(`The reply states that the application was received on ${receivedDate[1].trim()}.`);
  }

  const missingInformation = questionAssessments
    .filter((assessment) => assessment.status === 'not_answered' || assessment.status === 'unclear')
    .map((assessment) => assessment.question);

  return replyAnalysisSchema.parse({
    summary:
      overallStatus === 'partially_answered'
        ? 'The reply provides some information, but one or more of the original questions remain unanswered or unclear.'
        : overallStatus === 'answered'
          ? 'The reply appears to address each of the original information requests.'
          : 'The reply does not clearly provide the information requested in the original questions.',
    overallStatus,
    questionAssessments,
    keyInformation,
    missingInformation,
    replySignals: {
      transferMentioned: /\btransfer(?:red)?\b/.test(text),
      rejectionMentioned: /\b(reject(?:ed|ion)?|denied|refused)\b/.test(text),
      exemptionMentioned: /\b(exemption|section\s+[89])\b/.test(text),
      recordsUnavailableMentioned:
        /\brecords?\b.{0,35}\b(unavailable|not available|not found|not held|does not exist)\b/.test(text)
    },
    recommendedAction:
      overallStatus === 'answered'
        ? 'no_action'
        : overallStatus === 'unclear'
          ? 'review_reply'
          : 'consider_first_appeal',
    actionReason:
      overallStatus === 'answered'
        ? 'Review the supplied information and keep the reply with your application records.'
        : 'Review the reply against the missing information before deciding whether any further RTI step is appropriate.',
    disclaimer: ANALYSIS_DISCLAIMER
  });
}

export function createFallbackFirstAppealDraft(
  application: RTIApplication,
  guidance: FirstAppealGuidance,
  citizenNotes: string | null
): FirstAppealDraft {
  const incompleteAssessments = application.replyAnalysis?.questionAssessments
    .map((assessment, index) => ({ assessment, index }))
    .filter(({ assessment }) => assessment.status !== 'answered') ?? [];

  const grounds = application.governmentReply
    ? incompleteAssessments.map(
        ({ assessment, index }) =>
          `Information request ${index + 1} was assessed as ${assessment.status.replace('_', ' ')}: ${assessment.explanation}`
      )
    : [
        'According to the information available in this RTI Saathi demo record, no response has been recorded after the normal response period.'
      ];

  if (citizenNotes && !/\b(corrupt|illegal|misconduct|punish|criminal)\b/i.test(citizenNotes)) {
    grounds.push(`The citizen also asks that this note be considered: ${citizenNotes}`);
  }

  const requestedRelief = application.governmentReply
    ? incompleteAssessments.map(
        ({ index }) => `Kindly provide a complete point-wise response to information request ${index + 1}.`
      )
    : ['Kindly provide a complete point-wise response to the information requested in the original RTI application.'];

  return firstAppealDraftSchema.parse({
    subject: `First appeal regarding RTI application ${application.registrationNumber}`,
    addressedTo: {
      title: 'First Appellate Authority',
      publicAuthorityName: application.authority.authorityName
    },
    originalRegistrationNumber: application.registrationNumber,
    applicationDate: application.submittedAt,
    replyDate: application.governmentReply?.receivedAt ?? null,
    grounds,
    requestedRelief,
    closingStatement: 'I respectfully request consideration of this appeal and provision of the information identified above.',
    warnings: [
      'This draft was generated from RTI Saathi prototype data. Verify the original filing, reply, dates and appellate authority before use.',
      ...(guidance.feeRequired ? [] : ['No first-appeal fee is required in this Central RTI demo workflow.'])
    ],
    feeRequired: false,
    disclaimer: APPEAL_DISCLAIMER
  });
}

function assessReplyQuestion(
  question: string,
  replyText: string
): ReplyAnalysis['questionAssessments'][number] {
  const normalizedQuestion = question.toLowerCase();
  const missing = (explanation: string) => ({ question, status: 'not_answered' as const, explanation });

  if (/\b(status|progress|pending)\b/.test(normalizedQuestion)) {
    return /\b(under examination|being examined|under process|pending|approved|rejected|completed)\b/.test(replyText)
      ? { question, status: 'answered', explanation: 'The reply states a current processing status.' }
      : missing('The reply does not state a clear current status.');
  }

  if (/\b(movement|processing history|forwarded|transferred|dates?)\b/.test(normalizedQuestion)) {
    if (/no (?:further )?information.{0,60}(?:movement|processing history)/.test(replyText)) {
      return missing('The reply explicitly says that file-movement information was not provided.');
    }
    return /\b(forwarded|transferred|moved from|moved to)\b/.test(replyText)
      ? { question, status: 'partially_answered', explanation: 'The reply mentions movement, but may not provide the complete requested history.' }
      : missing('The requested file-movement or processing history is not provided.');
  }

  if (/\b(reason|delay|file noting)\b/.test(normalizedQuestion)) {
    if (/no (?:further )?information.{0,80}(?:reason|delay)/.test(replyText)) {
      return missing('The reply explicitly says that recorded reasons were not provided.');
    }
    return /\b(?:because|due to|reason(?:s)? (?:is|are|was|were))\b/.test(replyText)
      ? { question, status: 'answered', explanation: 'The reply gives a stated reason relevant to the delay.' }
      : missing('The reply does not provide recorded reasons for the delay.');
  }

  if (/\b(officer|designation|office|handling)\b/.test(normalizedQuestion)) {
    if (/\b(section|office|department)\b/.test(replyText)) {
      return {
        question,
        status: 'partially_answered',
        explanation: 'The reply identifies an office or section, but does not clearly provide all requested officer details.'
      };
    }
    return missing('The reply does not identify the requested handling officer or office.');
  }

  return {
    question,
    status: 'unclear',
    explanation: 'The fallback analyser cannot confidently determine whether this request was answered.'
  };
}

export function jurisdictionWarning(
  analysis: RTIAnalysis,
  authority: SelectedAuthority
): string[] {
  if (analysis.jurisdiction !== 'unknown' && analysis.jurisdiction !== authority.jurisdiction) {
    return [
      'The selected authority differs from the earlier jurisdiction analysis. Review before continuing.'
    ];
  }

  return [];
}

function genericQuestions(analysis: RTIAnalysis): string[] {
  const needs = analysis.informationNeeded.join(' ').toLowerCase();
  const questions: string[] = [];

  if (/\b(status|pending|progress)\b/.test(needs)) {
    questions.push('Please provide the current status available in official records for this matter.');
  }
  if (/\b(process|history|movement|forwarded|transferred)\b/.test(needs)) {
    questions.push('Please provide available records showing processing dates and movement between offices.');
  }
  if (/\b(reason|delay)\b/.test(needs)) {
    questions.push('Please provide copies of records or file notings in which reasons for delay have been recorded.');
  }
  if (/\b(officer|office|designation|responsible|handling)\b/.test(needs)) {
    questions.push('Please provide the recorded name and designation of the office or officer handling this matter.');
  }
  if (/\b(action|decision)\b/.test(needs)) {
    questions.push('Please provide available action-taken or decision records, including the recorded dates.');
  }

  const defaults = [
    'Please provide copies of the relevant records, orders or communications relating to this matter.',
    'Please provide available records showing action taken and the dates of such action.',
    'Please provide the current status recorded for this matter.'
  ];

  for (const question of defaults) {
    if (questions.length >= 3) break;
    questions.push(question);
  }

  return [...new Set(questions)].slice(0, 7);
}

function sentenceFragment(value: string): string {
  const trimmed = value.trim().replace(/[.?!]+$/, '');
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}
