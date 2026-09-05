import { ShoppingService, ExternalProduct, ShoppingSearchParams } from '../services/ShoppingService.js';
import { AuditService } from '../services/AuditService.js';
import { config } from '../config/index.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShopEverywhereInput {
  message: string;
  userId?: string;
  accumulatedContext?: ShopEverywhereContext;
}

/**
 * Persistent context that gets carried forward across conversation turns in Shop Everywhere mode.
 * Similar in concept to accumulatedIntent in the My Store agent.
 */
export interface ShopEverywhereContext {
  lastQuery?: string;
  lastCategory?: string;
  lastMaxPrice?: number;
  lastMinPrice?: number;
  lastProducts?: ExternalProduct[];   // last shown results, for refinement/comparison
  shownProductUrls?: string[];
  preferredBrands?: string[];
  budget?: { min?: number; max?: number };
  filters?: { brands?: string[]; [key: string]: any };
  previousResults?: Array<{ index: number; title: string; url: string; price: string; source: string }>;
  pendingCrossSellCategory?: string;
  pendingClarification?: {
    category: string;
    originalQuery: string;
    questions: string[];
  };
  suggestedCrossSellCategories?: string[];
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ComparisonData {
  summary: string;
  factors?: string[];
}

export interface ShopEverywhereResponse {
  message: string;
  externalProducts: ExternalProduct[];
  crossSellProducts?: ExternalProduct[];
  crossSellPrompt?: string;   // render this AFTER the product cards, not inline with `message`
  comparison?: ComparisonData;
  updatedContext: ShopEverywhereContext;
}

export enum ShoppingIntentType {
  NEW_SEARCH = "NEW_SEARCH",
  MORE_RESULTS = "MORE_RESULTS",
  PRICE_REFINEMENT = "PRICE_REFINEMENT",
  FILTER_REFINEMENT = "FILTER_REFINEMENT",
  PRODUCT_REFERENCE = "PRODUCT_REFERENCE",
  COMPARISON = "COMPARISON",
  CROSS_SELL_REQUEST = "CROSS_SELL_REQUEST",
  CATEGORY_CHANGE = "CATEGORY_CHANGE",
  UNKNOWN = "UNKNOWN"
}

/**
 * Structured parameters extracted from user message by the LLM.
 */
interface ExtractedShoppingIntent {
  intentType: ShoppingIntentType;
  queries: Array<{
    query: string;
    maxPrice?: number;
    minPrice?: number;
    category?: string;
  }>;
  needsComparison: boolean;
  crossSellResponse?: 'yes' | 'no' | 'none';
  refinedMaxPrice?: number;
  refinedMinPrice?: number;
  refinedBrands?: string[];
  userFacingMessage: string;       // short summary of what the AI understood
}

const CLARIFICATION_MAP: Record<string, { category: string; questions: string[] }> = {
  phone: { category: 'mobile phone', questions: ['What is your budget?', 'Should I prioritize camera quality, storage, or battery life?'] },
  mobile: { category: 'mobile phone', questions: ['What is your budget?', 'Should I prioritize camera quality, storage, or battery life?'] },
  smartphone: { category: 'mobile phone', questions: ['What is your budget?', 'Should I prioritize camera quality, storage, or battery life?'] },
  laptop: { category: 'laptop', questions: ['What is your budget?', 'What will you mainly use it for: gaming, work/office, or video editing?'] },
  notebook: { category: 'laptop', questions: ['What is your budget?', 'What will you mainly use it for: gaming, work/office, or video editing?'] },
  shoe: { category: 'shoes', questions: ['What is your budget?', 'What will you use them for: running, casual wear, or formal occasions?'] },
  shoes: { category: 'shoes', questions: ['What is your budget?', 'What will you use them for: running, casual wear, or formal occasions?'] },
  watch: { category: 'watch', questions: ['What is your budget?', 'Are you looking for an analog watch or a smartwatch?'] },
  smartwatch: { category: 'smartwatch', questions: ['What is your budget?', 'Are you looking for fitness tracking features or mainly notifications?'] }
};

function resolveClarification(query: string): { category: string; questions: string[] } | undefined {
  const lowerQuery = query.toLowerCase();
  const match = Object.entries(CLARIFICATION_MAP).find(([keyword]) =>
    new RegExp(`\\b${keyword}\\b`, 'i').test(lowerQuery)
  );
  return match?.[1];
}

function hasMeaningfulShoppingDetail(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return /(?:₹|rs\.?|inr|under|below|between|budget|\$)\s*\d|\b\d{4,6}\b/.test(lowerMessage)
    || /\b(apple|samsung|oneplus|xiaomi|google|lenovo|hp|dell|asus|nike|adidas|puma)\b/i.test(lowerMessage)
    || /\b(iphone|galaxy|pixel|thinkpad|macbook|gaming|running|formal|office|editing)\b/i.test(lowerMessage);
}

// ─── Session context store ─────────────────────────────────────────────────
// Keeps conversation context server-side, keyed by userId, so the agent
// remembers past turns even if the frontend/route layer fails to pass
// accumulatedContext back correctly. This is an in-memory Map — it resets
// on server restart and won't work across multiple server instances, but
// for a single-instance hackathon deployment this is fine and far more
// reliable than depending on the frontend wiring being perfect.
//
// If input.userId is missing, we fall back to a single shared 'anonymous'
// session — fine for local demo/testing with one user at a time.

const sessionContextStore = new Map<string, ShopEverywhereContext>();

function getSessionKey(userId?: string): string {
  return userId || 'anonymous';
}

function loadSessionContext(userId?: string): ShopEverywhereContext {
  const key = getSessionKey(userId);
  return sessionContextStore.get(key) || {};
}

function saveSessionContext(userId: string | undefined, context: ShopEverywhereContext): void {
  const key = getSessionKey(userId);
  sessionContextStore.set(key, context);
}

// ─── Groq LLM helper (reuses the same low-level fetch pattern as GroqAIProvider) ─

async function callGroq(messages: any[], responseFormat?: any): Promise<string> {
  if (!config.groqApiKey) {
    throw new Error('AI service is not configured.');
  }

  const payload: any = {
    model: 'qwen/qwen3.6-27b',
    messages,
    temperature: 0.3,
    max_tokens: 800
  };
  if (responseFormat) payload.response_format = responseFormat;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const status = response.status;
    throw new Error(`AI service temporarily unavailable (${status}).`);
  }

  const data = (await response.json()) as any;
  let content: string = data.choices?.[0]?.message?.content || '';

  // Strip <think>...</think> reasoning tokens from qwen models
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (content.includes('<think>')) {
    const parts = content.split('</think>');
    if (parts.length > 1) {
      content = parts.pop() || '';
    } else {
      content = content.replace(/<think>[\s\S]*/gi, ''); // no closing tag, strip everything after
    }
  }
  return content.trim();
}

async function callGroqChat(messages: any[]): Promise<string> {
  if (!config.groqApiKey) throw new Error('AI service is not configured.');

  const payload: any = {
    model: 'openai/gpt-oss-20b',
    messages,
    temperature: 0.5,
    max_tokens: 512
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`AI service error (${response.status}).`);
  const data = (await response.json()) as any;
  let content = data.choices?.[0]?.message?.content || '';
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (content.includes('<think>')) {
    const parts = content.split('</think>');
    if (parts.length > 1) {
      content = parts.pop() || '';
    } else {
      content = content.replace(/<think>[\s\S]*/gi, ''); // no closing tag, strip everything after
    }
  }
  return content.trim();
}

// ─── Intent Extraction ────────────────────────────────────────────────────────

async function extractShoppingIntent(
  message: string,
  context: ShopEverywhereContext
): Promise<ExtractedShoppingIntent> {
  const historySnippet = (context.conversationHistory || [])
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const previousResultsList = context.previousResults 
    ? context.previousResults.map(p => `${p.index}. ${p.title} (${p.price})`).join('\n')
    : 'None';

  const systemPrompt = `You are a shopping intent extraction engine for an Indian e-commerce AI assistant.
Analyze the user's message and return structured JSON. Be flexible — understand natural language, slang, and vague requests.

Rules:
- "intentType" MUST be one of: NEW_SEARCH, MORE_RESULTS, PRICE_REFINEMENT, FILTER_REFINEMENT, PRODUCT_REFERENCE, COMPARISON, CROSS_SELL_REQUEST, CATEGORY_CHANGE, UNKNOWN.
- "queries" is an array of search terms to look up. Usually 1, but for comparisons it can be 2+.
- For refinements ("show cheaper", "only Lenovo", "under 30000"), set intentType=PRICE_REFINEMENT or FILTER_REFINEMENT.
- If the user explicitly changes the subject (e.g. "actually show me phones"), set intentType=CATEGORY_CHANGE and output the new category.
- If the user asks for "more", "other options", "more options", or "5 more", set intentType=MORE_RESULTS. This applies even if they don't repeat the product category — use context.lastCategory / context.lastQuery to know what "more" refers to.
- If the user is responding to a cross-sell suggestion, set crossSellResponse to "yes" or "no". If they say "yes, under 500", include the budget in refinedMaxPrice. A bare "yes" or "yeah" or "sure" right after a pending cross-sell category is present in the context below MUST be treated as crossSellResponse="yes", NOT as a new search for the literal word "yes".
- "needsComparison" is true if user wants to compare products.
- Prices are in INR. "60k" = 60000. "under 30k" = maxPrice 30000.
- If the user refers to a previous product by number (e.g., "tell me about number 2"), set intentType=PRODUCT_REFERENCE, map it to the actual product title from the Previous Results context and include it in userFacingMessage or queries.

Do NOT return markdown. Return only raw JSON.

JSON Schema:
{
  "intentType": "NEW_SEARCH|MORE_RESULTS|PRICE_REFINEMENT|FILTER_REFINEMENT|PRODUCT_REFERENCE|COMPARISON|CROSS_SELL_REQUEST|CATEGORY_CHANGE|UNKNOWN",
  "queries": [{ "query": "string", "maxPrice": number|null, "minPrice": number|null, "category": "string|null" }],
  "needsComparison": boolean,
  "crossSellResponse": "yes" | "no" | "none",
  "refinedMaxPrice": number|null,
  "refinedMinPrice": number|null,
  "refinedBrands": ["array of brand strings"]|null,
  "userFacingMessage": "string"
}`;

  const userPrompt = `Previous conversation context:
${historySnippet || 'None'}

Last search: ${context.lastQuery || 'None'}
Last category: ${context.lastCategory || 'None'}
Last budget: Min ${context.budget?.min || 'None'} / Max ${context.budget?.max || 'None'}
Pending cross-sell: ${context.pendingCrossSellCategory || 'None'}
Previous Results: 
${previousResultsList}

Current message: "${message}"

Extract the shopping intent:`;

  try {
    let raw = await callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    );

    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(raw);
    return {
      intentType: parsed.intentType || ShoppingIntentType.NEW_SEARCH,
      queries: parsed.queries || [{ query: message }],
      needsComparison: parsed.needsComparison || false,
      crossSellResponse: parsed.crossSellResponse || 'none',
      refinedMaxPrice: parsed.refinedMaxPrice || undefined,
      refinedMinPrice: parsed.refinedMinPrice || undefined,
      refinedBrands: parsed.refinedBrands || undefined,
      userFacingMessage: parsed.userFacingMessage || message
    };
  } catch {
    // Fallback: Use simple heuristics if LLM JSON fails
    const lowerMessage = message.toLowerCase().trim();
    let fallbackIntent = ShoppingIntentType.NEW_SEARCH;
    let fallbackCrossSellResponse: 'yes' | 'no' | 'none' = 'none';

    // If there's a pending cross-sell and the user gives a short affirmative/negative reply,
    // treat it as answering the cross-sell question rather than a brand new search.
    if (context.pendingCrossSellCategory) {
      if (['yes', 'yeah', 'yep', 'sure', 'ok', 'okay'].includes(lowerMessage)) {
        fallbackCrossSellResponse = 'yes';
      } else if (['no', 'nope', 'nah'].includes(lowerMessage)) {
        fallbackCrossSellResponse = 'no';
      }
    }

    if (context.lastCategory) {
      if (lowerMessage.includes('more') || lowerMessage.includes('other options') || lowerMessage.includes('another')) {
        fallbackIntent = ShoppingIntentType.MORE_RESULTS;
      } else if (lowerMessage.includes('cheaper') || lowerMessage.includes('under') || lowerMessage.includes('below')) {
        fallbackIntent = ShoppingIntentType.PRICE_REFINEMENT;
      }
    }
    
    return {
      intentType: fallbackIntent,
      queries: [{ query: message }],
      needsComparison: false,
      crossSellResponse: fallbackCrossSellResponse,
      userFacingMessage: message
    };
  }
}

// ─── AI Response Generation ───────────────────────────────────────────────────

async function generateRecommendationMessage(
  userMessage: string,
  products: ExternalProduct[],
  intent: ExtractedShoppingIntent
): Promise<string> {
  if (products.length === 0) {
    return `I searched for **${intent.queries[0]?.query || 'your request'}** but couldn't find matching products right now. Try rephrasing or adjusting your budget!`;
  }

  const productList = products
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.title} — ${p.price}${p.rating ? ` — ⭐ ${p.rating}` : ''}${p.source ? ` via ${p.source}` : ''}`)
    .join('\n');

  const systemPrompt = `You are Riya, a friendly Indian shopping assistant. You help customers find the best products online.

STRICT RULES:
1. Reply conversationally in plain English — like a helpful friend.
2. Use **bold** for product names only.
3. NEVER invent prices, ratings, or specs — only reference what you were given.
4. Keep reply under 100 words.
5. End with one helpful follow-up question (e.g. "Want me to compare these?" or "Should I look for accessories?").
6. Do not output internal reasoning or JSON.`;

  const userPrompt = `Customer asked: "${userMessage}"

Products found:
${productList}

Write a natural, friendly response now:`;

  try {
    return await callGroqChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
  } catch {
    const top = products[0];
    return `Here's what I found! **${top.title}** at ${top.price} via ${top.source} looks like a great option. Want me to compare a few or look for accessories?`;
  }
}

async function generateComparisonMessage(
  userMessage: string,
  allProducts: ExternalProduct[]
): Promise<{ message: string; comparison: ComparisonData }> {
  const productList = allProducts
    .map((p, i) => `${i + 1}. ${p.title} — ${p.price}${p.rating ? ` — ⭐ ${p.rating}` : ''}${p.discount ? ` — ${p.discount}` : ''} via ${p.source}`)
    .join('\n');

  const systemPrompt = `You are a shopping comparison assistant for an Indian e-commerce store.

Output format (strictly follow):
- Two or three lines: **Product Name** — ₹Price — [1-2 key observed differences]
- One blank line
- Short verdict: "**Best value →** Product X because..."
- Then factors as a JSON array at the end in this format:
FACTORS_JSON: ["Best price → Product A", "Best rated → Product B", "Best deal → Product C"]

RULES:
1. NEVER invent specs or prices. Only use what's in the product data.
2. Compare based on price, rating, discount, and retailer.
3. Be concrete and helpful.
4. No internal reasoning — jump straight to the comparison.`;

  const userPrompt = `Customer asked: "${userMessage}"

Products to compare:
${productList}

Write the comparison now:`;

  try {
    const raw = await callGroqChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    // Extract FACTORS_JSON if present
    let factors: string[] | undefined;
    let summary = raw;
    const factorMatch = raw.match(/FACTORS_JSON:\s*(\[[\s\S]*?\])/);
    if (factorMatch) {
      try {
        factors = JSON.parse(factorMatch[1]);
        summary = raw.replace(/FACTORS_JSON:[\s\S]*/, '').trim();
      } catch {
        // ignore parse error, keep raw
      }
    }

    return { message: summary, comparison: { summary, factors } };
  } catch {
    const names = allProducts.map((p) => p.title).join(' vs ');
    return {
      message: `Here's a comparison of ${names}. Check the prices and ratings below to pick the best fit for you!`,
      comparison: { summary: `Comparing ${names}` }
    };
  }
}

async function generateCrossSellMessage(
  mainProduct: ExternalProduct,
  accessories: ExternalProduct[]
): Promise<string> {
  if (accessories.length === 0) return '';

  const accList = accessories
    .slice(0, 3)
    .map((a) => `• **${a.title}** — ${a.price} via ${a.source}`)
    .join('\n');

  const systemPrompt = `You are Riya, a friendly shopping assistant. Write 1-2 sentences explaining why the listed accessories pair well with the main product. Be specific, not generic. Under 50 words.`;

  try {
    return await callGroqChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Main product: ${mainProduct.title}\nAccessories:\n${accList}` }
    ]);
  } catch {
    return `Great choice! Here are some accessories that pair perfectly with the **${mainProduct.title}**:`;
  }
}

// ─── Refinement helpers ───────────────────────────────────────────────────────

function resolveSearchQuery(
  intent: ExtractedShoppingIntent,
  context: ShopEverywhereContext
): ShoppingSearchParams[] {
  // Always use the pending cross sell if accepted
  if (intent.intentType === ShoppingIntentType.CROSS_SELL_REQUEST && context.pendingCrossSellCategory) {
    return [{
      query: context.pendingCrossSellCategory,
      maxPrice: intent.refinedMaxPrice || undefined,
      minPrice: intent.refinedMinPrice || undefined
    }];
  }

  // Handle explicitly new searches or category changes
  if (intent.intentType === ShoppingIntentType.NEW_SEARCH || intent.intentType === ShoppingIntentType.CATEGORY_CHANGE) {
    return intent.queries.map((q) => ({
      query: q.query,
      maxPrice: q.maxPrice || undefined,
      minPrice: q.minPrice || undefined,
      category: q.category || undefined
    }));
  }

  // Handle Refinements & More Results
  // Strictly prevent literal words like "more" or "cheaper" from overriding the core product category
  let baseQuery = context.lastCategory || context.lastQuery || '';
  if (intent.queries[0]?.query && 
      !['more', 'more options', 'another', 'cheaper', 'options'].includes(intent.queries[0].query.toLowerCase())) {
    baseQuery = intent.queries[0].query; // Use LLM query only if it seems safe (not just a relative word)
  }

  // Merge budget and filters
  const baseMaxPrice = intent.refinedMaxPrice || intent.queries[0]?.maxPrice || context.budget?.max || context.lastMaxPrice;
  const baseMinPrice = intent.refinedMinPrice || intent.queries[0]?.minPrice || context.budget?.min || context.lastMinPrice;
  const brands = intent.refinedBrands || context.filters?.brands || context.preferredBrands;

  let query = baseQuery;
  if (brands && brands.length > 0) {
    query = `${brands.join(' OR ')} ${baseQuery}`;
  }

  const searchParams: ShoppingSearchParams = { query, maxPrice: baseMaxPrice, minPrice: baseMinPrice };
  
  if (intent.intentType === ShoppingIntentType.MORE_RESULTS && context.shownProductUrls) {
    searchParams.excludeUrls = context.shownProductUrls;
  }

  return [searchParams];
}

// ─── Deterministic cross-sell pairing ─────────────────────────────────────────
// NOTE: both of these live at MODULE scope (not nested inside any function)
// so they are visible to ShopEverywhereAgent.handleChat below.

const CROSS_SELL_MAP: Record<string, string[]> = {
  shoe: ['socks', 'shoe cleaner kit'],
  shoes: ['socks', 'shoe cleaner kit'],
  sneaker: ['socks', 'shoe cleaner kit'],
  sneakers: ['socks', 'shoe cleaner kit'],
  sandal: ['socks'],
  sandals: ['socks'],
  phone: ['power bank', 'phone case', 'screen protector'],
  smartphone: ['power bank', 'phone case', 'screen protector'],
  mobile: ['power bank', 'phone case', 'screen protector'],
  iphone: ['power bank', 'phone case', 'screen protector'],
  laptop: ['laptop bag', 'cooling pad', 'wireless mouse'],
  notebook: ['laptop bag', 'cooling pad', 'wireless mouse'],
  table: ['chair'],
  desk: ['chair', 'desk lamp'],
  mattress: ['bedsheet', 'pillow'],
  bed: ['mattress protector', 'bedsheet'],
  camera: ['memory card', 'tripod', 'camera bag'],
  headphone: ['carrying case'],
  headphones: ['carrying case'],
  earbud: ['carrying case'],
  earbuds: ['carrying case'],
  tv: ['wall mount', 'HDMI cable'],
  television: ['wall mount', 'HDMI cable'],
  watch: ['watch strap'],
  keyboard: ['mouse'],
  monitor: ['HDMI cable', 'monitor stand'],
  printer: ['ink cartridge'],
  saree: ['blouse piece'],
  suit: ['tie'],
  backpack: ['rain cover'],
};

function resolveCrossSellCategory(
  productTitle: string,
  alreadySuggested: string[] = []
): string | undefined {
  const title = productTitle.toLowerCase();

  for (const [keyword, accessories] of Object.entries(CROSS_SELL_MAP)) {
    if (title.includes(keyword)) {
      const next = accessories.find(a => !alreadySuggested.includes(a));
      if (next) return next;
    }
  }
  return undefined;
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

export class ShopEverywhereAgent {
  static async handleChat(input: ShopEverywhereInput): Promise<ShopEverywhereResponse> {
    const { message, userId } = input;

    // --- Step 0: Load context ---
    // Prefer context passed in by the caller (frontend/route), but merge it on top of
    // whatever the server has remembered for this userId. This means even if the
    // frontend fails to send accumulatedContext back, the server-side session store
    // still has it, so the conversation doesn't lose memory.
    const storedContext = loadSessionContext(userId);
    const accumulatedContext: ShopEverywhereContext = {
      ...storedContext,
      ...(input.accumulatedContext || {})
    };

    // --- Step 1: Extract intent via LLM ---
    const intent = await extractShoppingIntent(message, accumulatedContext);

    // Answering a clarification resumes the original category search and keeps the
    // answer attached to the query so SerpApi can use both pieces of information.
    const pendingClarification = accumulatedContext.pendingClarification;
    let clarificationWasAnswered = false;
    if (pendingClarification && intent.crossSellResponse !== 'yes' && intent.crossSellResponse !== 'no') {
      clarificationWasAnswered = true;
      intent.intentType = ShoppingIntentType.NEW_SEARCH;
      intent.queries = [{
        query: `${pendingClarification.originalQuery} ${message}`,
        category: pendingClarification.category
      }];
    }

    // Broad categories get one short clarification turn before the first search.
    const firstIntentQuery = intent.queries[0]?.query || message;
    const clarification = intent.intentType === ShoppingIntentType.NEW_SEARCH
      || intent.intentType === ShoppingIntentType.CATEGORY_CHANGE
      ? resolveClarification(firstIntentQuery)
      : undefined;
    if (clarification && !pendingClarification && !hasMeaningfulShoppingDetail(message)) {
      const updatedContext: ShopEverywhereContext = {
        ...accumulatedContext,
        pendingClarification: {
          category: clarification.category,
          originalQuery: firstIntentQuery,
          questions: clarification.questions
        },
        conversationHistory: [
          ...(accumulatedContext.conversationHistory || []).slice(-6),
          { role: 'user', content: message },
          { role: 'assistant', content: clarification.questions.join(' ') }
        ]
      };
      saveSessionContext(userId, updatedContext);
      return {
        message: clarification.questions.join(' '),
        externalProducts: [],
        updatedContext
      };
    }

    // --- Step 2: Build search params ---
    // Enforce cross sell translation if user said "yes"
    if (intent.crossSellResponse === 'yes') {
      intent.intentType = ShoppingIntentType.CROSS_SELL_REQUEST;
      intent.queries[0] = { query: accumulatedContext.pendingCrossSellCategory || '' };
    }

    const searchQueries = resolveSearchQuery(intent, accumulatedContext);

    // --- Step 3: Fetch products from SerpApi ---
    const allResultSets = await ShoppingService.searchMultiple(searchQueries);
    const allProducts = allResultSets.flat();

    // For comparison: collect first result from each query set
    let comparisonProducts = intent.needsComparison && allResultSets.length > 1
      ? allResultSets.map((set) => set.slice(0, 2)).flat()
      : allResultSets[0]?.slice(0, 6) || [];

    // --- Step 4: Cross-sell logic ---
    let crossSellProducts: ExternalProduct[] | undefined;
    let crossSellMessage = '';
    let newPendingCrossSell: string | undefined;

    // Handle cross-sell response (User said Yes to previous suggestion)
    if (intent.crossSellResponse === 'yes') {
      newPendingCrossSell = undefined; // Already executed as main search in Step 2
      AuditService.logEvent({
        eventType: 'RECOMMENDATION',
        actor: 'user',
        action: 'recommendation_accepted',
        metadata: { category: accumulatedContext.pendingCrossSellCategory }
      });
    } 
    // Handle cross-sell response (User said No)
    else if (intent.crossSellResponse === 'no') {
      newPendingCrossSell = undefined; // Clear it
      AuditService.logEvent({
        eventType: 'RECOMMENDATION',
        actor: 'user',
        action: 'recommendation_rejected',
        metadata: { category: accumulatedContext.pendingCrossSellCategory }
      });
    }
    // Handle new cross-sell suggestion (deterministic lookup, not LLM-guessed)
    else if (comparisonProducts.length > 0) {
      const mainProduct = comparisonProducts[0];
      const alreadySuggested = accumulatedContext.suggestedCrossSellCategories || [];
      const matchedCategory = resolveCrossSellCategory(mainProduct.title, alreadySuggested);

      // DEBUG — remove once confirmed working
      console.log('[CrossSell debug]', {
        mainProductTitle: mainProduct.title,
        alreadySuggested,
        matchedCategory
      });

      if (matchedCategory) {
        newPendingCrossSell = matchedCategory;
        crossSellMessage = `💡 Since you're looking at ${mainProduct.title.split(' ').slice(0, 2).join(' ')}, would you like me to show you some ${matchedCategory}?`;

        AuditService.logEvent({
          eventType: 'RECOMMENDATION',
          actor: 'ai',
          action: 'recommendation_shown',
          metadata: { primaryProduct: mainProduct.title, crossSellCategory: matchedCategory }
        });
      }
    }

    // --- Step 5: Generate AI response message ---
    let message_response: string;
    let comparison: ComparisonData | undefined;

    if (intent.needsComparison && comparisonProducts.length >= 2) {
      const result = await generateComparisonMessage(message, comparisonProducts);
      message_response = result.message;
      comparison = result.comparison;
    } else {
      message_response = await generateRecommendationMessage(message, comparisonProducts, intent);
    }

    // NOTE: crossSellMessage is intentionally NOT appended to message_response here.
    // It's returned separately as `crossSellPrompt` so the frontend can render it
    // after the product cards instead of inline above them.

    // --- Step 6: Update accumulated context ---
    const firstQuery = searchQueries[0];
    const isMoreResults = intent.intentType === ShoppingIntentType.MORE_RESULTS;
    
    // Accumulate shown URLs so we don't repeat them
    const newShownUrls = comparisonProducts.map(p => p.productUrl);
    const updatedShownUrls = isMoreResults 
      ? [...(accumulatedContext.shownProductUrls || []), ...newShownUrls]
      : newShownUrls;
      
    // Maintain stable indices for previous results
    let nextIndex = isMoreResults && accumulatedContext.previousResults ? accumulatedContext.previousResults.length + 1 : 1;
    const newPreviousResults = comparisonProducts.map(p => ({
      index: nextIndex++,
      title: p.title,
      url: p.productUrl,
      price: p.price,
      source: p.source
    }));
    
    const updatedPreviousResults = isMoreResults 
      ? [...(accumulatedContext.previousResults || []), ...newPreviousResults]
      : newPreviousResults;

    const isReset = intent.intentType === ShoppingIntentType.CATEGORY_CHANGE || intent.intentType === ShoppingIntentType.NEW_SEARCH || intent.intentType === ShoppingIntentType.CROSS_SELL_REQUEST;

    const updatedContext: ShopEverywhereContext = {
      ...accumulatedContext,
      lastQuery: isReset ? intent.queries[0]?.query : (firstQuery?.query || accumulatedContext.lastQuery),
      lastCategory: isReset ? intent.queries[0]?.category : (intent.queries[0]?.category || accumulatedContext.lastCategory),
      lastMaxPrice: isReset ? intent.queries[0]?.maxPrice : (firstQuery?.maxPrice || accumulatedContext.lastMaxPrice),
      lastMinPrice: isReset ? intent.queries[0]?.minPrice : (firstQuery?.minPrice || accumulatedContext.lastMinPrice),
      budget: isReset ? { min: intent.queries[0]?.minPrice, max: intent.queries[0]?.maxPrice } : { 
        min: firstQuery?.minPrice || accumulatedContext.budget?.min, 
        max: firstQuery?.maxPrice || accumulatedContext.budget?.max 
      },
      filters: isReset ? { brands: intent.refinedBrands } : { 
        brands: intent.refinedBrands || accumulatedContext.filters?.brands 
      },
      lastProducts: comparisonProducts,
      shownProductUrls: updatedShownUrls,
      previousResults: updatedPreviousResults,
      pendingCrossSellCategory: newPendingCrossSell,
      pendingClarification: clarificationWasAnswered ? undefined : accumulatedContext.pendingClarification,
      suggestedCrossSellCategories: newPendingCrossSell
        ? [...(accumulatedContext.suggestedCrossSellCategories || []), newPendingCrossSell]
        : accumulatedContext.suggestedCrossSellCategories,
      preferredBrands: isReset ? intent.refinedBrands : (intent.refinedBrands || accumulatedContext.preferredBrands),
      conversationHistory: [
        ...(accumulatedContext.conversationHistory || []).slice(-6),
        { role: 'user', content: message },
        { role: 'assistant', content: message_response }
      ]
    };

    // --- Step 7: Persist context server-side for this session/user ---
    saveSessionContext(userId, updatedContext);

    return {
      message: message_response,
      externalProducts: comparisonProducts,
      crossSellProducts: crossSellProducts && crossSellProducts.length > 0 ? crossSellProducts : undefined,
      crossSellPrompt: crossSellMessage || undefined,
      comparison,
      updatedContext
    };
  }
}