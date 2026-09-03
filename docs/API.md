# 🔌 API

This document details the backend API routes available in `apps/server/src/routes/api.ts`.
*(Do not invent new routes. These are the actual routes implemented.)*

## AI & Chat Routes

### `POST /api/ai/chat`
- **Purpose**: Main conversational endpoint for the AI Assistant. Handles both My Store and Shop Everywhere modes.
- **Request Body**:
  ```json
  {
    "message": "Find me ladies suits",
    "mode": "shop_everywhere",
    "userId": "uuid-optional",
    "cartId": "uuid-optional",
    "accumulatedContext": {} // Context object varying by mode
  }
  ```
- **Response**: The conversational response string, alongside structured data (intent, externalProducts, cart updates, etc.).
- **Implementation**: `CommerceController.handleChat` -> routes to `CommerceAgent` or `ShopEverywhereAgent` based on `mode`.

### `POST /api/shopping/search`
- **Purpose**: Server-side proxy for SerpApi Google Shopping searches.
- **Request Body**:
  ```json
  {
    "query": "ladies suits",
    "maxPrice": 2000,
    "limit": 6
  }
  ```
- **Response**: Array of normalized `ExternalProduct` objects.
- **Implementation**: `CommerceController.handleShopEverywhereSearch` -> `ShoppingService.searchProducts`.

## Catalog Routes

### `GET /api/products`
- **Purpose**: Fetch all local products (My Store).
- **Implementation**: `CommerceController.getProducts` -> `CatalogService.searchProducts`.

### `GET /api/products/:id`
- **Purpose**: Fetch specific product details.
- **Implementation**: `CommerceController.getProductById`.

## Cart & Checkout Routes

### `GET /api/cart`
- **Purpose**: Fetch the user's active cart.
- **Query Params**: `?cartId=123&userId=456`
- **Implementation**: `CommerceController.getCart`.

### `POST /api/cart/items`
- **Purpose**: Add item to cart.
- **Request Body**: `{ "cartId": "...", "productId": "...", "quantity": 1 }`
- **Implementation**: `CommerceController.addItemToCart`.

### `POST /api/cart/items/remove`
- **Purpose**: Remove an item from the cart.
- **Request Body**: `{ "cartId": "...", "itemId": "..." }`
- **Implementation**: `CommerceController.removeItemFromCart`.

## Razorpay Routes

### `POST /api/razorpay/order`
- **Purpose**: Create a gated Razorpay Test Order based on the current cart subtotal.
- **Request Body**: `{ "cartId": "...", "userId": "..." }`
- **Implementation**: `CommerceController.createRazorpayOrder` -> `PaymentService.createOrder`.

### `POST /api/razorpay/verify`
- **Purpose**: Verify the cryptographic signature of a completed Razorpay payment.
- **Request Body**: `{ "razorpayOrderId": "...", "razorpayPaymentId": "...", "signature": "..." }`
- **Implementation**: `CommerceController.verifyRazorpayPayment`.

### `POST /api/webhooks/razorpay`
- **Purpose**: Asynchronous webhook receiver for Razorpay events (e.g. `payment.captured`).
- **Implementation**: `CommerceController.handleRazorpayWebhook`.

## Merchant Dashboard Routes

### `GET /api/orders`
- **Purpose**: Retrieve order history for a user.

### `GET /api/merchant/dashboard`
- **Purpose**: Get high-level store stats (revenue, order counts).

### `GET /api/merchant/audit`
- **Purpose**: Retrieve AI audit logs (`AuditEvent` table) for monitoring AI behavior.
