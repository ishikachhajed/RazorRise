import { PaymentService } from '../src/services/PaymentService.js';
import { prisma } from '../src/db/prisma.js';

describe('Razorpay Webhook & Idempotency Tests', () => {
  const runId = Date.now();
  const accountId = `acc_test_${runId}`;
  const paymentId = `pay_test_${runId}`;

  afterAll(async () => {
    await prisma.webhookEvent.deleteMany({
      where: { webhookId: { contains: accountId } }
    });
    await prisma.$disconnect();
  });

  test('should process first webhook and ignore duplicate webhook idempotently', async () => {
    const payload = {
      event: 'payment.captured',
      account_id: accountId,
      payload: {
        payment: { entity: { id: paymentId, order_id: `order_test_${runId}`, amount: 50000 } }
      }
    };

    const res1 = await PaymentService.handleWebhook(JSON.stringify(payload), 'mock_sig', payload);
    expect(res1.status).toBe('processed');

    // Duplicate call with exact same account_id, event, and payment id
    const res2 = await PaymentService.handleWebhook(JSON.stringify(payload), 'mock_sig', payload);
    expect(res2.status).toBe('ignored_duplicate');
  });
});
