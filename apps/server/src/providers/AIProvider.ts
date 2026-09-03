export interface ExtractedIntent {
  category?: string;
  useCases: string[];
  features: string[];
  budgetMax?: number;
  budgetType?: 'hard' | 'flexible';
  priceSensitivity?: 'low' | 'medium' | 'high';
  performancePreference?: 'lowest_price' | 'best_value' | 'maximum_performance' | 'balanced' | 'premium' | string;
  basketScope?: 'single_item' | 'complete_setup' | 'laptop_only' | 'unknown' | string;
  upsellPermission?: boolean;
  hasDiscountIntent?: boolean;
  isComparisonRequest?: boolean;
  hasCrossSold?: boolean;
  shownProductIds?: string[];
  rawQuery: string;
}

export type AdaptiveDecision = 
  | 'RECOMMEND'
  | 'RECOMMEND_CHEAPER'
  | 'EXPAND_BASKET'
  | 'OFFER_INCENTIVE'
  | 'RECOVER_CART'
  | 'RECOVER_PAYMENT'
  | 'ASK_CLARIFYING_QUESTION'
  | 'NO_UPSELL';

export interface AgentChatResponse {
  message: string;
  intent?: ExtractedIntent;
  recommendations: any[];
  decision?: AdaptiveDecision;
  decisionReason?: string;
  upsellSuggestion?: any;
  actionRequired?: 'none' | 'confirm_cart' | 'confirm_checkout' | 'payment_gate';
  gatedOrderData?: any;
  incentive?: any;
}

export interface AIProvider {
  extractIntent(userQuery: string, context?: any): Promise<ExtractedIntent>;
  makeAdaptiveDecision(intent: ExtractedIntent, cartContext?: any): Promise<{decision: AdaptiveDecision, reason: string}>;
  generateRecommendationResponse(query: string, intent: ExtractedIntent, candidates: any[], decision?: AdaptiveDecision): Promise<string>;
  generateUpsellSuggestion(selectedProduct: any, intent: ExtractedIntent): Promise<any>;
}
