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
- The agent tracks `ShopEverywhereContext`, specifically `lastCategory`, `lastQuery`, and `shownProductUrls`.
- For follow-up queries, the Groq intent extractor sets `isRefinement: true`.
- The backend logically binds the new filters (like a max price of 1500) to the original search context (ladies suits), instead of performing a generic search for "cheaper ones".
- If the user asks for "more", it passes `shownProductUrls` to `ShoppingService` as `excludeUrls` to filter out duplicates.

## Comparison Feature
If the user explicitly asks to "compare" products (e.g., *"Compare the first two"*), the LLM sets `needsComparison: true`. The backend builds a side-by-side `ComparisonData` object detailing the strengths and weaknesses of the selected products, which is rendered in the UI via `ComparisonView.tsx`.

## External Products Isolation
Products retrieved in "Shop Everywhere" mode are typed as `ExternalProduct`.
They **DO NOT** enter the local merchant SQLite database, and they **CANNOT** be added to the local shopping cart. They strictly act as referral links ("View Deal").

## Security
- The `SERPAPI_KEY` used to fetch these results is strictly maintained in the backend `apps/server/.env`.
- The frontend **never** holds or transmits this key.
- Error messages from SerpApi are sanitized in `ShoppingService.ts` to ensure the API key or authenticated URLs are never leaked to the client.
