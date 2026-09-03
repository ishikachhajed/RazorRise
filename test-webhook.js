const http = require('http');

async function testFlow() {
  // 1. Create checkout intent
  const checkoutRes = await fetch('http://localhost:5000/api/agent/commerce/checkout-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 'prod_lap_01', confirmed: true, buyerAgentId: 'ai-agent-007' })
  });
  
  const checkoutData = await checkoutRes.json();
  console.log('Checkout Intent Result:', checkoutData);
  
  const orderId = checkoutData.orderId;

  // Wait 1 sec
  await new Promise(r => setTimeout(r, 1000));

  // Get razorpayOrderId from the DB
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const order = await prisma.order.findUnique({ where: { id: orderId }});
  
  // 2. Simulate Webhook
  const payload = {
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: 'pay_' + Date.now(),
          order_id: order.razorpayOrderId,
          status: 'failed',
          error_description: 'Simulated failure for testing'
        }
      }
    }
  };
  
  const webhookRes = await fetch('http://localhost:5000/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const webhookData = await webhookRes.json();
  console.log('Webhook Result:', webhookData);
}

testFlow().catch(console.error);
