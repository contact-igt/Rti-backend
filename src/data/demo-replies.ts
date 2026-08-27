import type { GovernmentReplyInput } from '../types/rti.js';

export const pensionPartialDemoReply = {
  body: `With reference to your RTI request regarding the pension application, the case is presently under examination in the Pension Section.

The application was received on 4 July 2026.

No further information is provided regarding file movement or recorded reasons for the delay.`,
  referenceNumber: 'DEMO-REPLY-001',
  subject: 'Demo reply regarding pension application',
  officerName: null,
  officerDesignation: 'Section Officer',
  attachments: []
} satisfies GovernmentReplyInput;
