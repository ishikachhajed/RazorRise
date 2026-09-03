import { CatalogService } from '../services/CatalogService.js';
import { CartService } from '../services/CartService.js';
import { PaymentService } from '../services/PaymentService.js';
import { AuditService } from '../services/AuditService.js';

export interface ToolExecutionParams {
  toolName: string;
  arguments: any;
  cartId?: string;
  userId?: string;
}

export class ToolRegistry {
  static getToolsSchema() {
    return [
      {
        name: 'search_catalog',
        description: 'Search merchant catalog with explicit category, budget, and tag filters',
        parameters: {
          category: 'string (laptop | smartphone | headphones | keyboards | mice | monitors | backpacks | accessories | all)',
          maxBudget: 'number',
          useCases: 'array of strings (e.g. ["coding", "gaming"])',
          features: 'array of strings (e.g. ["16GB RAM", "OLED"])'
        }
      },
      {
        name: 'get_product',
        description: 'Get product details by ID',
        parameters: { productId: 'string' }
      },
      {
        name: 'recommend_products',
        description: 'Get ranked product recommendations with deterministic score breakdown',
        parameters: {
          category: 'string',
          maxBudget: 'number',
          useCases: 'array of strings',
          features: 'array of strings',
          excludeIds: 'array of strings (optional)'
        }
      },
      {
        name: 'get_cart',
        description: 'Get current cart items and server-calculated total',
        parameters: {}
      },
      {
        name: 'check_merchant_guardrails',
        description: 'Check active merchant configurations for upsell/incentive rules',
        parameters: {}
      },
      {
        name: 'add_to_cart',
        description: 'Add a product to active shopping cart',
        parameters: { productId: 'string', quantity: 'number' }
      },
      {
        name: 'remove_from_cart',
        description: 'Remove an item from cart',
        parameters: { itemId: 'string' }
      },
      {
        name: 'calculate_cart',
        description: 'Calculate exact subtotal and item count on backend',
        parameters: {}
      },
      {
        name: 'create_razorpay_order',
        description: 'Create Razorpay Test Order. Gated money operation.',
        parameters: {}
      },
      {
        name: 'verify_payment',
        description: 'Verify Razorpay payment signature',
        parameters: { razorpayOrderId: 'string', razorpayPaymentId: 'string', signature: 'string' }
      }
    ];
  }

  static async executeTool({ toolName, arguments: args, cartId, userId }: ToolExecutionParams) {
    console.log(`[BOUNDED TOOL EXECUTION] Tool: '${toolName}' | Args:`, JSON.stringify(args));

    switch (toolName) {
      case 'search_catalog':
      case 'recommend_products': {
        const results = await CatalogService.searchProducts({
          category: args.category,
          maxBudget: args.maxBudget,
          useCases: args.useCases,
          features: args.features,
          excludeIds: args.excludeIds
        });

        await AuditService.logEvent({
          userId,
          eventType: 'CATALOG_SEARCH',
          actor: 'ai',
          action: `Catalog Search (${args.category || 'all'})`,
          reason: 'Searching products based on extracted intent',
          input: JSON.stringify(args),
          output: `Found ${results.length} candidate products`,
          status: 'success',
          metadata: { count: results.length }
        });

        return { candidates: results.slice(0, 8) };
      }

      case 'get_product': {
        const product = await CatalogService.getProductById(args.productId);
        return { product };
      }

      case 'get_cart':
      case 'calculate_cart': {
        if (!cartId) throw new Error('Cart ID is required');
        const cart = await CartService.getOrCreateCart(cartId, userId);
        return { cart };
      }

      case 'check_merchant_guardrails': {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        let config = await prisma.merchantConfig.findUnique({ where: { id: 'default' } });
        if (!config) {
          config = { maxDiscountPercent: 5.0, minMarginPercent: 10.0, allowUpsells: true, allowIncentives: true };
        }
        await prisma.$disconnect();
        return config;
      }

      case 'add_to_cart': {
        if (!cartId) throw new Error('Cart ID is required');
        const updatedCart = await CartService.addItem(cartId, args.productId, args.quantity || 1);
        
        await AuditService.logEvent({
          userId,
          eventType: 'USER_APPROVED',
          actor: 'user',
          action: 'Added product to cart',
          reason: 'User approved item addition',
          input: JSON.stringify({ productId: args.productId, quantity: args.quantity || 1 }),
          output: `Cart subtotal: ₹${updatedCart.subtotal}`,
          status: 'success',
          metadata: { cartId, productId: args.productId, subtotal: updatedCart.subtotal }
        });

        return { cart: updatedCart };
      }

      case 'remove_from_cart': {
        if (!cartId) throw new Error('Cart ID is required');
        const updatedCart = await CartService.removeItem(cartId, args.itemId);
        return { cart: updatedCart };
      }

      case 'create_razorpay_order': {
        if (!cartId) throw new Error('Cart ID is required for gated order creation');
        
        // Strictly verify cart exists and is non-empty on backend
        const cart = await CartService.getOrCreateCart(cartId, userId);
        if (cart.items.length === 0) {
          throw new Error('Cart is empty. Cannot initiate Razorpay order.');
        }

        const razorpayOrder = await PaymentService.createOrder(cartId, userId);
        return { order: razorpayOrder };
      }

      case 'verify_payment': {
        const result = await PaymentService.verifyPayment(
          args.razorpayOrderId,
          args.razorpayPaymentId,
          args.signature
        );
        return result;
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
