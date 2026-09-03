# ✨ FEATURES

This document is an inventory of the major features available in the RazorRise project.

## 🏪 My Store
The "My Store" mode is a fully functional conversational e-commerce engine operating against the merchant's local catalog.

- **Product Catalogue**: Intelligent searching, filtering, and deterministic scoring of products based on features, use-cases, and budgets.
  - Implemented in: `apps/server/src/services/CatalogService.ts`
- **Cart Management**: Add items, calculate totals, and recover abandoned carts.
  - Implemented in: `apps/server/src/services/CartService.ts`
- **Checkout & Razorpay Integration**: Securely generates Razorpay test orders when a user confirms their cart, and verifies payment signatures.
  - Implemented in: `apps/server/src/services/PaymentService.ts`
- **Orders & Customers**: Tracks purchase history and user accounts via Prisma SQLite.
- **Audit Trail**: Every significant action (intent extraction, product recommendation, tool execution) is logged for merchant insights.
  - Implemented in: `apps/server/src/services/AuditService.ts`
- **AI Commerce Assistant**: Automatically suggests complementary products (cross-selling) or cheaper alternatives (down-selling) using the `AdaptiveDecision` engine.
  - Implemented in: `apps/server/src/agents/CommerceAgent.ts`

## 🌎 Shop Everywhere
The "Shop Everywhere" mode transforms the assistant into an internet-wide product discovery engine.

- **External Product Search**: Queries real-world products via SerpApi (Google Shopping engine).
  - Implemented in: `apps/server/src/services/ShoppingService.ts`
- **Marketplace Support**: Retrieves live results from major retailers (Amazon, Flipkart, Myntra, etc.).
- **Product Cards**: Displays rich UI cards including thumbnails, prices, original prices, discounts, ratings, reviews, and a "View Deal" button linking to the source.
  - Implemented in: `apps/web/src/components/ExternalProductCard.tsx`
- **Comparison**: AI can compare two or more products side-by-side, summarizing strengths and weaknesses in a dedicated UI view.
  - Implemented in: `apps/web/src/components/ComparisonView.tsx`
- **Conversational Refinement**: Users can start with a broad query ("Show me laptops") and progressively refine it ("cheaper ones", "under 50k", "more options") while the AI retains the context.
  - Implemented in: `apps/server/src/agents/ShopEverywhereAgent.ts`

## 🤖 AI Capabilities
RazorRise utilizes a specialized multi-agent architecture.

- **Groq Integration**: Fast inference using models like Qwen for structured intent extraction and Llama/GPT-oss for conversational response generation.
  - Implemented in: `apps/server/src/providers/GroqAIProvider.ts`
- **Conversation Context**: Both agents track conversation history and intent (`accumulatedIntent` and `shopEverywhereContext`) to ensure natural follow-ups without context bleeding between modes.
- **Tool Calling Structure**: AI intent is deterministically mapped to predefined, safe internal tools (e.g., `search_catalog`, `add_to_cart`) instead of allowing free-form execution.
  - Implemented in: `apps/server/src/tools/index.ts`
