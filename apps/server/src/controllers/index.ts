import { Request, Response } from 'express';
import { CommerceAgent } from '../agents/CommerceAgent.js';
import { ShopEverywhereAgent } from '../agents/ShopEverywhereAgent.js';
import { ShoppingService } from '../services/ShoppingService.js';
import { CatalogService } from '../services/CatalogService.js';
import { CartService } from '../services/CartService.js';
import { PaymentService } from '../services/PaymentService.js';
import { AuditService } from '../services/AuditService.js';
import { prisma } from '../db/prisma.js';

export class CommerceController {
  // ──────────────────────────────────────────────────────────────────────
  // AI Chat
  // ──────────────────────────────────────────────────────────────────────
  static async handleChat(req: Request, res: Response) {
    try {
      const { message, cartId, userId, accumulatedIntent, conversationHistory, mode, accumulatedContext } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message field is required' });
      }

      // Route to Shop Everywhere agent when mode is set
      if (mode === 'shop_everywhere') {
        const response = await ShopEverywhereAgent.handleChat({
          message,
          userId,
          accumulatedContext: accumulatedContext || {}
        });
        return res.json(response);
      }

      // Default: existing My Store agent — completely untouched
      const response = await CommerceAgent.handleChat({ message, cartId, userId, accumulatedIntent, conversationHistory });
      return res.json(response);
    } catch (err: any) {
      console.error('Chat controller error:', err);
      return res.status(500).json({ error: err.message || 'Failed to process AI chat request' });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Shop Everywhere — Direct Product Search Endpoint
  // ──────────────────────────────────────────────────────────────────────
  static async handleShopEverywhereSearch(req: Request, res: Response) {
    try {
      const { query, maxPrice, minPrice, category } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'query field is required' });
      }
      const products = await ShoppingService.searchProducts({ query, maxPrice, minPrice, category });
      return res.json({ products });
    } catch (err: any) {
      // Never expose SerpApi URL or key in error responses
      console.error('[SHOP_EVERYWHERE_SEARCH_ERROR]', err.message);
      return res.status(500).json({ error: err.message || 'External product search failed. Please try again.' });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Catalog
  // ──────────────────────────────────────────────────────────────────────
  static async getProducts(req: Request, res: Response) {
    try {
      const { category, maxBudget, search } = req.query;
      const products = await CatalogService.searchProducts({
        category: category as string,
        maxBudget: maxBudget ? parseFloat(maxBudget as string) : undefined,
        searchQuery: search as string
      });
      return res.json({ products });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getProductById(req: Request, res: Response) {
    try {
      const product = await CatalogService.getProductById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.json({ product });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Agent-Readable Catalog Manifest (MCP / A2A compatible)
   * Exposes tools schema + product category summary for external AI agents
   */
  static async getCatalogManifest(req: Request, res: Response) {
    try {
      const allProducts = await CatalogService.searchProducts({});
      const categories = [...new Set(allProducts.map((p) => p.category))];
      const priceRange = {
        min: Math.min(...allProducts.map((p) => p.price)),
        max: Math.max(...allProducts.map((p) => p.price))
      };

      return res.json({
        agent: 'RazorRise-AI-Commerce',
        protocol: 'MCP/A2A',
        version: '1.0',
        capabilities: [
          'search_catalog',
          'recommend_products',
          'add_to_cart',
          'check_merchant_guardrails',
          'create_razorpay_order (gated)'
        ],
        catalog: {
          totalProducts: allProducts.length,
          categories,
          priceRange,
          currency: 'INR'
        },
        securityGate: 'EXPLICIT_USER_CONFIRMATION_REQUIRED',
        hmacVerification: true,
        endpoints: {
          chat: 'POST /api/ai/chat',
          products: 'GET /api/products',
          cart: 'GET /api/cart',
          checkout: 'POST /api/razorpay/order (userConfirmed required)',
          webhook: 'POST /api/webhooks/razorpay'
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Agent-to-Agent Commerce Endpoint
   * Returns structured JSON for external AI buyers instead of chat text.
   */
  static async handleAgentCommerce(req: Request, res: Response) {
    try {
      const { intent: _intent, category, useCase, maxBudget, basketScope } = req.body;
      
      // Map to standard ExtractedIntent format used by CommerceAgent
      const extractedIntent = {
        category: category || 'unknown',
        useCases: useCase ? [useCase] : [],
        features: [],
        budgetMax: maxBudget,
        basketScope: basketScope || 'unknown',
        rawQuery: '',
        hasCrossSold: false
      };

      // Call the EXACT same core logic as the human chat flow
      const coreResult = await CommerceAgent.processCoreCommerceLogic(extractedIntent, undefined, 'ai-buyer-agent');

      if (coreResult.decision === 'ASK_CLARIFYING_QUESTION') {
        return res.json({
          decision: coreResult.decision,
          clarification: coreResult.decisionReason || 'Which category are you looking for?'
        });
      }

      // Format response strictly for AI consumption
      const responsePayload = {
        products: coreResult.candidates.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          currency: p.currency,
          specs: p.specifications,
          matchReason: p.whyThis && p.whyThis.length > 0 ? p.whyThis[0] : 'Matches your constraints',
          availability: p.stock > 0 ? 'in_stock' : 'out_of_stock',
          compatibleAddOns: []
        })),
        decision: coreResult.decision,
        upsellEligible: !!coreResult.upsellSuggestion && !coreResult.upsellSuggestion.isNoUpsell,
        upsellSuggestion: coreResult.upsellSuggestion && !coreResult.upsellSuggestion.isNoUpsell ? coreResult.upsellSuggestion : undefined,
        checkoutReadiness: {
          requiresUserConfirmation: true,
          requiresAuth: true,
          nextStep: 'POST /api/agent/commerce/checkout-intent with productId + confirmed:true'
        }
      };

      return res.json(responsePayload);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Agent-to-Agent Checkout Intent
   * Creates a Razorpay order from a product. Strictly requires confirmed: true.
   */
  static async handleAgentCheckoutIntent(req: Request, res: Response) {
    try {
      const { productId, confirmed, buyerAgentId } = req.body;
      const agentId = buyerAgentId || 'unknown-ai-agent';

      // 1. Strict Security Gate
      if (confirmed !== true) {
        await AuditService.logEvent({
          userId: agentId,
          eventType: 'MONEY_ACTION_BLOCKED',
          actor: 'system',
          action: 'Blocked Agent Checkout',
          reason: 'Attempted agent checkout without confirmed: true',
          status: 'blocked'
        });
        return res.status(400).json({ error: 'Explicit confirmation (confirmed: true) is strictly required to execute payment intent.' });
      }

      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }

      // 2. Validate product and price on server side
      const product = await CatalogService.getProductById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found in catalog.' });
      }

      // 3. Create a temporary cart for the agent to bind the order to
      // Ensure the agent user exists in DB to prevent foreign key errors
      await prisma.user.upsert({
        where: { email: `${agentId}@agent.local` },
        update: {},
        create: {
          id: agentId,
          name: agentId,
          email: `${agentId}@agent.local`,
          role: 'ai-agent'
        }
      });

      const tempCartId = `agent_cart_${Date.now()}`;
      const actualCart = await CartService.getOrCreateCart(tempCartId, agentId);
      await CartService.addItem(actualCart.id, productId, 1);

      // 4. Create the Razorpay Order
      const orderData = await PaymentService.createOrder(actualCart.id, agentId);

      // 5. Log the distinct AI_BUYER event
      await AuditService.logEvent({
        userId: agentId,
        eventType: 'AI_BUYER_CHECKOUT_INTENT',
        actor: 'ai',
        action: 'Agent initiated checkout intent',
        reason: `Agent confirmed purchase of ${product.name} at ₹${product.price}`,
        input: JSON.stringify({ productId, price: product.price }),
        output: `Order created: ${orderData.orderId}`,
        status: 'success'
      });

      // 6. Return standard structured response
      return res.json({
        status: 'confirmed_pending_payment',
        orderId: orderData.orderId,
        amount: orderData.amount / 100, // orderData returns in paise, convert to INR
        currency: orderData.currency,
        checkoutUrl: `https://razorrise.example.com/checkout/${orderData.orderId}` // Generic URL for demo
      });

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Cart
  // ──────────────────────────────────────────────────────────────────────
  static async getCart(req: Request, res: Response) {
    try {
      const cartId = req.query.cartId as string;
      const userId = req.query.userId as string;
      const cart = await CartService.getOrCreateCart(cartId, userId);
      return res.json({ cart });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async addItemToCart(req: Request, res: Response) {
    try {
      const { cartId, productId, quantity } = req.body;
      if (!cartId || !productId) {
        return res.status(400).json({ error: 'cartId and productId are required' });
      }
      const cart = await CartService.addItem(cartId, productId, quantity || 1);
      
      // Auto context-aware upsell generation
      let upsellSuggestion = null;
      try {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (product) {
          const { ToolRegistry } = await import('../tools/index.js');
          const res: any = await ToolRegistry.executeTool({
             toolName: 'recommend_products',
             arguments: { category: 'accessories', limit: 1 },
             cartId, userId: cart.userId || undefined
          });
          if (res && res.candidates && res.candidates.length > 0) {
            upsellSuggestion = {
              product: res.candidates[0],
              reason: `Customers who bought ${product.name} also bought this.`
            };
          }
        }
      } catch (e) {
        console.warn('Failed to generate automatic upsell on cart add', e);
      }

      return res.json({ cart, upsellSuggestion });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async removeItemFromCart(req: Request, res: Response) {
    try {
      const { cartId, itemId } = req.body;
      if (!cartId || !itemId) {
        return res.status(400).json({ error: 'cartId and itemId are required' });
      }
      const cart = await CartService.removeItem(cartId, itemId);
      return res.json({ cart });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async clearCart(req: Request, res: Response) {
    try {
      const { cartId } = req.body;
      if (!cartId) return res.status(400).json({ error: 'cartId is required' });
      const cart = await CartService.clearCart(cartId);
      return res.json({ cart, message: 'Cart cleared successfully' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Abandoned Cart Recovery
   * Detects stale carts with items and logs a recovery nudge event.
   * Returns an AI-generated incentive message if applicable.
   */
  static async recoverAbandonedCart(req: Request, res: Response) {
    try {
      const { cartId, userId } = req.body;
      if (!cartId) return res.status(400).json({ error: 'cartId is required' });

      const cart = await CartService.getOrCreateCart(cartId, userId);

      if (cart.items.length === 0) {
        return res.json({ recovered: false, message: 'Cart is empty — nothing to recover.' });
      }

      // Check if cart has been in active state for too long (simulate: always nudge in demo)
      const topItem = cart.items[0];
      const recoveryMessage = `👋 Still thinking? Your **${topItem.productName}** is saved in your cart. ` +
        `Complete your order for ₹${cart.subtotal.toLocaleString('en-IN')} before it sells out!`;

      await AuditService.logEvent({
        userId,
        eventType: 'RECOMMENDATION',
        actor: 'ai',
        action: 'Abandoned Cart Recovery Nudge',
        reason: `Cart with ${cart.itemCount} items worth ₹${cart.subtotal} has not been checked out`,
        input: cartId,
        output: recoveryMessage,
        status: 'success',
        metadata: { cartId, subtotal: cart.subtotal, itemCount: cart.itemCount }
      });

      return res.json({
        recovered: true,
        cart,
        recoveryMessage,
        actionRequired: 'confirm_checkout',
        gatedOrderData: { subtotal: cart.subtotal, itemCount: cart.itemCount, currency: 'INR' }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Razorpay Payments
  // ──────────────────────────────────────────────────────────────────────
  static async createRazorpayOrder(req: Request, res: Response) {
    try {
      const { cartId, userId, userApproved, userConfirmed } = req.body;
      
      // Basic protection for demo routes (preventing external bots if needed)
      if (req.headers['x-internal-bot'] === 'true') {
        return res.status(403).json({ error: 'AI agent cannot direct checkout' });
      }

      if (!cartId) {
        return res.status(400).json({ error: 'cartId is required' });
      }

      const orderData = await PaymentService.createOrder(cartId, userId, userApproved);
      return res.json(orderData);
    } catch (err: any) {
      if (err.message && err.message.startsWith('APPROVAL_REQUIRED:')) {
        return res.status(403).json({ 
          error: 'Approval required for this transaction amount.',
          requireApproval: true,
          amount: parseFloat(err.message.split(':')[1])
        });
      }
      return res.status(400).json({ error: err.message });
    }
  }

  static async verifyRazorpayPayment(req: Request, res: Response) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      if (!razorpayOrderId || !razorpayPaymentId) {
        return res.status(400).json({ error: 'razorpayOrderId and razorpayPaymentId are required' });
      }
      const result = await PaymentService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async logRazorpayFailure(req: Request, res: Response) {
    try {
      const { cartId, reason, userId } = req.body;
      if (!cartId) return res.status(400).json({ error: 'cartId is required' });
      
      const cart = await CartService.getOrCreateCart(cartId, userId);
      
      await AuditService.logEvent({
        userId,
        eventType: 'PAYMENT_FAILED',
        actor: 'user',
        action: 'Payment Attempt Failed or Cancelled',
        reason: reason || 'User cancelled payment or payment declined',
        input: JSON.stringify({ cartId, amount: cart.subtotal }),
        output: 'Cart preserved, order not created',
        status: 'failed',
        metadata: { cartId, amount: cart.subtotal, itemCount: cart.itemCount }
      });
      
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async handleRazorpayWebhook(req: Request, res: Response) {
    try {
      // Use raw body string for HMAC validation (express.json() has already parsed it)
      const signature = req.headers['x-razorpay-signature'] as string;
      const rawBody = JSON.stringify(req.body);
      const result = await PaymentService.handleWebhook(rawBody, signature, req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('[WEBHOOK ERROR]', err.message);
      // Return 200 even on error to prevent Razorpay from retrying indefinitely
      return res.status(200).json({ received: true, error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // User Orders
  // ──────────────────────────────────────────────────────────────────────
  static async getUserOrders(req: Request, res: Response) {
    try {
      const { userId, cartId, cartIds } = req.query;

      // Build filter: prefer cartIds array, then single cartId, then userId
      let whereClause: any = {};
      if (cartIds) {
        whereClause = { cartId: { in: (cartIds as string).split(',') } };
      } else if (cartId) {
        whereClause = { cartId: cartId as string };
      } else if (userId) {
        whereClause = { userId: userId as string };
      }
      // If neither, return all orders (merchant-level view)

      const orders = await prisma.order.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        orderBy: { createdAt: 'desc' }
      });

      // Parse and normalise itemsJson for the frontend
      const formattedOrders = orders.map((o: any) => {
        let items: any[] = [];
        try {
          const parsed = JSON.parse(o.itemsJson || '[]');
          // Normalise regardless of source format
          items = parsed.map((item: any) => ({
            id: item.id || item.productId || '',
            productId: item.productId || '',
            productName: item.productName || item.name || 'Product',
            quantity: item.quantity || 1,
            price: item.price || 0,
            subtotal: item.subtotal ?? (item.price * (item.quantity || 1)),
            imageUrl: item.imageUrl || null
          }));
        } catch (e) {
          items = [];
        }

        return { ...o, items };
      });

      return res.json({ orders: formattedOrders });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Merchant Analytics & Dashboard
  // ──────────────────────────────────────────────────────────────────────
  static async getMerchantDashboard(req: Request, res: Response) {
    try {
      const allOrders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      const capturedOrders = await prisma.order.findMany({ where: { status: 'paid' } });
      const failedOrdersCount = await prisma.order.count({ where: { status: 'failed' } });

      const totalRevenue = capturedOrders.reduce((sum: number, o: any) => sum + o.amount, 0);
      const totalOrders = capturedOrders.length;
      
      const aiOrdersList = capturedOrders.filter((o: any) => o.userId && o.userId.includes('agent'));
      const aiRevenue = aiOrdersList.reduce((sum: number, o: any) => sum + o.amount, 0);
      const aiOrders = aiOrdersList.length;

      const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
      
      // Calculate upsell revenue simply by items past the first one, or if items include 'accessories'
      // For simplicity, we assume an order with >1 item is a cross-sold order
      const crossSoldOrders = capturedOrders.filter((o: any) => {
        try {
          const items = JSON.parse(o.itemsJson);
          return items.length > 1;
        } catch(e) { return false; }
      });
      const upsellRevenue = crossSoldOrders.reduce((sum: number, o: any) => {
        try {
           const items = JSON.parse(o.itemsJson);
           // Assumes first item is top product, rest are accessories
           const accessories = items.slice(1);
           return sum + accessories.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);
        } catch(e) { return sum; }
      }, 0);

      return res.json({
        metrics: {
          totalRevenue,
          aiRevenue,
          aiRevenuePercentage: totalRevenue > 0 ? Math.round((aiRevenue / totalRevenue) * 100) : 0,
          totalOrders,
          aiOrders,
          averageOrderValue,
          upsellRevenue,
          crossSellRevenue: upsellRevenue,
          liveOrdersCount: totalOrders,
          failedOrdersCount,
          dataSource: 'Live Database Orders (Pure Query)'
        },
        recentOrders: allOrders
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getMerchantInsights(req: Request, res: Response) {
    try {
      // 1. Fetch Paid Orders
      const paidOrders = await prisma.order.findMany({ where: { status: 'paid' } });
      
      // 2. Fetch Audit Events for Rates
      const upsellEvents = await prisma.auditEvent.findMany({ where: { eventType: 'UPSELL_SUGGESTION' } });
      const recommendationCount = await prisma.auditEvent.count({ where: { eventType: 'RECOMMENDATION' } });
      
      const usersOfferedUpsell = new Set(upsellEvents.map((e: any) => e.userId).filter(Boolean));
      
      const paidOrdersWhereUpsellOffered = paidOrders.filter((o: any) => usersOfferedUpsell.has(o.userId));
      const paidOrdersWithUpsellItem = paidOrdersWhereUpsellOffered.filter((o: any) => {
        try {
          const items = JSON.parse(o.itemsJson);
          return items.length > 1;
        } catch(e) { return false; }
      });
      
      const upsellAcceptanceRate = paidOrdersWhereUpsellOffered.length > 0 
        ? Math.round((paidOrdersWithUpsellItem.length / paidOrdersWhereUpsellOffered.length) * 100)
        : 0;
        
      const conversionRate = recommendationCount > 0 
        ? ((paidOrders.length / recommendationCount) * 100).toFixed(1)
        : '0.0';

      const aiOrders = paidOrders.filter((o: any) => o.userId && o.userId.includes('agent'));
      const humanOrders = paidOrders.length - aiOrders.length;

      const insightsData = [
        {
          id: 'ins_conversion',
          type: 'positive',
          title: 'Store Conversion Rate',
          description: `Your store converts at ${conversionRate}% (Orders / AI Recommendations).`,
          metric: `${conversionRate}%`,
          actionable: false
        },
        {
          id: 'ins_upsell',
          type: 'positive',
          title: 'Upsell Acceptance',
          description: `${upsellAcceptanceRate}% of customers who were offered an AI upsell checked out with it.`,
          metric: `${upsellAcceptanceRate}%`,
          actionable: false
        },
        {
          id: 'ins_buyer_split',
          type: 'neutral',
          title: 'AI vs Human Buyers',
          description: `You have ${aiOrders.length} orders from external AI Agents and ${humanOrders} orders from humans.`,
          metric: `${aiOrders.length} AI / ${humanOrders} Human`,
          actionable: false
        }
      ];

      return res.json({ insights: insightsData });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getMerchantAuditTrail(req: Request, res: Response) {
    try {
      const { eventType, status, limit } = req.query;
      const events = await AuditService.getEvents({
        eventType: eventType as string,
        status: status as string,
        limit: limit ? parseInt(limit as string, 10) : 100
      });
      return res.json({ auditEvents: events });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
    // ──────────────────────────────────────────────────────────────────────
  // Agent Control Center
  // ──────────────────────────────────────────────────────────────────────
  static async getAgentConfig(req: Request, res: Response) {
    try {
      const config = await prisma.agentConfig.findUnique({ where: { id: 'default' } });
      return res.json(config);
    } catch (err) {
      console.error('Failed to get agent config:', err);
      return res.status(500).json({ error: 'Failed to get agent config' });
    }
  }

  static async updateAgentConfig(req: Request, res: Response) {
    try {
      const { isActive, monthlySpendingLimit, autoApproveThreshold, requireApprovalMax } = req.body;
      const config = await prisma.agentConfig.update({
        where: { id: 'default' },
        data: {
          isActive: isActive !== undefined ? isActive : undefined,
          monthlySpendingLimit: monthlySpendingLimit !== undefined ? monthlySpendingLimit : undefined,
          autoApproveThreshold: autoApproveThreshold !== undefined ? autoApproveThreshold : undefined,
          requireApprovalMax: requireApprovalMax !== undefined ? requireApprovalMax : undefined
        }
      });
      return res.json(config);
    } catch (err) {
      console.error('Failed to update agent config:', err);
      return res.status(500).json({ error: 'Failed to update agent config' });
    }
  }
}
