import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';
import { CartService } from './CartService.js';
import { AuditService } from './AuditService.js';

let razorpayInstance: Razorpay | null = null;

if (config.razorpayKeyId && config.razorpayKeySecret && !config.razorpayKeyId.includes('mock')) {
  try {
    razorpayInstance = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret
    });
  } catch (err) {
    console.warn('Failed to initialize Razorpay SDK instance:', err);
  }
}

export class PaymentService {
  /**
   * Create Razorpay Test Order
   * STRICT BOUND: Amount is ALWAYS calculated on backend from active cart.
   */
  static async createOrder(cartId: string, userId?: string) {
    const cart = await CartService.getOrCreateCart(cartId, userId);
    
    if (!cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty. Cannot create financial order.');
    }

    if (cart.subtotal <= 0) {
      throw new Error('Invalid cart total. Must be greater than 0.');
    }

    // Apply Backend Discount Enforcement
    let finalAmount = cart.subtotal;
    let appliedDiscount = 0;
    const rawCart = await prisma.cart.findUnique({ where: { id: cartId } });
    if (rawCart && rawCart.intentJson) {
      try {
        const intent = JSON.parse(rawCart.intentJson);
        if (intent.discount && typeof intent.discount === 'number' && intent.discount > 0) {
          const config = await prisma.merchantConfig.findUnique({ where: { id: 'default' } }) || { maxDiscountPercent: 5.0, allowIncentives: true } as any;
          
          if (config.allowIncentives) {
            const safeDiscount = Math.min(intent.discount, config.maxDiscountPercent);
            appliedDiscount = Math.round((cart.subtotal * safeDiscount) / 100);
            finalAmount -= appliedDiscount;
            
            await AuditService.logEvent({
              userId,
              eventType: 'INCENTIVE_APPROVED',
              actor: 'system',
              action: `Applied ${safeDiscount}% discount to order`,
              reason: 'Backend validation passed against merchant guardrails',
              input: JSON.stringify({ originalSubtotal: cart.subtotal, safeDiscount }),
              output: JSON.stringify({ appliedDiscount, finalAmount }),
              status: 'success'
            });
          }
        }
      } catch (e) {}
    }

    const amountInPaise = Math.round(finalAmount * 100);
    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    let razorpayOrderId = `order_${crypto.randomBytes(7).toString('hex')}`;
    
    // Call Razorpay API if real test credentials present
    if (razorpayInstance) {
      try {
        const rzpOrder = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt,
          notes: {
            cartId: cart.id,
            itemCount: cart.itemCount.toString()
          }
        });
        razorpayOrderId = rzpOrder.id;
      } catch (err: any) {
        console.error('Razorpay API order create error:', err);
        throw new Error(`Razorpay Order Creation Failed: ${err?.error?.description || err?.message || JSON.stringify(err)}`);
      }
    } else {
      throw new Error('Razorpay SDK is not initialized. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }

    let order = await prisma.order.findFirst({
      where: {
        cartId: cart.id,
        status: { in: ['created', 'pending', 'failed'] },
        paymentStatus: { in: ['pending', 'failed'] }
      }
    });

    if (order) {
      // Reuse order but update amount and razorpay details
      order = await prisma.order.update({
        where: { id: order.id },
        data: {
          razorpayOrderId,
          amount: finalAmount,
          itemsJson: JSON.stringify(cart.items)
        }
      });
    } else {
      // Persist new Order in database
      order = await prisma.order.create({
        data: {
          userId,
          cartId: cart.id,
          razorpayOrderId,
          amount: finalAmount,
          currency: 'INR',
          status: 'created',
          paymentStatus: 'pending',
          itemsJson: JSON.stringify(cart.items)
        }
      });
    }

    // Log Gated User Confirmation Event
    await AuditService.logEvent({
      userId,
      orderId: order.id,
      eventType: 'CHECKOUT_CONFIRMATION',
      actor: 'user',
      action: 'Explicit Financial Confirmation',
      reason: 'User explicitly confirmed cart breakdown and authorized payment gate',
      input: JSON.stringify({ cartId, amount: finalAmount }),
      output: JSON.stringify({ razorpayOrderId, orderId: order.id }),
      status: 'success',
      metadata: { razorpayOrderId, amount: finalAmount, itemCount: cart.itemCount, appliedDiscount }
    });

    // Log Backend Order Creation Event
    await AuditService.logEvent({
      userId,
      orderId: order.id,
      eventType: 'RAZORPAY_ORDER_CREATED',
      actor: 'system',
      action: 'Create Razorpay Test Order',
      reason: 'Backend generated Razorpay Order instance with server-calculated price authority',
      input: JSON.stringify({ cartId, amount: finalAmount }),
      output: JSON.stringify({ razorpayOrderId, orderId: order.id }),
      status: 'success',
      metadata: { razorpayOrderId, amount: finalAmount, itemCount: cart.itemCount }
    });

    return {
      orderId: order.id,
      razorpayOrderId,
      amount: finalAmount,
      amountInPaise,
      currency: 'INR',
      keyId: config.razorpayKeyId,
      items: cart.items
    };
  }

  /**
   * Verify Payment Signature (Server-side HMAC-SHA256 validation)
   */
  static async verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, signature: string) {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId }
    });

    if (!order) {
      throw new Error(`Order not found for Razorpay Order ID: ${razorpayOrderId}`);
    }

    let isValid = false;

    // Standard HMAC-SHA256 check
    if (config.razorpayKeySecret && !config.razorpayKeySecret.includes('mock')) {
      const generatedSignature = crypto
        .createHmac('sha256', config.razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      isValid = generatedSignature === signature;
    } else {
      // Test Mode simulator verification (accept test signatures or mock prefix)
      isValid = Boolean(signature && signature.length > 5);
    }

    if (!isValid) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'failed', paymentStatus: 'failed' }
      });

      await AuditService.logEvent({
        orderId: order.id,
        eventType: 'PAYMENT_FAILED',
        actor: 'system',
        action: 'Payment Signature Verification Failed',
        reason: 'HMAC signature mismatch',
        status: 'failed',
        metadata: { razorpayOrderId, razorpayPaymentId }
      });

      throw new Error('Invalid payment signature. Verification failed.');
    }

    // Mark Payment & Order as Paid
    const wasFailed = order.status === 'failed' || order.paymentStatus === 'failed';
    
    // Save payment record separately
    await prisma.payment.upsert({
      where: { razorpayPaymentId },
      update: { status: 'captured' },
      create: {
        orderId: order.id,
        razorpayPaymentId,
        status: 'captured',
        method: 'card',
        amount: order.amount
      }
    });

    // Call unified handler to do order status, inventory, and audit
    await PaymentService.handlePaymentOutcome(order.id, 'success', {
      razorpayOrderId,
      razorpayPaymentId,
      reason: 'Server-side signature check passed'
    });

    if (wasFailed) {
       await AuditService.logEvent({
        orderId: order.id,
        eventType: 'PAYMENT_RETRY',
        actor: 'system',
        action: 'Payment Retry Successful',
        reason: 'A previously failed order was successfully retried and captured.',
        status: 'success',
        metadata: { razorpayOrderId, razorpayPaymentId }
      });
    }

    return {
      success: true,
      orderId: order.id,
      razorpayOrderId,
      paymentId: razorpayPaymentId,
      amount: order.amount
    };
  }

  /**
   * Handle Webhook Event with Idempotency & Webhook Signature Validation
   */
  static async handleWebhook(rawBody: string, signature: string, payload: any) {
    const webhookSecret = config.razorpayWebhookSecret;

    // Validate Signature if real secret available
    if (webhookSecret && !webhookSecret.includes('mock')) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new Error('Invalid webhook signature');
      }
    }

    const eventType = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const razorpayPaymentId = paymentEntity?.id;
    const webhookId = payload.account_id ? `${payload.account_id}_${payload.event}_${razorpayPaymentId || Date.now()}` : `wh_${Date.now()}_${Math.random()}`;

    // STRICT IDEMPOTENCY CHECK: Check if this payment is already captured
    if (razorpayPaymentId) {
      const existingPayment = await prisma.payment.findUnique({ where: { razorpayPaymentId } });
      if (existingPayment && existingPayment.status === 'captured' && (eventType === 'payment.captured' || eventType === 'order.paid')) {
        console.log(`[WEBHOOK IDEMPOTENT] Payment '${razorpayPaymentId}' already captured. Skipping duplicate.`);
        return { status: 'ignored_duplicate', message: 'Payment already processed' };
      }
    }

    // IDEMPOTENCY CHECK: Check if webhook event already processed
    const existingWebhook = await prisma.webhookEvent.findUnique({
      where: { webhookId }
    });

    if (existingWebhook) {
      console.log(`[WEBHOOK IDEMPOTENT] Webhook ID '${webhookId}' already processed. Skipping duplicate execution.`);
      return { status: 'ignored_duplicate', message: 'Webhook already processed' };
    }

    // Save webhook event to DB for audit and deduplication
    await prisma.webhookEvent.create({
      data: {
        webhookId,
        eventType,
        payloadJson: JSON.stringify(payload),
        processed: true
      }
    });

    if (!razorpayOrderId) {
      return { status: 'processed', note: 'No order ID attached to webhook' };
    }

    const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
    if (!order) {
      return { status: 'processed', note: 'Order not found in DB' };
    }

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (order.paymentStatus !== 'captured') {
        await PaymentService.handlePaymentOutcome(order.id, 'success', {
          eventType,
          razorpayOrderId
        });
      }
    } else if (eventType === 'payment.failed') {
      await PaymentService.handlePaymentOutcome(order.id, 'failed', {
        eventType,
        razorpayOrderId,
        reason: paymentEntity?.error_description || 'Payment declined by bank/test mode'
      });
    }

    return { status: 'processed', eventType, orderId: order.id };
  }

  /**
   * Unified Payment Outcome Handler
   * Replaces duplicate update logic across webhooks and verifications.
   * Updates order status, decrements inventory on success, and logs audit events.
   */
  static async handlePaymentOutcome(orderId: string, outcome: 'success' | 'failed', additionalData?: any) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Order not found: ${orderId}`);

    const buyerType = (order.userId && order.userId.includes('agent')) ? `AI Agent (${order.userId})` : 'Human Customer';

    if (outcome === 'success') {
      if (order.status !== 'paid') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'paid', paymentStatus: 'captured' }
        });

        // Decrement inventory stock
        try {
          const items = order.itemsJson ? JSON.parse(order.itemsJson) : [];
          for (const item of items) {
            if (item.productId && item.quantity) {
              await prisma.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } }
              });
            }
          }
        } catch (e) {
          console.error('[Inventory Update Error]', e);
        }

        await AuditService.logEvent({
          userId: order.userId || undefined,
          orderId: order.id,
          eventType: 'PAYMENT_SUCCESS',
          actor: 'system',
          action: 'Payment successfully captured',
          reason: additionalData?.reason || 'Payment verification / webhook success',
          input: JSON.stringify({ buyerType, amount: order.amount }),
          status: 'success',
          metadata: { amount: order.amount, buyerType, ...additionalData }
        });

        // Mark Cart as Converted
        if (order.cartId) {
          await prisma.cart.update({
            where: { id: order.cartId },
            data: { status: 'converted' }
          });
        }
      }
    } else if (outcome === 'failed') {
      if (order.status !== 'failed') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'failed', paymentStatus: 'failed' }
        });

        await AuditService.logEvent({
          userId: order.userId || undefined,
          orderId: order.id,
          eventType: 'PAYMENT_FAILED',
          actor: 'system',
          action: 'Payment failed or declined',
          reason: additionalData?.reason || 'Payment declined by bank/test mode',
          input: JSON.stringify({ buyerType, amount: order.amount }),
          status: 'failed',
          metadata: { amount: order.amount, buyerType, ...additionalData }
        });
      }
    }
  }
}
