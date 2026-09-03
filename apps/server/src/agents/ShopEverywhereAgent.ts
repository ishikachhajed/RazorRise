import { ShoppingService, ExternalProduct, ShoppingSearchParams } from '../services/ShoppingService.js';
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
  comparison?: ComparisonData;
  updatedContext: ShopEverywhereContext;
}

/**
 * Structured parameters extracted from user message by the LLM.
 * This replaces a rigid enum-based intent classifier.
 */
interface ExtractedShoppingIntent {
  queries: Array<{
    query: string;
    maxPrice?: number;
    minPrice?: number;
    category?: string;
  }>;
  needsComparison: boolean;
  crossSellNeeded: boolean;
  crossSellCategory?: string;      // e.g. "power bank", "laptop cooling pad"
  isRefinement: boolean;           // "show me something cheaper"
  wantsMore?: boolean;             // "show more", "other options"
  refinedMaxPrice?: number;
  refinedMinPrice?: number;
  refinedBrands?: string[];
  userFacingMessage: string;       // short summary of what the AI understood
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

  return content;
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
  return (data.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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

  const systemPrompt = `You are a shopping intent extraction engine for an Indian e-commerce AI assistant.
Analyze the user's message and return structured JSON. Be flexible — understand natural language, slang, and vague requests.

Rules:
- "queries" is an array of search terms to look up. Usually 1, but for comparisons it can be 2+.
- For refinements ("show cheaper", "only Lenovo", "increase budget"), set isRefinement=true and adjust price/brand filters.
- If the user asks for "more", "other options", or "5 more", set wantsMore=true and isRefinement=true.
- "crossSellNeeded" is true if the user asks for accessories or complementary items ("and a power bank", "what else do I need?").
- "crossSellCategory" should be a specific accessory query string like "power bank for phone" or "laptop cooling pad".
- "needsComparison" is true if user wants to compare products.
- Prices are in INR. "60k" = 60000. "under 30k" = maxPrice 30000. "around 50k" = maxPrice 55000.
- IMPORTANT: If isRefinement=true, ensure the query retains the context of the previous search (e.g. if previous query was "ladies suits" and user says "cheaper", the new query should be "ladies suits").
- Return a userFacingMessage (1 short sentence in friendly English) describing what you understood.

Do NOT return markdown. Return only raw JSON.

JSON Schema:
{
  "queries": [{ "query": "string", "maxPrice": number|null, "minPrice": number|null, "category": "string|null" }],
  "needsComparison": boolean,
  "crossSellNeeded": boolean,
  "crossSellCategory": "string|null",
  "isRefinement": boolean,
  "wantsMore": boolean,
  "refinedMaxPrice": number|null,
  "refinedMinPrice": number|null,
  "refinedBrands": ["array of brand strings"]|null,
  "userFacingMessage": "string"
}`;

  const userPrompt = `Previous conversation context:
${historySnippet || 'None'}

Last search: ${context.lastQuery || 'None'}
Last category: ${context.lastCategory || 'None'}

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
      queries: parsed.queries || [{ query: message }],
      needsComparison: parsed.needsComparison || false,
      crossSellNeeded: parsed.crossSellNeeded || false,
      crossSellCategory: parsed.crossSellCategory || undefined,
      isRefinement: parsed.isRefinement || false,
      wantsMore: parsed.wantsMore || false,
      refinedMaxPrice: parsed.refinedMaxPrice || undefined,
      refinedMinPrice: parsed.refinedMinPrice || undefined,
      refinedBrands: parsed.refinedBrands || undefined,
      userFacingMessage: parsed.userFacingMessage || message
    };
  } catch {
    // Fallback: treat entire message as a single search query
    return {
      queries: [{ query: message }],
      needsComparison: false,
      crossSellNeeded: false,
      isRefinement: false,
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

function buildRefinedSearchParams(
  intent: ExtractedShoppingIntent,
  context: ShopEverywhereContext
): ShoppingSearchParams {
  const baseQuery = context.lastQuery || intent.queries[0]?.query || '';
  const baseMaxPrice = intent.refinedMaxPrice || intent.queries[0]?.maxPrice || context.lastMaxPrice;
  const baseMinPrice = intent.refinedMinPrice || intent.queries[0]?.minPrice || context.lastMinPrice;
  const brands = intent.refinedBrands || context.preferredBrands;

  let query = baseQuery;
  if (brands && brands.length > 0) {
    query = `${brands.join(' OR ')} ${baseQuery}`;
  }

  return { query, maxPrice: baseMaxPrice, minPrice: baseMinPrice };
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

export class ShopEverywhereAgent {
  static async handleChat(input: ShopEverywhereInput): Promise<ShopEverywhereResponse> {
    const { message, accumulatedContext = {} } = input;

    // --- Step 1: Extract intent via LLM ---
    const intent = await extractShoppingIntent(message, accumulatedContext);

    // --- Step 2: Build search params ---
    let searchQueries: ShoppingSearchParams[];

    if (intent.isRefinement && accumulatedContext.lastQuery) {
      // User is refining a previous search (cheaper, different brand, etc.)
      const refined = buildRefinedSearchParams(intent, accumulatedContext);
      if (intent.wantsMore && accumulatedContext.shownProductUrls) {
        refined.excludeUrls = accumulatedContext.shownProductUrls;
      }
      searchQueries = [refined];
    } else {
      searchQueries = intent.queries.map((q) => ({
        query: q.query,
        maxPrice: q.maxPrice || undefined,
        minPrice: q.minPrice || undefined,
        category: q.category || undefined
      }));
    }

    // --- Step 3: Fetch products from SerpApi ---
    const allResultSets = await ShoppingService.searchMultiple(searchQueries);
    const allProducts = allResultSets.flat();

    // For comparison: collect first result from each query set
    const comparisonProducts = intent.needsComparison && allResultSets.length > 1
      ? allResultSets.map((set) => set.slice(0, 2)).flat()
      : allResultSets[0]?.slice(0, 6) || [];

    // --- Step 4: Cross-sell search (if needed) ---
    let crossSellProducts: ExternalProduct[] | undefined;
    let crossSellMessage = '';

    if (intent.crossSellNeeded && intent.crossSellCategory && comparisonProducts.length > 0) {
      const mainProduct = comparisonProducts[0];
      const crossSellQuery = `${intent.crossSellCategory} for ${mainProduct.title.split(' ').slice(0, 3).join(' ')}`;
      try {
        const crossResults = await ShoppingService.searchProducts({
          query: crossSellQuery,
          maxPrice: searchQueries[0]?.maxPrice ? Math.floor(searchQueries[0].maxPrice * 0.25) : undefined
        });
        crossSellProducts = crossResults.slice(0, 3);
        if (crossSellProducts.length > 0) {
          crossSellMessage = await generateCrossSellMessage(mainProduct, crossSellProducts);
        }
      } catch {
        // Cross-sell failure is non-fatal
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

    // Append cross-sell message if present
    if (crossSellMessage && crossSellProducts && crossSellProducts.length > 0) {
      message_response += `\n\n${crossSellMessage}`;
    }

    // --- Step 6: Update accumulated context ---
    const firstQuery = searchQueries[0];
    
    // Accumulate shown URLs so we don't repeat them
    const newShownUrls = comparisonProducts.map(p => p.productUrl);
    const updatedShownUrls = intent.wantsMore 
      ? [...(accumulatedContext.shownProductUrls || []), ...newShownUrls]
      : newShownUrls;

    const updatedContext: ShopEverywhereContext = {
      ...accumulatedContext,
      lastQuery: firstQuery?.query || accumulatedContext.lastQuery,
      lastCategory: intent.queries[0]?.category || accumulatedContext.lastCategory,
      lastMaxPrice: firstQuery?.maxPrice || accumulatedContext.lastMaxPrice,
      lastMinPrice: firstQuery?.minPrice || accumulatedContext.lastMinPrice,
      lastProducts: comparisonProducts,
      shownProductUrls: updatedShownUrls,
      preferredBrands: intent.refinedBrands || accumulatedContext.preferredBrands,
      conversationHistory: [
        ...(accumulatedContext.conversationHistory || []).slice(-6),
        { role: 'user', content: message },
        { role: 'assistant', content: message_response }
      ]
    };

    return {
      message: message_response,
      externalProducts: comparisonProducts,
      crossSellProducts: crossSellProducts && crossSellProducts.length > 0 ? crossSellProducts : undefined,
      comparison,
      updatedContext
    };
  }
}
