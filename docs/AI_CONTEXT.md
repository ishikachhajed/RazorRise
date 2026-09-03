# AI_CONTEXT

**READ THIS FILE FIRST.**

> Do not scan the entire repository unless the task requires it. Use this documentation to understand the architecture first, then inspect only the relevant source files.

## Project Overview
**RazorRise** is an AI-powered commerce infrastructure for merchants and buyers. The platform provides a modern, conversational shopping interface with dual functionalities: a local merchant store ("My Store") and an external marketplace aggregator ("Shop Everywhere").

## 🤖 AI DEVELOPMENT RULE
Before making changes to this project:
1. Read `docs/AI_CONTEXT.md`.
2. Read only the documentation relevant to the requested task.
3. Identify the specific source files involved.
4. Inspect those source files.
5. Make the smallest safe change.
6. Update the relevant documentation if architecture or functionality changes.
7. Do not scan unrelated folders/files unless necessary.

**Examples:**
- If the task is about Shop Everywhere: → Read `AI_CONTEXT.md` → Read `SHOP_EVERYWHERE.md` → Read relevant API/architecture sections → Inspect only the relevant implementation files.
- If the task is about the database: → Read `AI_CONTEXT.md` → Read `DATABASE.md` → Inspect Prisma schema and relevant database services.
- If the task is about UI: → Read `AI_CONTEXT.md` → Read `ARCHITECTURE.md` → Inspect only relevant frontend files.
**Do NOT automatically inspect the entire repository for every task.**

## Architecture Summary
- **Frontend**: React + Vite + TypeScript. Located in `apps/web`.
- **Backend**: Express + TypeScript. Located in `apps/server`.
- **Database**: SQLite accessed via Prisma ORM (`apps/server/prisma/schema.prisma`).
- **AI/LLM**: Powered by Groq API (Qwen for JSON intent extraction, Llama/GPT-oss for conversational chat).
- **Payments**: Razorpay test mode integration for checkout.
- **External Data**: SerpApi (Google Shopping) for the Shop Everywhere aggregator mode.

## The Two Modes
The central feature of RazorRise is the dual-mode AI Assistant (toggled via the UI in `ShopPage.tsx`):

### 🏪 My Store
- The user chats with `CommerceAgent`.
- Acts as a local store assistant using the merchant's SQLite database (`Product`, `Order`, `Cart`).
- Handles complex tasks like adding to cart, abandoned cart recovery, applying discounts (Incentives), cross-selling, and proceeding to Razorpay checkout.
- Agent tracks context via `accumulatedIntent` to maintain memory across conversational turns.

### 🛍️ Shop Everywhere
- The user chats with `ShopEverywhereAgent`.
- Acts as an internet-wide shopping assistant.
- Searches Amazon, Flipkart, Myntra, etc., using SerpApi.
- Uses LLM for dynamic natural language intent extraction (e.g. "Find me ladies suits" -> "cheaper ones").
- Renders results using `ExternalProductCard` with "View Deal" links (external products DO NOT enter the local cart).
- Features side-by-side product comparisons via `ComparisonView`.

## Important Rules
- **Environment Variables**: NEVER commit `.env`. The real `SERPAPI_KEY`, `GROQ_API_KEY`, and `RAZORPAY_SECRET` must stay only in `apps/server/.env` and are strictly excluded via `.gitignore`.
- **API Keys on Client**: The frontend NEVER makes direct calls to Groq or SerpApi. It routes entirely through the backend (`/api/ai/chat` and `/api/shopping/search`).
- **Context Bleeding**: When switching between My Store and Shop Everywhere, conversational state/memory must be reset. They operate on two entirely different data paradigms.
- **Razorpay Flow**: Do not blindly modify Razorpay integrations without verifying against the existing webhook (`/api/webhooks/razorpay`) and order creation flows.

## Core Directories
- `apps/web/src/pages/` (Main UI views like `ShopPage.tsx`)
- `apps/web/src/components/` (Reusable React components)
- `apps/server/src/agents/` (AI logic: `CommerceAgent.ts`, `ShopEverywhereAgent.ts`)
- `apps/server/src/providers/` (LLM API integrations: `GroqAIProvider.ts`)
- `apps/server/src/services/` (Data/Business logic: `ShoppingService.ts`, `CatalogService.ts`)
- `apps/server/src/controllers/` (Express route handlers)

## Current Status
- Dual mode is fully implemented and operational.
- Conversational memory works efficiently across both modes.
- Contextual refinement (e.g., preserving category while applying follow-up price filters) is active.
