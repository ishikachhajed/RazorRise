# 🛍️ SHOP EVERYWHERE

This document explains the architecture and behavior of the **Shop Everywhere** AI mode in RazorRise.

## Purpose
While "My Store" acts as a local merchant assistant, "Shop Everywhere" transforms the AI into a powerful external product aggregator. It allows users to search the wider internet (Amazon, Flipkart, Myntra, etc.) for products using natural language.

## Architecture & Flow

```
User types "Find me ladies suits"
  ↓
Chat UI sends POST /api/ai/chat (mode: 'shop_everywhere')
  ↓
ShopEverywhereAgent extracts intent (using Groq)
  ↓
ShoppingService calls SerpApi (Google Shopping)
  ↓
Backend normalizes the ExternalProduct results
  ↓
Agent returns conversational response + ExternalProducts
  ↓
UI renders ExternalProductCards
  ↓
User clicks "View Deal" and is redirected to the external marketplace
```

## Conversational Refinement & Memory
The core strength of Shop Everywhere is its context-aware memory.

When a user types a sequence like:
1. *"Show me ladies suits"* (Base search)
2. *"More options"* (Refinement/Pagination)
3. *"Cheaper ones"* (Refinement - Budget)
4. *"Under ₹1500"* (Refinement - Budget)
5. *"Black ones"* (Refinement - Keyword)

**How it works internally:**
- The agent tracks a highly structured `ShopEverywhereContext`, specifically maintaining `budget`, `filters`, `previousResults` (stable numeric mapping), `lastCategory`, and `shownProductUrls`.
- The Groq intent extractor assigns a strict `ShoppingIntentType` enum (`NEW_SEARCH`, `MORE_RESULTS`, `PRICE_REFINEMENT`, `CATEGORY_CHANGE`, etc.) instead of relying on loose flags or strings.
- **Deterministic Query Resolution:** Before sending any query to the external search, a dedicated query resolution pipeline runs:
  - **Budget & Category Preservation:** If the intent is `PRICE_REFINEMENT` ("under 30000") or `MORE_RESULTS` ("more options"), the AI explicitly inherits the `lastCategory` from context, preventing literal relative words like "more" from accidentally overriding the search subject.
  - **Subject Switching:** If the intent is `CATEGORY_CHANGE` ("actually, show me phones"), the AI actively clears out the old context tree and starts fresh.
- **Stable References:** `previousResults` maintains a persistent mapping (e.g. `1. ASUS, 2. Lenovo`). If the user says "Tell me about number 2", the AI maps it directly to the previous Lenovo result.
- If the user asks for "more", it passes `shownProductUrls` to `ShoppingService` as `excludeUrls` to filter out duplicates.

## Context-Aware Cross-Selling
When appropriate, the AI can propose complementary products (e.g., offering laptop bags after searching for laptops). 
1. **Suggestion:** The AI sets a `pendingCrossSellCategory` and asks the user if they'd like to see it. It **does not** perform the search yet.
2. **Acceptance:** If the user agrees ("Yes", "Sure, under 500"), the AI executes the cross-sell search using the pending category, applying any new constraints the user provided.

## Comparison Feature
If the user explicitly asks to "compare" products (e.g., *"Compare the first two"*), the LLM sets `needsComparison: true`. The backend builds a side-by-side `ComparisonData` object detailing the strengths and weaknesses of the selected products, which is rendered in the UI via `ComparisonView.tsx`.

## External Products Isolation
Products retrieved in "Shop Everywhere" mode are typed as `ExternalProduct`.
They **DO NOT** enter the local merchant SQLite database, and they **CANNOT** be added to the local shopping cart. They strictly act as referral links ("View Deal").

## Security
- The `SERPAPI_KEY` used to fetch these results is strictly maintained in the backend `apps/server/.env`.
- The frontend **never** holds or transmits this key.
- Error messages from SerpApi are sanitized in `ShoppingService.ts` to ensure the API key or authenticated URLs are never leaked to the client.
