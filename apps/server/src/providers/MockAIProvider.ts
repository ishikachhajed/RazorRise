import { AIProvider, ExtractedIntent, AdaptiveDecision } from './AIProvider.js';

export class MockAIProvider implements AIProvider {
  async extractIntent(userQuery: string, context?: any): Promise<ExtractedIntent> {
    const lower = userQuery.toLowerCase();

    let intent: ExtractedIntent = {
      category: 'unknown',
      useCases: [],
      features: [],
      rawQuery: userQuery,
      budgetType: 'flexible',
      basketScope: 'unknown'
    };

    // Category Identification
    if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('notebook')) intent.category = 'laptop';
    else if (lower.includes('phone') || lower.includes('smartphone') || lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) intent.category = 'smartphone';
    else if (lower.includes('headphone') || lower.includes('earphone') || lower.includes('airdope') || lower.includes('earbud') || lower.includes('airpod') || lower.includes('tws') || lower.includes('buds') || lower.includes('earbuds')) intent.category = 'headphones';
    else if (lower.includes('keyboard')) intent.category = 'keyboards';
    else if (lower.includes('mouse') || lower.includes('mice')) intent.category = 'mice';
    else if (lower.includes('monitor') || lower.includes('display')) intent.category = 'monitors';
    else if (lower.includes('bag') || lower.includes('backpack')) intent.category = 'backpacks';
    else if (lower.includes('bottle') || lower.includes('flask')) intent.category = 'bottles';
    else if (lower.includes('charger') || lower.includes('adapter') || lower.includes('cable') || lower.includes('powerbank') || lower.includes('power bank') || lower.includes('hub')) intent.category = 'accessories';
    else if (lower.includes('accessory') || lower.includes('accessories')) intent.category = 'needs_clarification';

    // Use cases — also detect "general" for short/vague queries
    if (lower.includes('coding') || lower.includes('programming') || lower.includes('developer') || lower.includes('work') || lower.includes('office')) intent.useCases.push('coding/work');
    if (lower.includes('gaming') || lower.includes('games') || lower.includes('game')) intent.useCases.push('gaming');
    if (lower.includes('travel') || lower.includes('commute') || lower.includes('college') || lower.includes('school')) intent.useCases.push('travel/school');
    if (lower.includes('music') || lower.includes('listening') || lower.includes('audio')) intent.useCases.push('general');

    // Basket Scope constraints
    if (lower.includes('setup') || lower.includes('everything i need') || lower.includes('complete')) intent.basketScope = 'complete_setup';
    else if (lower.includes('only') || lower.includes('just the') || lower.includes("don't add") || lower.includes('nothing else')) intent.basketScope = 'single_item';

    // Budget Extraction
    const match = lower.match(/under\s*₹?(\d+[,k]?\d*)/) || lower.match(/below\s*₹?(\d+[,k]?\d*)/) || lower.match(/budget\s*(?:of|is)?\s*₹?(\d+[,k]?\d*)/) || lower.match(/₹(\d+[,k]?\d*)/);
    if (match) {
      let numStr = match[1].replace(/,/g, '');
      if (numStr.endsWith('k')) {
        numStr = numStr.replace('k', '000');
      }
      intent.budgetMax = parseInt(numStr, 10);
      intent.budgetType = 'hard';
    } else {
      // Fallback for bare numbers like "70", "80000", "70k", "70-80k"
      const cleaned = lower.replace(/[,₹\s]/g, '');
      const numMatch = cleaned.match(/(?:^|-)(\d+)(k)?$/);
      // Only extract if it's a short message that's likely a price, not part of a model name
      if (numMatch && cleaned.length < 20 && !lower.includes('model')) {
        let val = parseInt(numMatch[1], 10);
        // Treat small numbers like 70, 80 as thousands (70000, 80000) in Indian context
        if (numMatch[2] === 'k' || (val < 1000 && val > 5)) val *= 1000;
        intent.budgetMax = val;
        intent.budgetType = 'hard';
      }
    }

    if (lower.includes('cheapest') || lower.includes('low budget') || lower.includes('cheap')) {
      intent.performancePreference = 'lowest_price';
      intent.priceSensitivity = 'high';
    }
    if (lower.includes('value') || lower.includes('best value')) {
      intent.performancePreference = 'balanced';
    }
    if (lower.includes('premium') || lower.includes('best quality')) {
      intent.performancePreference = 'premium';
    }

    if (lower.includes('discount') || lower.includes('offer') || lower.includes('coupon')) {
      intent.hasDiscountIntent = true;
    }

    return intent;
  }

  async makeAdaptiveDecision(intent: ExtractedIntent, cartContext?: any): Promise<{ decision: AdaptiveDecision, reason: string }> {
    // 1. MUST ESTABLISH CATEGORY
    if (intent.category === 'unknown' || intent.category === 'needs_clarification') {
      return { decision: 'ASK_CLARIFYING_QUESTION', reason: 'Product category is ambiguous or missing.' };
    }

    // 2. MUST HAVE EITHER: use case OR (budget OR performance preference)
    //    Don't require both — "laptop under 80000" is enough to recommend
    const hasContext = intent.useCases.length > 0 || !!intent.budgetMax || !!intent.performancePreference;
    if (!hasContext) {
      return { decision: 'ASK_CLARIFYING_QUESTION', reason: 'Need at least budget or use case before recommending.' };
    }

    if (intent.hasDiscountIntent) {
      return { decision: 'OFFER_INCENTIVE', reason: 'Customer requested a discount.' };
    }

    // Once constraints are met, decide the upsell logic based on explicit basketScope
    if (intent.basketScope === 'complete_setup') {
      return { decision: 'EXPAND_BASKET', reason: 'Customer explicitly requested a complete setup.' };
    }
    
    if (intent.basketScope === 'single_item' || intent.priceSensitivity === 'high') {
      return { decision: 'NO_UPSELL', reason: 'Customer explicitly requested ONLY the main product or is highly price sensitive.' };
    }

    // Default to EXPAND_BASKET if we have enough context and they haven't opted out.
    // CommerceAgent will downgrade this to RECOMMEND if no relevant accessory exists or if cap is reached.
    return { decision: 'EXPAND_BASKET', reason: 'Proactive cross-sell triggered. Checking for relevant accessories.' };
  }

  async generateRecommendationResponse(query: string, intent: ExtractedIntent, candidates: any[], decision?: AdaptiveDecision): Promise<string> {
    if (decision === 'OFFER_INCENTIVE') {
      return "Good news — I can apply an approved discount to your order today!";
    }

    if (decision === 'ASK_CLARIFYING_QUESTION') {
      if (intent.category === 'needs_clarification') {
        return "I can certainly help you find accessories! Do you need something specific like airdopes, a mouse, or a bag?";
      }
      if (intent.category === 'unknown') {
        return "I can help with that. What specific product are you looking to buy today?";
      }
      if (intent.useCases.length === 0) {
        return `Sure! To find the best ${intent.category} for you, what will you mainly use it for? (e.g., coding/work, gaming, or general use)`;
      }
      if (!intent.budgetMax && !intent.performancePreference) {
        return "Got it. Should I prioritize the lowest price, best value, or a more premium experience? And what budget would you like me to stay within?";
      }
      return "Could you provide a bit more detail about your budget or requirements?";
    }

    if (candidates.length === 0) {
      if (intent.budgetMax) {
        return `I don't currently have any ${intent.category} in this merchant's catalog under ₹${intent.budgetMax.toLocaleString('en-IN')}. I can help you find another available product if you'd like.`;
      }
      return `I don't currently have a ${intent.category} in this merchant's catalog. I can help you find another available product if you'd like.`;
    }

    const top = candidates[0];
    const matchScore = top.matchScore || Math.floor(Math.random() * (99 - 85 + 1) + 85); // fallback if not supplied by db

    let msg = `Here is a great option for you: the **${top.name}** for ₹${top.price.toLocaleString('en-IN')}.\n\n`;

    msg += `**Why this fits (${matchScore}% Match):**\n`;
    msg += `• It's a fantastic fit for ${intent.useCases[0] || 'general use'}.\n`;
    if (intent.budgetMax) {
      msg += `• It stays comfortably within your ₹${intent.budgetMax.toLocaleString('en-IN')} budget.\n`;
    }
    if (intent.performancePreference) {
      msg += `• It perfectly aligns with your preference for a ${intent.performancePreference.replace('_', ' ')} experience.\n`;
    }

    if (decision === 'NO_UPSELL') {
      msg += `\nDoes this look good, or would you like to explore other options?`;
    } else if (decision === 'EXPAND_BASKET') {
      msg += `\nSince you're building a complete setup, I've also found some highly compatible additions below!`;
    } else {
      msg += `\nWould you like me to add this to your cart, or are you looking for any other accessories to go with it?`;
    }

    return msg;
  }

  async generateUpsellSuggestion(selectedProduct: any, intent: ExtractedIntent): Promise<any> {
    // Upsells must now be requested via the ToolRegistry to query real DB items.
    // This mock returns null so CommerceAgent relies on the real catalog query.
    return null;
  }
}
