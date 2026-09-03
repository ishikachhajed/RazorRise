import { ProviderFactory } from '../providers/ProviderFactory.js';
import { ExtractedIntent } from '../providers/AIProvider.js';
import { ToolRegistry } from '../tools/index.js';
import { AuditService } from '../services/AuditService.js';
import { CartService } from '../services/CartService.js';
import { prisma } from '../db/prisma.js';

export interface ChatMessageInput {
  message: string;
  cartId?: string;
  userId?: string;
  conversationHistory?: Array<{ role: 'user' | 'ai'; text: string }>;
  accumulatedIntent?: ExtractedIntent;
}

/**
 * Merge a new partial intent into the existing accumulated intent.
 * Only overwrite fields that the new intent actually detected (non-default values).
 */
function mergeIntents(existing: ExtractedIntent, fresh: ExtractedIntent): ExtractedIntent {
  const merged: ExtractedIntent = { ...existing };

  // Category: only update if fresh detected something specific
  if (fresh.category && fresh.category !== 'unknown') {
    merged.category = fresh.category;
  }

  // Use cases: merge without duplicates
  if (fresh.useCases && fresh.useCases.length > 0) {
    const combined = new Set([...(existing.useCases || []), ...fresh.useCases]);
    merged.useCases = Array.from(combined);
  }

  // Features: merge without duplicates
  if (fresh.features && fresh.features.length > 0) {
    const combined = new Set([...(existing.features || []), ...fresh.features]);
    merged.features = Array.from(combined);
  }

  // Budget: only update if fresh actually extracted a number
  if (fresh.budgetMax && fresh.budgetMax > 0) {
    merged.budgetMax = fresh.budgetMax;
    merged.budgetType = fresh.budgetType || 'hard';
  }

  // Basket scope: only update if fresh detected something specific
  if (fresh.basketScope && fresh.basketScope !== 'unknown') {
    merged.basketScope = fresh.basketScope;
  }

  // Performance preference
  if (fresh.performancePreference) {
    merged.performancePreference = fresh.performancePreference;
  }

  // Price sensitivity
  if (fresh.priceSensitivity) {
    merged.priceSensitivity = fresh.priceSensitivity;
  }

  // Always keep the latest raw query
  merged.rawQuery = fresh.rawQuery || existing.rawQuery;

  return merged;
}

/**
 * Detect if a bare message is just a budget/number reply to a previous question.
 * e.g. "25000", "₹25,000", "25k", "under 3000", "70-80k", "price 70"
 */
function isBareNumericReply(message: string): boolean {
  const cleaned = message.trim().toLowerCase().replace(/[₹,\s\-]/g, '').replace('price', '');
  // Matches: "25000", "25k", "3000", "under3000", "below5k", "70", "80000"
  return /^(under|below)?\d+k?$/.test(cleaned);
}

/**
 * Detect if a message has any commerce/shopping signal.
 * Returns true if the message is clearly off-topic (no product, no budget, no shopping words).
 */
function isOffTopic(message: string, accumulatedIntent?: ExtractedIntent): boolean {
  const lower = message.toLowerCase().trim();
  
  // If we already have a category context, treat follow-ups as on-topic
  if (accumulatedIntent && accumulatedIntent.category !== 'unknown') return false;
  
  // Short pure number or budget replies are on-topic (user answering a price question)
  if (/^[₹$]?[\d,\s.k]+$/.test(lower.replace(/[₹$,\s]/g, ''))) return false;
  
  // Yes/no answers are on-topic follow-ups
  if (/^(yes|no|yeah|yep|nope|sure|ok|okay|yup|nah)$/.test(lower)) return false;

  const SHOPPING_SIGNALS = [
    'laptop', 'phone', 'mobile', 'smartphone', 'headphone', 'earphone', 'earbud', 'airpod',
    'keyboard', 'mouse', 'monitor', 'display', 'bag', 'backpack', 'charger', 'cable',
    'hub', 'speaker', 'tablet', 'watch', 'accessory', 'accessories', 'buy', 'need', 'want',
    'looking for', 'recommend', 'suggest', 'budget', 'price', 'cost', 'under', 'below',
    'cheap', 'best', 'good', 'gaming', 'coding', 'work', 'office', 'setup', 'bundle',
    'discount', 'offer', 'checkout', 'cart', 'compare', 'vs', 'difference', '₹', 'inr',
    'compare', 'which', 'better', 'performance', 'ram', 'ssd', 'gpu', 'cpu', 'processor'
  ];

  return !SHOPPING_SIGNALS.some(signal => lower.includes(signal));
}

export class CommerceAgent {
  static async handleChat({ message, cartId, userId, conversationHistory, accumulatedIntent }: ChatMessageInput) {
    const aiProvider = ProviderFactory.getProvider();
    const cleanMessage = message.trim();

    // Log USER_REQUEST
    await AuditService.logEvent({
      userId,
      eventType: 'USER_REQUEST',
      actor: 'user',
      action: 'Conversational Input',
      reason: 'User sent message to AI Commerce Agent',
      input: cleanMessage,
      status: 'success'
    });

    const lower = cleanMessage.toLowerCase();

    // ── OFF-TOPIC GUARD ──
    if (isOffTopic(cleanMessage, accumulatedIntent as ExtractedIntent | undefined)) {
      const offTopicReply = await aiProvider.generateRecommendationResponse(
        cleanMessage,
        { category: 'unknown', useCases: [], features: [], rawQuery: cleanMessage, basketScope: 'unknown' } as any,
        [],
        'OFF_TOPIC' as any
      );
      return { message: offTopicReply, actionRequired: 'none', recommendations: [], intent: accumulatedIntent };
    }

    // Check for Gated Checkout Intent
    if (lower.includes('checkout') || lower.includes('proceed to pay') || lower.includes('pay now') || lower.includes('place order')) {
      if (!cartId) {
        return { message: "Your cart is currently empty. Add a product to your cart to proceed with checkout.", actionRequired: 'none', recommendations: [] };
      }

      const cart = await CartService.getOrCreateCart(cartId, userId);
      if (cart.items.length === 0) {
        return { message: "Your cart is currently empty. Please select a product to buy.", actionRequired: 'none', recommendations: [] };
      }

      await AuditService.logEvent({
        userId,
        eventType: 'CHECKOUT_CONFIRMATION',
        actor: 'ai',
        action: 'Present Gated Financial Confirmation',
        reason: 'Preparing checkout breakdown for user confirmation',
        input: JSON.stringify({ cartId, itemsCount: cart.itemCount, subtotal: cart.subtotal }),
        output: 'Awaiting explicit user click on Confirm & Pay button',
        status: 'success',
        metadata: { subtotal: cart.subtotal, itemCount: cart.itemCount }
      });

      return {
        message: `Your order is ready for checkout! Total: **₹${cart.subtotal.toLocaleString('en-IN')}**.\n\nI am ready to create a Razorpay Test Mode order. **No real money will be charged.**`,
        actionRequired: 'confirm_checkout',
        cart,
        recommendations: [],
        gatedOrderData: { subtotal: cart.subtotal, itemCount: cart.itemCount, currency: 'INR' }
      };
    }

    // Check for direct Add to Cart Intent
    if (lower.startsWith('add') || lower.includes('add to cart') || lower.includes('i want to buy')) {
      const intent = await aiProvider.extractIntent(cleanMessage);
      const searchRes: any = await ToolRegistry.executeTool({ toolName: 'search_catalog', arguments: { category: intent.category, maxBudget: intent.budgetMax }, cartId, userId });

      if (searchRes.candidates && searchRes.candidates.length > 0) {
        const productToAdd = searchRes.candidates[0];
        if (cartId) {
          const updatedCart = await CartService.addItem(cartId, productToAdd.id, 1);
          return {
            message: `Added **${productToAdd.name}** (₹${productToAdd.price.toLocaleString('en-IN')}) to your cart!`,
            cart: updatedCart,
            recommendations: [],
            actionRequired: 'confirm_cart'
          };
        }
      }
    }

    // ── CORE CONVERSATIONAL FLOW WITH MEMORY ──

    // Step 1: Extract intent from the CURRENT message
    const freshIntent = await aiProvider.extractIntent(cleanMessage);

    // Step 2: MERGE fresh intent into accumulated intent from previous turns
    const baseIntent: ExtractedIntent = accumulatedIntent || {
      category: 'unknown',
      useCases: [],
      features: [],
      rawQuery: '',
      basketScope: 'unknown',
      hasCrossSold: false
    };

    // Special handling: if this is a bare number reply like "25000",
    // treat it purely as a budget update — don't let it reset category to "unknown"
    let mergedIntent: ExtractedIntent;
    if (isBareNumericReply(cleanMessage) && baseIntent.category !== 'unknown') {
      mergedIntent = { ...baseIntent };
      if (freshIntent.budgetMax && freshIntent.budgetMax > 0) {
        mergedIntent.budgetMax = freshIntent.budgetMax;
        mergedIntent.budgetType = freshIntent.budgetType || 'hard';
      }
      if (!mergedIntent.budgetMax) {
        const numMatch = cleanMessage.replace(/[₹,\s]/g, '').match(/(\d+)k?/i);
        if (numMatch) {
          let val = parseInt(numMatch[1], 10);
          if (cleanMessage.toLowerCase().includes('k')) val *= 1000;
          mergedIntent.budgetMax = val;
          mergedIntent.budgetType = 'hard';
        }
      }
      mergedIntent.rawQuery = cleanMessage;
    } else {
      mergedIntent = mergeIntents(baseIntent, freshIntent);
      // Carry over non-standard flags from fresh intent
      if ((freshIntent as any).isComparisonRequest) (mergedIntent as any).isComparisonRequest = true;
      if ((freshIntent as any).hasDiscountIntent) (mergedIntent as any).hasDiscountIntent = true;
    }

    await AuditService.logEvent({
      userId,
      eventType: 'INTENT_EXTRACTED',
      actor: 'ai',
      action: 'Structured Intent Extraction (with memory)',
      reason: 'Merged current message intent with accumulated conversation state',
      input: cleanMessage,
      output: JSON.stringify(mergedIntent),
      status: 'success',
      metadata: mergedIntent
    });

    // Step 3 to 5: Execute Core Commerce Logic
    const coreResult = await CommerceAgent.processCoreCommerceLogic(mergedIntent, cartId, userId);

    // Step 6: Generate customer-facing response using MERGED intent
    let aiMessage = '';
    if (coreResult.decision === 'ASK_CLARIFYING_QUESTION') {
      aiMessage = await aiProvider.generateRecommendationResponse(cleanMessage, mergedIntent, [], 'ASK_CLARIFYING_QUESTION');
    } else {
      aiMessage = await aiProvider.generateRecommendationResponse(cleanMessage, mergedIntent, coreResult.candidates, coreResult.decision);
    }

    // Return merged intent for frontend to store and send back next turn
    return {
      message: aiMessage,
      intent: mergedIntent,
      decision: coreResult.decision,
      decisionReason: coreResult.decisionReason,
      recommendations: coreResult.candidates,
      upsellSuggestion: coreResult.upsellSuggestion,
      incentive: coreResult.incentive,
      actionRequired: coreResult.decision === 'ASK_CLARIFYING_QUESTION' ? 'none' : 'none'
    };
  }

  /**
   * Executes the core commerce logic: Adaptive Decision, Catalog Fetching, and Cross-Sell processing.
   * This logic is intentionally decoupled from human chat generation so it can be reused exactly
   * by the Agent-to-Agent Commerce API to ensure identical guardrails and behavior.
   */
  static async processCoreCommerceLogic(intent: ExtractedIntent, cartId?: string, userId?: string) {
    const aiProvider = ProviderFactory.getProvider();

    // Step 3: Adaptive Selling Decision
    const decisionData = await aiProvider.makeAdaptiveDecision(intent, null);
    let decision = decisionData.decision;

    await AuditService.logEvent({
      userId,
      eventType: 'AI_DECISION',
      actor: 'ai',
      action: decision,
      reason: decisionData.reason,
      input: JSON.stringify(intent),
      status: 'success'
    });

    // Step 4: Fetch candidates based on intent (ONLY if not clarifying)
    let toolResult: any = { candidates: [] };
    if (decision !== 'ASK_CLARIFYING_QUESTION') {
      toolResult = await ToolRegistry.executeTool({
        toolName: 'recommend_products',
        arguments: {
          category: intent.category,
          maxBudget: intent.budgetMax,
          useCases: intent.useCases,
          features: intent.features
        },
        cartId,
        userId
      });
    }

    let candidates = toolResult.candidates || [];

    // For comparison requests, try to get at least 2 candidates regardless of scoring order
    if ((intent as any).isComparisonRequest && candidates.length < 2) {
      const extraRes: any = await ToolRegistry.executeTool({
        toolName: 'recommend_products',
        arguments: {
          category: intent.category,
          maxBudget: intent.budgetMax ? intent.budgetMax * 1.5 : undefined,
          useCases: intent.useCases,
          features: intent.features,
          limit: 3
        },
        cartId,
        userId
      });
      candidates = extraRes.candidates || candidates;
    }

    if (candidates.length > 0) {
      await AuditService.logEvent({
        userId,
        eventType: 'RECOMMENDATION',
        actor: 'ai',
        action: 'Product Recommendations Generated',
        reason: `Selected top candidate matching budget constraint: ${intent.budgetMax || 'None'}`,
        input: JSON.stringify(intent),
        output: `Top product: ${candidates[0].name}`,
        status: 'success'
      });
    }

    // Step 5: Execute Adaptive Selling Logic
    let upsellSuggestion = undefined;
    let incentive = undefined;

    if (candidates.length > 0) {
      const topProduct = candidates[0];

      if (decision === 'EXPAND_BASKET') {
        // Enforce max 1 cross-sell per session (cap)
        if (intent.hasCrossSold) {
          decision = 'RECOMMEND'; // Downgrade gracefully
        } else {
          // Attempt to find a relevant accessory
          const accessoryRes: any = await ToolRegistry.executeTool({
             toolName: 'recommend_products',
             arguments: { category: 'accessories', maxBudget: intent.budgetMax ? Math.floor(intent.budgetMax * 0.2) : undefined },
             cartId, userId
          });
          
          if (accessoryRes.candidates && accessoryRes.candidates.length > 0) {
            const accessory = accessoryRes.candidates[0];
            const customUpsell = await aiProvider.generateUpsellSuggestion(topProduct, intent);
            const reasonText = customUpsell?.reason || `This ${accessory.name} pairs perfectly with the ${topProduct.name}.`;

            upsellSuggestion = {
              product: accessory,
              reason: reasonText
            };
            
            // Mark session as having been cross-sold to prevent nagging
            intent.hasCrossSold = true;

            await AuditService.logEvent({
              userId,
              eventType: 'UPSELL_SUGGESTION',
              actor: 'ai',
              action: 'Contextual Upsell Generated',
              reason: upsellSuggestion.reason,
              input: topProduct.id,
              output: upsellSuggestion.product.id,
              status: 'success'
            });
          } else {
            // No relevant accessories found, downgrade gracefully
            decision = 'RECOMMEND';
          }
        }
      } 
      
      if (decision === 'NO_UPSELL') {
        upsellSuggestion = {
          isNoUpsell: true,
          text: "I've added exactly what you requested without suggesting any extra accessories.",
          products: []
        };
        await AuditService.logEvent({
          userId,
          eventType: 'NO_UPSELL_DECISION',
          actor: 'ai',
          action: 'Refrained from Upsell',
          reason: decisionData.reason,
          status: 'success'
        });
      } else if (decision === 'OFFER_INCENTIVE') {
        // Validate discount against merchant guardrails BEFORE proposing it
        const configResult: any = await ToolRegistry.executeTool({ toolName: 'check_merchant_guardrails', arguments: {} });
        if (configResult && configResult.allowIncentives) {
          incentive = { type: 'discount', percent: configResult.maxDiscountPercent };
          
          // Save to cart for backend checkout enforcement
          if (cartId) {
            const rawCart = await prisma.cart.findUnique({ where: { id: cartId } });
            if (rawCart) {
              const intentJson = JSON.parse(rawCart.intentJson || '{}');
              intentJson.discount = incentive.percent;
              await prisma.cart.update({
                where: { id: cartId },
                data: { intentJson: JSON.stringify(intentJson) }
              });
            }
          }

          await AuditService.logEvent({
            userId,
            eventType: 'INCENTIVE_PROPOSED',
            actor: 'ai',
            action: `Offered ${configResult.maxDiscountPercent}% discount`,
            reason: decisionData.reason,
            status: 'success'
          });
        } else {
          // Merchant guardrails say no — do NOT apply discount, tell user plainly
          await AuditService.logEvent({
            userId,
            eventType: 'INCENTIVE_BLOCKED',
            actor: 'ai',
            action: 'Discount request blocked by merchant policy',
            reason: 'allowIncentives is false in merchant config',
            status: 'success'
          });
        }
      }
    }

    return {
      decision,
      decisionReason: decisionData.reason,
      candidates,
      upsellSuggestion,
      incentive
    };
  }
}
