import { pensionPartialDemoReply } from './demo-replies.js';
import {
  firstAppealGuidanceSchema,
  governmentReplySchema,
  rtiApplicationSchema
} from '../schemas/rti.js';
import {
  createFallbackFirstAppealDraft,
  createFallbackReplyAnalysis
} from '../lib/ai/fallback.js';
import type { RTIApplication } from '../types/rti.js';

const DAY_MS = 24 * 60 * 60 * 1_000;

export function createDemoApplications(anchor: Date): RTIApplication[] {
  const year = anchor.getUTCFullYear();
  const pensionSubmittedAt = daysBefore(anchor, 40);
  const pensionReplyAt = daysBefore(anchor, 10);
  const pensionQuestions = [
    'Please provide the current status of the pension application.',
    'Please provide the dates and available records showing movement of the application during processing.',
    'Please provide copies of records or file notings in which reasons for the delay have been recorded.',
    'Please provide the name and designation of the office or officer currently handling the application.'
  ];
  const reply = governmentReplySchema.parse({
    ...pensionPartialDemoReply,
    id: 'reply_demo_pension',
    receivedAt: pensionReplyAt,
    source: 'demo',
    prototype: true
  });
  const replyAnalysis = createFallbackReplyAnalysis(pensionQuestions, reply.body);
  const pensionWithoutDraft = rtiApplicationSchema.parse({
    ...commonApplicationData(),
    id: 'app_demo_pension',
    registrationNumber: `RTISAATHI-DEMO-${year}-000001`,
    status: 'response_received',
    problem: 'My Central Government pension application is pending and I need its recorded processing status.',
    analysis: {
      issueType: 'Pension application processing delay',
      informationNeeded: ['Current status', 'File movement history', 'Recorded reasons for delay', 'Handling office'],
      jurisdiction: 'central',
      clarificationNeeded: false,
      clarificationQuestion: null
    },
    authority: {
      authorityId: 'central-doppw',
      authorityName: "Department of Pension & Pensioners' Welfare",
      jurisdiction: 'central'
    },
    draft: {
      subject: 'Information regarding processing of pension application',
      context: 'I seek information regarding the status and processing of my pending pension application.',
      questions: pensionQuestions,
      authorityId: 'central-doppw',
      warnings: []
    },
    payment: {
      status: 'paid',
      amountPaise: 1000,
      mode: 'demo_upi',
      transactionId: 'DEMO-PAY-SEED-PENSION',
      paidAt: pensionSubmittedAt
    },
    submittedAt: pensionSubmittedAt,
    timeline: [
      {
        id: 'event_demo_pension_submitted',
        status: 'submitted',
        title: 'RTI request prepared',
        description: 'Your demo RTI application has been created in RTI Saathi.',
        occurredAt: pensionSubmittedAt
      },
      {
        id: 'event_demo_pension_reply',
        status: 'response_received',
        title: 'Government reply available',
        description: 'A demo reply has been added to this RTI Saathi application.',
        occurredAt: pensionReplyAt
      }
    ],
    governmentReply: reply,
    replyAnalysis,
    firstAppealDraft: null,
    prototype: true
  });
  const guidance = firstAppealGuidanceSchema.parse({
    applicationId: pensionWithoutDraft.id,
    registrationNumber: pensionWithoutDraft.registrationNumber,
    status: 'recommended',
    reason: 'unanswered_information',
    explanation: 'Some requested information appears unanswered or only partially answered, so a first appeal may be worth considering.',
    daysSinceSubmission: 40,
    responseReceived: true,
    unansweredCount: replyAnalysis.questionAssessments.filter((item) => item.status === 'not_answered').length,
    partiallyAnsweredCount: replyAnalysis.questionAssessments.filter((item) => item.status === 'partially_answered').length,
    feeRequired: false,
    originalRegistrationNumber: pensionWithoutDraft.registrationNumber,
    disclaimer: 'This is informational prototype guidance, not a legal determination. Verify the applicable appeal requirements before filing.'
  });
  const pension = rtiApplicationSchema.parse({
    ...pensionWithoutDraft,
    firstAppealDraft: createFallbackFirstAppealDraft(pensionWithoutDraft, guidance, null)
  });

  const pendingSubmittedAt = daysBefore(anchor, 5);
  const pending = rtiApplicationSchema.parse({
    ...commonApplicationData(),
    id: 'app_demo_pending',
    registrationNumber: `RTISAATHI-DEMO-${year}-000002`,
    status: 'submitted',
    problem: 'I need information about the processing status of my Central scholarship application.',
    analysis: {
      issueType: 'Scholarship application processing',
      informationNeeded: ['Current application status', 'Processing dates', 'Recorded reasons for delay'],
      jurisdiction: 'central',
      clarificationNeeded: false,
      clarificationQuestion: null
    },
    authority: {
      authorityId: 'central-higher-education',
      authorityName: 'Department of Higher Education',
      jurisdiction: 'central'
    },
    draft: {
      subject: 'Information regarding scholarship application processing',
      context: 'I seek available records about the processing of my scholarship application.',
      questions: [
        'Please provide the current status recorded for the scholarship application.',
        'Please provide available records showing the processing dates and movement of the application.',
        'Please provide copies of records containing reasons for any recorded delay.'
      ],
      authorityId: 'central-higher-education',
      warnings: []
    },
    payment: {
      status: 'paid',
      amountPaise: 1000,
      mode: 'demo_card',
      transactionId: 'DEMO-PAY-SEED-PENDING',
      paidAt: pendingSubmittedAt
    },
    submittedAt: pendingSubmittedAt,
    timeline: [
      {
        id: 'event_demo_pending_submitted',
        status: 'submitted',
        title: 'RTI request prepared',
        description: 'Your demo RTI application has been created in RTI Saathi.',
        occurredAt: pendingSubmittedAt
      }
    ],
    governmentReply: null,
    replyAnalysis: null,
    firstAppealDraft: null,
    prototype: true
  });

  return [pension, pending];
}

function commonApplicationData() {
  return {
    ownerUserId: 'user_demo_citizen',
    applicant: {
      fullName: 'Demo Citizen',
      email: 'demo@example.com',
      phone: null,
      addressLine1: 'Demo Address, Central District',
      addressLine2: null,
      city: 'New Delhi',
      stateOrUt: 'Delhi',
      postalCode: '110001',
      country: 'India',
      citizenshipConfirmed: true,
      bplStatus: 'no'
    },
    documents: [],
    feeStatus: 'standard_fee'
  } as const;
}

function daysBefore(anchor: Date, days: number): string {
  return new Date(anchor.getTime() - days * DAY_MS).toISOString();
}
