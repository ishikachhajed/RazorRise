import { prisma } from '../db/prisma.js';

export interface CreateAuditEventInput {
  userId?: string;
  orderId?: string;
  eventType: 'USER_REQUEST' | 'INTENT_EXTRACTED' | 'CATALOG_SEARCH' | 'RECOMMENDATION' | 'UPSELL_SUGGESTION' | 'USER_APPROVED' | 'CHECKOUT_CONFIRMATION' | 'RAZORPAY_ORDER_CREATED' | 'PAYMENT_CAPTURED' | 'PAYMENT_FAILED' | 'MONEY_ACTION_BLOCKED' | 'AI_DECISION' | 'NO_UPSELL_DECISION' | 'INCENTIVE_PROPOSED' | 'INCENTIVE_BLOCKED' | 'PAYMENT_RETRY' | string;
  actor: 'user' | 'ai' | 'system';
  action: string;
  reason?: string;
  input?: string;
  output?: string;
  status?: 'success' | 'failed' | 'blocked';
  metadata?: Record<string, any>;
}

export class AuditService {
  static async logEvent(input: CreateAuditEventInput) {
    try {
      const event = await prisma.auditEvent.create({
        data: {
          userId: input.userId,
          orderId: input.orderId,
          eventType: input.eventType,
          actor: input.actor,
          action: input.action,
          reason: input.reason,
          input: input.input,
          output: input.output,
          status: input.status || 'success',
          metadataJson: JSON.stringify(input.metadata || {})
        }
      });
      console.log(`[AUDIT LOG] [${event.eventType}] ${event.action} - ${event.status}`);
      return event;
    } catch (error) {
      console.error('Failed to write audit event:', error);
      return null;
    }
  }

  static async getEvents(filter?: { eventType?: string; status?: string; limit?: number }) {
    const where: any = {};
    if (filter?.eventType && filter.eventType !== 'ALL') {
      where.eventType = filter.eventType;
    }
    if (filter?.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter?.limit || 100
    });

    return events.map((e) => ({
      ...e,
      metadata: e.metadataJson ? JSON.parse(e.metadataJson) : {}
    }));
  }
}
