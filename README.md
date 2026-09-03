# 🚀 RazorRise

> **AI-powered commerce infrastructure for merchants and AI buyers.**

RazorRise is a dual-mode AI Commerce platform that blends a deeply integrated local merchant storefront with an expansive, internet-wide product aggregator. Designed with a vibrant, glassmorphism-inspired UI and powered by fast LLM inference (Groq), RazorRise represents the future of conversational shopping.

## ✨ Core Features

### 🏪 My Store (Local Merchant Mode)
Operate a fully functional local storefront using an AI assistant.
- Conversational catalog searching with deterministic ranking.
- Intelligent cross-selling (suggesting compatible accessories) and down-selling.
- Full cart management and abandoned cart recovery logic.
- Secure, server-side Razorpay test order creation and webhook verification.

### 🌎 Shop Everywhere (Aggregator Mode)
Transform the assistant into a global shopping companion.
- Queries external marketplaces (Amazon, Flipkart, Myntra) dynamically via SerpApi.
- Rich product cards featuring thumbnails, reviews, discounts, and "View Deal" links.
- Context-aware conversational refinement (e.g., search "ladies suits" -> "cheaper ones").
- Side-by-side product comparisons to aid purchasing decisions.

### 🤖 AI Architecture
- Uses **Groq** for high-speed intent extraction (Qwen) and conversational generation.
- Strict isolation of memory/context between modes.
- Tool-bound execution ensuring the AI cannot hallucinate non-existent products or execute unauthorized money actions.

## 🏗️ Architecture
```
User
  ↓
React + Vite (Frontend)
  ↓
Express (Backend API)
  ↓
Groq LLM (Intent Extraction)
  ↓
SQLite/Prisma (My Store)  OR  SerpApi (Shop Everywhere)
  ↓
Razorpay (Payments)
```

## 📁 Project Structure
```
RazorRise/
├── apps/
│   ├── web/           # React + Vite frontend
│   └── server/        # Express + Prisma backend
├── docs/              # Comprehensive project documentation
└── package.json       # Monorepo scripts
```

## ⚙️ Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```
2. **Setup Database**
   ```bash
   npm run db:setup
   npm run db:seed
   ```
3. **Run the Application**
   ```bash
   npm run dev
   ```
   *Runs both the backend (`localhost:3001`) and frontend (`localhost:5173`) concurrently.*

## 🔐 Environment Variables
You must create a `.env` file in `apps/server/.env` containing the following secrets:
- `DATABASE_URL`
- `GROQ_API_KEY`
- `SERPAPI_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `PORT`

*(Never commit your `.env` file. It is safely ignored in `.gitignore`.)*

## 📚 Documentation
For AI coding agents and developers, read the documentation below to understand the system without scanning the entire repository:

- [🤖 AI Context](docs/AI_CONTEXT.md) - **Start Here!**
- [🏗️ Architecture](docs/ARCHITECTURE.md)
- [✨ Features](docs/FEATURES.md)
- [🔌 API](docs/API.md)
- [🗄️ Database](docs/DATABASE.md)
- [🛍️ Shop Everywhere](docs/SHOP_EVERYWHERE.md)
- [🛠️ Development](docs/DEVELOPMENT.md)

---
*Built for the Razorpay AI Buildathon.*