import { config } from '../config/index.js';

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

export interface ShoppingSearchParams {
  query: string;
  maxPrice?: number;
  minPrice?: number;
  category?: string;
  limit?: number;
  excludeUrls?: string[];
}

export class ShoppingService {
  /**
   * Search external product listings via SerpApi Google Shopping.
   * The API key is NEVER passed to the frontend or included in error messages.
   */
  static async searchProducts(params: ShoppingSearchParams): Promise<ExternalProduct[]> {
    if (!config.serpApiKey) {
      throw new Error('External shopping search is not configured on the server.');
    }

    const { query, maxPrice, minPrice, limit = 6 } = params;

    // Build SerpApi URL — key stays server-side only
    const searchParams = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      gl: 'in',
      hl: 'en',
      currency: 'INR',
      api_key: config.serpApiKey
    });

    if (maxPrice) searchParams.set('price_max', String(Math.round(maxPrice)));
    if (minPrice) searchParams.set('price_min', String(Math.round(minPrice)));

    let data: any;
    try {
      const response = await fetch(`https://serpapi.com/search?${searchParams.toString()}`);

      if (!response.ok) {
        // Never expose status text that could leak URL (which contains key)
        const status = response.status;
        if (status === 401 || status === 403) {
          throw new Error('External product search failed: authentication error. Please contact support.');
        }
        throw new Error(`External product search temporarily unavailable (code: ${status}).`);
      }

      data = await response.json();
    } catch (err: any) {
      // Make sure error messages never contain the API key or serpapi URL
      if (err.message && err.message.includes(config.serpApiKey)) {
        throw new Error('External product search failed. Please try again.');
      }
      throw err;
    }

    const rawResults: any[] = data?.shopping_results || [];

    if (rawResults.length === 0) {
      return [];
    }

    // Normalize results — never fabricate missing fields
    const normalized: ExternalProduct[] = rawResults
      .slice(0, limit)
      .map((item: any) => {
        const product: ExternalProduct = {
          title: item.title || 'Product',
          price: item.price ? String(item.price) : 'Price not available',
          source: item.source || item.seller || 'Online Store',
          productUrl: item.link || item.product_link || '#'
        };

        // Only set optional fields if data actually exists
        if (item.extracted_price && item.price && item.extracted_price < ShoppingService.extractNumericPrice(item.price)) {
          // original price was higher
        }
        if (item.old_price) product.originalPrice = String(item.old_price);
        if (item.second_hand_condition) {
          // skip condition labeling — only show new products
        }

        // Discount: compute from prices if not directly provided
        if (item.old_price && item.extracted_price) {
          const oldNum = ShoppingService.extractNumericPrice(String(item.old_price));
          const newNum = item.extracted_price;
          if (oldNum > newNum) {
            const pct = Math.round(((oldNum - newNum) / oldNum) * 100);
            if (pct > 0) product.discount = `${pct}% off`;
          }
        }

        if (item.rating) product.rating = String(item.rating);
        if (item.reviews) product.reviews = `${Number(item.reviews).toLocaleString('en-IN')} reviews`;
        if (item.thumbnail) product.thumbnail = item.thumbnail;

        return product;
      })
      .filter((p: ExternalProduct) => p.productUrl && p.productUrl !== '#')
      .filter((p: ExternalProduct) => !(params.excludeUrls && params.excludeUrls.includes(p.productUrl)));

    return normalized;
  }

  /**
   * Run multiple product searches in parallel (for comparison or cross-sell)
   */
  static async searchMultiple(queries: ShoppingSearchParams[]): Promise<ExternalProduct[][]> {
    const results = await Promise.allSettled(
      queries.map((q) => ShoppingService.searchProducts(q))
    );

    return results.map((r) => (r.status === 'fulfilled' ? r.value : []));
  }

  private static extractNumericPrice(priceStr: string): number {
    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }
}
