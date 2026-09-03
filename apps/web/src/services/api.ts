const API_BASE = '/api';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  features: string[];
  specifications: Record<string, string>;
  rating: number;
  stock: number;
  tags: string[];
  complementaryProducts: string[];
  discount: number;
  imageUrl?: string | null;
  matchScore?: number;
  scoreBreakdown?: {
    budgetFit: number;
    featureMatch: number;
    useCaseFit: number;
    ratingScore: number;
    valueForMoney: number;
  };
  whyThis?: string[];
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl?: string | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  currency: string;
  status: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  actor: 'user' | 'ai' | 'system';
  action: string;
  reason?: string;
  input?: string;
  output?: string;
  status: 'success' | 'failed' | 'blocked';
  metadata: Record<string, any>;
  createdAt: string;
}

// ── Shop Everywhere Types ──────────────────────────────────────────────────

export interface ExternalProduct {
  title: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  source: string;
  rating?: string;
  reviews?: string;
  thumbnail?: string;
  productUrl: string;
}

export interface ComparisonData {
  summary: string;
  factors?: string[];
}

export interface ShopEverywhereContext {
  lastQuery?: string;
  lastCategory?: string;
  lastMaxPrice?: number;
  lastMinPrice?: number;
  lastProducts?: ExternalProduct[];
  shownProductUrls?: string[];
  budget?: { min?: number; max?: number };
  filters?: { brands?: string[]; [key: string]: any };
  previousResults?: Array<{ index: number; title: string; url: string; price: string; source: string }>;
  pendingCrossSellCategory?: string;
  pendingClarification?: { category: string; originalQuery: string; questions: string[] };
  suggestedCrossSellCategories?: string[];
  preferredBrands?: string[];
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class ApiService {
  static async sendChatMessage(
    message: string,
    cartId?: string,
    accumulatedIntent?: any,
    mode: 'my_store' | 'shop_everywhere' = 'my_store',
    accumulatedContext?: ShopEverywhereContext,
    userId?: string
  ) {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, cartId, userId, accumulatedIntent, mode, accumulatedContext })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send message');
    }
    return res.json();
  }

  static async searchShopping(query: string, maxPrice?: number, minPrice?: number, category?: string) {
    const res = await fetch(`${API_BASE}/shopping/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxPrice, minPrice, category })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'External product search failed');
    }
    return res.json();
  }

  static async getProducts(category?: string, maxBudget?: number) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (maxBudget) params.append('maxBudget', maxBudget.toString());

    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  }

  static async getCart(cartId?: string) {
    const url = cartId ? `${API_BASE}/cart?cartId=${cartId}` : `${API_BASE}/cart`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch cart');
    const data = await res.json();
    return data.cart as Cart;
  }

  static async addToCart(cartId: string, productId: string, quantity: number = 1) {
    const res = await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId, productId, quantity })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add item to cart');
    }
    const data = await res.json();
    return data.cart as Cart;
  }

  static async removeFromCart(cartId: string, itemId: string) {
    const res = await fetch(`${API_BASE}/cart/items/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId, itemId })
    });
    if (!res.ok) throw new Error('Failed to remove item');
    const data = await res.json();
    return data.cart as Cart;
  }

  static async clearCart(cartId: string) {
    const res = await fetch(`${API_BASE}/cart/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId })
    });
    if (!res.ok) throw new Error('Failed to clear cart');
    const data = await res.json();
    return data.cart as Cart;
  }

  static async recoverAbandonedCart(cartId: string) {
    const res = await fetch(`${API_BASE}/cart/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId })
    });
    if (!res.ok) return null;
    return res.json();
  }

  static async createRazorpayOrder(cartId: string, userConfirmed: boolean = true) {
    const res = await fetch(`${API_BASE}/razorpay/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId, userConfirmed })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create Razorpay Order');
    }
    return res.json();
  }

  static async verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
    const res = await fetch(`${API_BASE}/razorpay/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ razorpayOrderId, razorpayPaymentId, razorpaySignature })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Payment verification failed');
    }
    return res.json();
  }

  static async getMerchantDashboard() {
    const res = await fetch(`${API_BASE}/merchant/dashboard`);
    if (!res.ok) throw new Error('Failed to load merchant dashboard');
    return res.json();
  }

  static async getMerchantInsights() {
    const res = await fetch(`${API_BASE}/merchant/insights`);
    if (!res.ok) throw new Error('Failed to load merchant insights');
    return res.json();
  }

  static async getMerchantAuditTrail(eventType?: string, status?: string) {
    const params = new URLSearchParams();
    if (eventType) params.append('eventType', eventType);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE}/merchant/audit?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load audit trail');
    return res.json();
  }

  static async getOrders(userId?: string) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    
    // Add cartIds from localStorage to identify guest user's orders
    if (typeof window !== 'undefined') {
      const cartIds = localStorage.getItem('razorflow_cart_ids');
      if (cartIds) {
        try {
          const parsedIds = JSON.parse(cartIds);
          if (Array.isArray(parsedIds) && parsedIds.length > 0) {
            params.append('cartIds', parsedIds.join(','));
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }
    
    params.append('_', Date.now().toString());
    const res = await fetch(`${API_BASE}/orders?${params.toString()}`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to load orders');
    return res.json();
  }
}
