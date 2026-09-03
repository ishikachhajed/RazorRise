import { AIProvider, ExtractedIntent } from './AIProvider.js';
import { MockAIProvider } from './MockAIProvider.js';
import { config } from '../config/index.js';

// Phrases that indicate the LLM leaked internal reasoning instead of a clean response
const REASONING_LEAK_PATTERNS = [
  /^analyze/i,
  /^draft:/i,
  /^self-correction/i,
  /^checks:/i,
  /^here's (a |my |the )?thinking/i,
  /^let me (verify|check|think|analyze)/i,
  /^step \d+/i,
  /extracted intent/i,
  /^reasoning:/i,
  /^planning:/i,
];

function hasReasoningLeak(text: string): boolean {
  const firstLine = text.split('\n')[0].trim();
  return REASONING_LEAK_PATTERNS.some((p) => p.test(firstLine));
}

export class GroqAIProvider implements AIProvider {
  private fallbackProvider = new MockAIProvider();
  private chatModelName = 'openai/gpt-oss-20b';      // Fast, clean chat — no thinking tokens
  private extractModelName = 'qwen/qwen3.6-27b';     // Good JSON extraction with thinking stripped

  private async callGroq(messages: any[], responseFormat?: any, model?: string): Promise<string> {
    if (!config.groqApiKey) {
      throw new Error('Groq API Key is not configured');
    }

    const selectedModel = model || this.chatModelName;
    const payload: any = {
      model: selectedModel,
      messages,
      temperature: 0.4,
      max_tokens: 512
    };

    if (responseFormat) {
      payload.response_format = responseFormat;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.groqApiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API response error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    let content = data.choices?.[0]?.message?.content || '';

    // Strip <think>...</think> reasoning tags produced by reasoning models (qwen etc.)
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Also strip any residual thinking patterns line by line for extra safety
    const lines = content.split('\n');
    const cleanLines = lines.filter((line: string) => !hasReasoningLeak(line));
    content = cleanLines.join('\n').trim();

    return content;
  }

  async extractIntent(userQuery: string, previousIntent?: ExtractedIntent): Promise<ExtractedIntent> {
    try {
      console.log(`[GROQ AI] Analyzing query: "${userQuery}"`);
      let promptContext = '';
      if (previousIntent && previousIntent.category !== 'unknown') {
        promptContext = `
Previous Intent Context:
- Category: ${previousIntent.category}
- Raw Query: ${previousIntent.rawQuery}

If the user's new query is a refinement (e.g., "cheaper", "more", "under 2000", "black one"), YOU MUST output the exact same category ("${previousIntent.category}"). Do NOT output "unknown" or a different category unless the user is explicitly changing the subject.
`;
      }

      const systemPrompt = `You are the intent extraction engine for an e-commerce AI commerce agent.
Analyze the user's shopping query and return a structured JSON response.
Do NOT include any markdown packaging (like \`\`\`json). Return only a raw JSON object.

Allowed categories: "laptop", "smartphone", "headphones", "keyboards", "mice", "monitors", "backpacks", "accessories", "unknown", "needs_clarification".
Allowed useCases: "coding/work", "gaming", "travel/school", "general".
Allowed basketScope: "single_item", "complete_setup", "unknown".
Allowed budgetType: "hard", "flexible", "unknown".
Allowed performancePreference: "lowest_price", "balanced", "premium", null.

Rules:
- If the user query is vague (e.g. just "keyboard", "accessories"), return category as is but set useCases to empty array.
- budgetMax should be null if no budget mentioned.
- If query contains "only", "just the", "don't want anything else" → basketScope = "single_item".
- If query contains "setup", "everything", "bundle" → basketScope = "complete_setup".
- If query contains "compare", "vs", "difference between", "which is better" → set isComparisonRequest = true.
- If query contains "discount", "offer", "coupon", "% off" → set hasDiscountIntent = true.
- If the query is just a follow-up refinement (e.g. "more options", "cheaper ones", "under 2000"), carry over the relevant previous intent context if provided.
${promptContext}
JSON Schema:
{
  "category": "string",
  "budgetMax": "number | null",
  "budgetType": "string",
  "useCases": ["array of strings"],
  "features": ["array of strings"],
  "basketScope": "string",
  "performancePreference": "string | null",
  "priceSensitivity": "string | null",
  "isComparisonRequest": "boolean",
  "hasDiscountIntent": "boolean"
}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Query: "${userQuery}"` }
      ];

      let rawJson = await this.callGroq(messages, undefined, this.extractModelName);
      rawJson = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(rawJson);

      return {
        category: parsed.category || 'unknown',
        budgetMax: parsed.budgetMax || undefined,
        budgetType: parsed.budgetType || 'unknown',
        useCases: parsed.useCases || [],
        features: parsed.features || [],
        basketScope: parsed.basketScope || 'unknown',
        performancePreference: parsed.performancePreference || undefined,
        priceSensitivity: parsed.priceSensitivity || undefined,
        rawQuery: userQuery,
        isComparisonRequest: parsed.isComparisonRequest || false,
        hasDiscountIntent: parsed.hasDiscountIntent || false,
      } as any;
    } catch (error: any) {
      console.warn(`[GROQ AI FALLBACK] Intent extraction failed, falling back to Mock AI Provider. Reason:`, error.message);
      return this.fallbackProvider.extractIntent(userQuery, previousIntent);
    }
  }

  async generateRecommendationResponse(query: string, intent: ExtractedIntent, candidates: any[], decision?: any): Promise<string> {
    try {
      // CLARIFYING QUESTION: no candidates, AI asked for more info
      if (decision === 'ASK_CLARIFYING_QUESTION') {
        return this.generateClarifyingQuestion(query, intent);
      }

      // OFF-TOPIC GUARD: if category is unknown and no candidates, reply conversationally
      if ((!candidates || candidates.length === 0) && (intent as any).category === 'unknown') {
        return this.generateOffTopicResponse(query);
      }

      if (!candidates || candidates.length === 0) {
        return this.fallbackProvider.generateRecommendationResponse(query, intent, candidates, decision);
      }

      // ── COMPARISON MODE ──
      if ((intent as any).isComparisonRequest && candidates.length >= 2) {
        return this.generateComparisonResponse(query, candidates, intent);
      }

      console.log(`[GROQ AI] Generating recommendation for ${candidates.length} candidates. Decision: ${decision}`);

      const systemPrompt = `You are Riya, a friendly shopping assistant for an Indian e-commerce store. You help customers find the right product.

STRICT RULES:
1. Reply in plain, conversational English — like a helpful store associate talking to a customer.
2. NEVER output any internal reasoning, analysis steps, or self-correction. Jump straight to the reply.
3. Use **bold** only for product names. Use a new line (not comma) between each product if listing multiple.
4. For each product show: name, price in ₹, and 2 key specs only.
5. End with ONE helpful question to guide the customer (e.g. "Want me to add this to your cart?" or "Which one feels right for you?").
6. Keep the total reply under 120 words.`;

      const promptUser = `Customer message: "${query}"

Products available:
${candidates.slice(0, 6).map((c, i) => `${i + 1}. ${c.name} — ₹${c.price.toLocaleString('en-IN')} — ${(c.features || []).slice(0, 2).join(', ')}`).join('\n')}

Write your reply now:`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptUser }
      ];

      return await this.callGroq(messages, undefined, this.chatModelName);
    } catch (error: any) {
      console.warn(`[GROQ AI FALLBACK] Response generation failed, falling back to Mock AI Provider. Reason:`, error.message);
      return this.fallbackProvider.generateRecommendationResponse(query, intent, candidates, decision);
    }
  }

  private async generateOffTopicResponse(query: string): Promise<string> {
    try {
      const systemPrompt = `You are Riya, a shopping assistant for an Indian e-commerce store that sells laptops, smartphones, headphones, keyboards, mice, monitors, and accessories.

If a customer asks something outside your scope (general knowledge, news, etc.), politely say you can only help with shopping. Be warm and brief — 1-2 sentences max.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ];

      return await this.callGroq(messages, undefined, this.chatModelName);
    } catch {
      return "I'm your shopping assistant — I can help you find laptops, smartphones, headphones and more! What are you looking for today? 😊";
    }
  }

  private async generateClarifyingQuestion(query: string, intent: ExtractedIntent): Promise<string> {
    try {
      const systemPrompt = `You are Riya, a friendly shopping assistant. Ask the customer ONE short, natural follow-up question to understand their needs better. Be conversational. 1 sentence max.`;
      
      let userPrompt = '';
      if (intent.category === 'unknown' || intent.category === 'needs_clarification') {
        userPrompt = `Customer said: "${query}". We don't know what product they want yet. Ask them what they are looking to buy (e.g., laptop, phone, headphones).`;
      } else {
        userPrompt = `Customer said: "${query}". They want a ${intent.category}. Ask a helpful clarifying question about their budget, use case, or preference.`;
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      return await this.callGroq(messages, undefined, this.chatModelName);
    } catch {
      return `Sure! To find the best option for you, could you tell me your budget and what you'll mainly use it for?`;
    }
  }

  private async generateComparisonResponse(query: string, candidates: any[], intent: ExtractedIntent): Promise<string> {
    try {
      const systemPrompt = `You are a shopping assistant doing a direct product comparison.
Output format (strictly follow this):
- One line per product: **Product Name** — ₹Price — [2-3 key specs separated by commas]
- One blank line
- One verdict line: "**Verdict:** [which is better and why in plain language]"

RULES:
1. No preamble, no analysis, no explanations of your process.
2. Specs must be relevant to the customer's stated use case.
3. Verdict must be concrete — name the winner and give one plain-language reason.
4. No internal scores, match percentages, or JSON.`;

      const promptUser = `Customer asked: "${query}"

Products to compare:
${JSON.stringify(candidates.slice(0, 3).map(c => ({ name: c.name, price: c.price, features: c.features, specifications: c.specifications })))}

Write the comparison now. Start with the product lines.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptUser }
      ];

      return await this.callGroq(messages, undefined, this.chatModelName);
    } catch (error: any) {
      // Fallback: build a simple comparison from the data directly
      const lines = candidates.slice(0, 2).map(c =>
        `• **${c.name}** — ₹${c.price.toLocaleString('en-IN')} — ${(c.features || []).slice(0, 3).join(', ')}`
      );
      lines.push(`\n**Verdict:** Both are solid options — the ${candidates[0].name} is generally a safer pick for most users.`);
      return lines.join('\n');
    }
  }

  async makeAdaptiveDecision(intent: ExtractedIntent, cartContext?: any): Promise<{decision: any, reason: string}> {
    // Just fallback to mock for now
    return this.fallbackProvider.makeAdaptiveDecision(intent, cartContext);
  }

  async generateUpsellSuggestion(selectedProduct: any, intent: ExtractedIntent): Promise<any> {
    try {
      if (!selectedProduct) return null;

      const fallbackSuggestion = await this.fallbackProvider.generateUpsellSuggestion(selectedProduct, intent);
      if (!fallbackSuggestion) return null;

      console.log(`[GROQ AI] Crafting personalized upsell text for ${selectedProduct.name}.`);

      const systemPrompt = `Write a 1-sentence reason (under 25 words) why a customer buying the selected product should also get the accessory. Be specific about a technical benefit (ports, battery, ergonomics). No generic phrases.`;

      const promptUser = `Product: "${selectedProduct.name}"
Accessory: "${fallbackSuggestion.product.name}" — ${fallbackSuggestion.product.description}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptUser }
      ];

      const customReason = await this.callGroq(messages, undefined, this.chatModelName);

      return {
        ...fallbackSuggestion,
        reason: customReason.trim().replace(/^"|"$/g, '')
      };
    } catch (error: any) {
      console.warn(`[GROQ AI FALLBACK] Upsell generation failed. Reason:`, error.message);
      return this.fallbackProvider.generateUpsellSuggestion(selectedProduct, intent);
    }
  }
}
