import { randomUUID } from 'node:crypto';
import { pensionPartialDemoReply } from '../data/demo-replies.js';
import {
  governmentReplyRequestSchema,
  governmentReplySchema,
  rtiApplicationSchema
} from '../schemas/rti.js';
import { applicationStore } from '../stores/application.store.js';
import { getOwnedApplicationById } from './rti-application.service.js';
import type { GovernmentReply, GovernmentReplyInput, RTIApplication } from '../types/rti.js';
import type { z } from 'zod';

type ReplyRequest = z.infer<typeof governmentReplyRequestSchema>;

export type AttachReplyResult =
  | { success: true; data: { application: RTIApplication; reply: GovernmentReply } }
  | { success: false; error: { code: 'APPLICATION_NOT_FOUND'; message: string } };

export function attachDemoReply(
  applicationId: string,
  ownerUserId: string,
  request: ReplyRequest
): AttachReplyResult {
  const application = getOwnedApplicationById(applicationId, ownerUserId);
  if (!application) {
    return notFound();
  }

  const receivedAt = new Date().toISOString();
  const input: GovernmentReplyInput =
    'scenario' in request ? pensionPartialDemoReply : request;
  const reply = governmentReplySchema.parse({
    ...input,
    id: `reply_${randomUUID()}`,
    receivedAt,
    source: 'demo',
    prototype: true
  });
  const updated = rtiApplicationSchema.parse({
    ...application,
    status: 'response_received',
    governmentReply: reply,
    replyAnalysis: null,
    firstAppealDraft: null,
    timeline: [
      ...application.timeline,
      {
        id: `event_${randomUUID()}`,
        status: 'response_received',
        title: 'Government reply available',
        description: 'A demo reply has been added to this RTI Saathi application.',
        occurredAt: receivedAt
      }
    ]
  });

  const stored = applicationStore.update(updated);
  return stored ? { success: true, data: { application: stored, reply } } : notFound();
}

function notFound(): AttachReplyResult {
  return {
    success: false,
    error: { code: 'APPLICATION_NOT_FOUND', message: 'RTI application not found.' }
  };
}
