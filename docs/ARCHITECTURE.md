# 🏗️ ARCHITECTURE

This document describes the structural layout of RazorRise.

## Data & Request Flow
```
User
  ↓ (React/Vite)
Frontend (ShopPage.tsx)
  ↓ (HTTP POST /api/ai/chat)
Backend API (Express)
  ↓ (Mode Detection)
  ├── 🏪 My Store ───────────────────────┐
  │     (CommerceAgent)                  │
  │     ↓ (Extract Intent via Groq)      │
  │     ↓ (ToolRegistry: search_catalog) │
  │     Database (Prisma/SQLite)         │
  │     ↓ (ToolRegistry: razorpay_order) │
  │     Razorpay API                     │
  │                                      │
  └── 🛍️ Shop Everywhere ───────────────┤
        (ShopEverywhereAgent)            │
        ↓ (Extract Intent via Groq)      │
        ↓ (ShoppingService)              │
        SerpApi (Google Shopping)        │
                                         ↓
                                      Response
                                         ↓
                                      Frontend
```

## Frontend Architecture
- **Framework**: React 18 with Vite.
- **Entry Point**: `apps/web/src/main.tsx` and `App.tsx`.
- **Main Pages**: 
  - `ShopPage.tsx`: The primary interface for both the local store and the AI assistant. Contains chat UI, mode toggles, and product grids.
- **Components**: 
  - `ExternalProductCard.tsx`: Renders SerpApi results.
  - `ComparisonView.tsx`: Displays side-by-side product comparisons.
- **Services**: 
  - `ApiService.ts`: Handles all `fetch` communication with the backend.
- **State Management**: React `useState`/`useEffect` hooks, managing contexts like `accumulatedIntent` and `shopEverywhereContext`.
- **Styling**: `index.css` (custom tokens, vibrant aesthetics).

## Backend Architecture
- **Server Entry Point**: `apps/server/src/index.ts`.
- **Controllers**: `CommerceController.ts` (Handles `/api/ai/chat` and `/api/shopping/search`).
- **Routes**: `api.ts`.
- **Services**:
  - `ShoppingService.ts`: External API (SerpApi) communication.
  - `CatalogService.ts`: Internal SQLite/Prisma catalog search and scoring.
  - `CartService.ts`, `PaymentService.ts`, `AuditService.ts`.
- **Agents**:
  - `CommerceAgent.ts`: Business logic for the "My Store" mode (upsells, cart management, incentives).
  - `ShopEverywhereAgent.ts`: Logic for formatting searches and managing context in "Shop Everywhere".
- **Providers**: 
  - `GroqAIProvider.ts`: Implementation for interacting with the Groq LLM API.
- **Database Layer**: Prisma Client `prisma.ts`.

## AI Architecture
1. **User Input**: User submits a message via the Chat UI.
2. **Mode Detection**: The frontend explicitly sends the active `mode` parameter (`my_store` or `shop_everywhere`).
3. **Intent Extraction**: 
   - Groq is used to convert unstructured natural language into structured JSON objects (e.g., extracting categories, price limits, and refinements).
4. **Execution**:
   - For My Store: `CommerceAgent` uses `ToolRegistry` to fetch items from the local DB.
   - For Shop Everywhere: `ShopEverywhereAgent` uses `ShoppingService` to fetch from SerpApi.
5. **Generation**: Groq generates a conversational, human-friendly response based on the search results.

## Folder Structure
```
RazorRise/
├── apps/
│   ├── web/                     # React Frontend
│   │   ├── src/
│   │   │   ├── components/      # UI components (ProductCard, etc.)
│   │   │   ├── pages/           # ShopPage.tsx
│   │   │   ├── services/        # ApiService.ts
│   │   │   └── App.tsx
│   │   └── index.html
│   │
│   └── server/                  # Express Backend
│       ├── prisma/
│       │   ├── schema.prisma    # Database models
│       │   └── seed.js          # Demo data script
│       ├── src/
│       │   ├── agents/          # AI agents (CommerceAgent, ShopEverywhere)
│       │   ├── config/          # Environment variables
│       │   ├── controllers/     # Route controllers
│       │   ├── providers/       # Groq integration
│       │   ├── routes/          # Express routes (api.ts)
│       │   ├── services/        # Business logic (Shopping, Catalog, etc.)
│       │   └── tools/           # Internal tool definitions for AI
│       └── .env                 # Backend secrets (DO NOT COMMIT)
│
├── docs/                        # Project documentation (You are here)
└── package.json                 # Monorepo workspaces
```
