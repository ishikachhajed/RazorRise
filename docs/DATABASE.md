# 🗄️ DATABASE

This document explains the database architecture of RazorRise's local "My Store" mode.

## Overview
- **Database Type**: SQLite
- **ORM**: Prisma Client
- **Schema Location**: `apps/server/prisma/schema.prisma`
- **Seed Data**: `apps/server/prisma/seed.js`

> Note: The **Shop Everywhere** mode does NOT use this database for its products. It fetches external data via SerpApi dynamically.

## Core Models

### `Product`
The merchant's local inventory.
- **Key Fields**: `id`, `name`, `category`, `price`, `description`, `stock`, `rating`.
- **JSON Fields**: `featuresJson`, `specificationsJson`, `tagsJson`, `complementaryJson` (used for AI scoring and cross-selling).
- **Access**: Fetched via `CatalogService.ts`.

### `User`
- **Key Fields**: `id`, `name`, `email`, `role` (customer/admin).

### `Cart` & `CartItem`
- Represents a user's active shopping session.
- **Cart Fields**: `id`, `status` (active, converted, abandoned), `intentJson` (AI intent tracking).
- **Access**: Managed via `CartService.ts`.

### `Order`
- Created upon checkout initiation.
- **Key Fields**: `id`, `razorpayOrderId` (linked directly to the payment gateway), `amount`, `status` (created, paid, failed), `paymentStatus`, `itemsJson` (snapshot of cart items).
- **Access**: Managed via `PaymentService.ts`.

### `Payment`
- Records individual Razorpay payment attempts and captures.
- **Key Fields**: `razorpayPaymentId`, `status`, `amount`.

### `AuditEvent`
- Extremely important for AI safety and monitoring.
- Logs every AI action, tool execution, and user approval.
- **Fields**: `eventType` (e.g., INTENT_EXTRACTED, USER_APPROVED), `actor` (user/ai), `action`, `input`, `output`.
- **Access**: Logged via `AuditService.ts`.

### `MerchantConfig`
- Global singleton row configuring the AI's behavior.
- **Fields**: `maxDiscountPercent`, `allowUpsells`, `allowIncentives`.

## Relationships
- A `User` has many `Carts` and `Orders`.
- A `Cart` has many `CartItems`, which link to `Products`.
- An `Order` belongs to a `User` (and optionally a `Cart`), and has many `Payments` and `AuditEvents`.
