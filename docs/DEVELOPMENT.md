# 🛠️ DEVELOPMENT

This guide provides instructions for developers and AI agents working on the RazorRise project.

## Setup & Commands

RazorRise is structured as a monorepo containing `apps/web` (Frontend) and `apps/server` (Backend).

### Install Dependencies
```bash
npm install
```
*Note: This will install dependencies for the root, web, and server workspaces.*

### Run Locally (Frontend + Backend)
To run both the backend server and frontend dev server concurrently:
```bash
npm run dev
```
Alternatively, run them separately:
- **Backend Only**: `npm run dev:server`
- **Frontend Only**: `npm run dev:web`

### Database Commands
The database uses SQLite and Prisma. Run these from the root:
```bash
# Apply schema changes and generate Prisma client
npm run db:setup

# Seed the database with demo products and merchant configurations
npm run db:seed
```

### Build for Production
```bash
npm run build
```

### Testing & Benchmarking
```bash
npm run test
npm run benchmark
```

## Environment Variables
The backend requires a `.env` file located at `apps/server/.env`.
**DO NOT COMMIT THIS FILE.**

Required variable **names**:
- `DATABASE_URL` (e.g., `"file:./dev.db"`)
- `GROQ_API_KEY`
- `SERPAPI_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `PORT` (e.g., `3001`)

## Important Development Rules
1. **Never Expose Secrets**: Never commit `.env` or put API keys (Razorpay, SerpApi, Groq) in frontend code or documentation.
2. **Mode Isolation**: Do not break "My Store" functionality when modifying "Shop Everywhere", and vice versa. They share the same chat UI but have vastly different data paradigms.
3. **Database Boundaries**: Shop Everywhere external products (`ExternalProduct`) must never be written to the local SQLite merchant database.
4. **Razorpay Guardrails**: Changes to checkout, cart calculation, or webhook handling must be verified thoroughly, as these control the money flow.
5. **Documentation-First**: When starting a new AI development session, always read `docs/AI_CONTEXT.md` first before scanning the whole repository.
