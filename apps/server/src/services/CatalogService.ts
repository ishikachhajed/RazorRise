import { prisma } from '../db/prisma.js';

export interface ProductQuery {
  category?: string;
  maxBudget?: number;
  minBudget?: number;
  useCases?: string[];
  features?: string[];
  searchQuery?: string;
  excludeIds?: string[];
}

export interface ScoredProduct {
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
  imageUrl: string | null;
  matchScore: number;
  scoreBreakdown: {
    budgetFit: number;
    featureMatch: number;
    useCaseFit: number;
    ratingScore: number;
    valueForMoney: number;
  };
  whyThis: string[];
}

export class CatalogService {
  static async getProductById(id: string) {
    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) return null;

    return {
      ...p,
      features: JSON.parse(p.featuresJson),
      specifications: JSON.parse(p.specificationsJson),
      tags: JSON.parse(p.tagsJson),
      complementaryProducts: JSON.parse(p.complementaryJson)
    };
  }

  static async searchProducts(query: ProductQuery): Promise<ScoredProduct[]> {
    const products = await prisma.product.findMany();
    
    // Parse DB objects
    const parsedProducts = products.map((p) => ({
      ...p,
      features: JSON.parse(p.featuresJson) as string[],
      specifications: JSON.parse(p.specificationsJson) as Record<string, string>,
      tags: JSON.parse(p.tagsJson) as string[],
      complementaryProducts: JSON.parse(p.complementaryJson) as string[]
    }));

    // Filter & Score
    const candidateProducts: ScoredProduct[] = [];

    for (const p of parsedProducts) {
      if (query.excludeIds && query.excludeIds.includes(p.id)) {
        continue;
      }
      // Hard filter category if specified
      if (query.category && query.category !== 'all') {
        const catClean = query.category.toLowerCase().trim();
        const pCatClean = p.category.toLowerCase().trim();
        if (!pCatClean.includes(catClean) && !catClean.includes(pCatClean)) {
          continue;
        }
      }

      // Hard filter max budget if strictly requested (allow 5% margin for value fits)
      if (query.maxBudget && query.maxBudget > 0) {
        if (p.price > query.maxBudget * 1.05) {
          continue;
        }
      }

      // Compute Deterministic Scoring
      // 1. Budget Fit (30%)
      let budgetFit = 100;
      if (query.maxBudget && query.maxBudget > 0) {
        if (p.price <= query.maxBudget) {
          // Closer to budget without exceeding gives higher value ratio
          const ratio = p.price / query.maxBudget;
          budgetFit = Math.round(70 + ratio * 30);
        } else {
          budgetFit = 40; // Exceeds slightly
        }
      }

      // 2. Feature Match (30%)
      let featureMatch = 70;
      if (query.features && query.features.length > 0) {
        const pText = (p.name + ' ' + p.description + ' ' + p.features.join(' ') + ' ' + JSON.stringify(p.specifications)).toLowerCase();
        let matched = 0;
        for (const f of query.features) {
          if (pText.includes(f.toLowerCase())) {
            matched++;
          }
        }
        featureMatch = Math.round((matched / query.features.length) * 100);
        if (featureMatch < 50) featureMatch = 50; // Base score for quality products
      }

      // 3. Use-case match (20%)
      let useCaseFit = 70;
      if (query.useCases && query.useCases.length > 0) {
        let matched = 0;
        for (const uc of query.useCases) {
          const ucClean = uc.toLowerCase();
          if (p.tags.some(t => t.toLowerCase().includes(ucClean)) || p.description.toLowerCase().includes(ucClean)) {
            matched++;
          }
        }
        useCaseFit = Math.round((matched / query.useCases.length) * 100);
        if (useCaseFit < 60) useCaseFit = 60;
      }

      // 4. Rating (10%)
      const ratingScore = Math.round((p.rating / 5.0) * 100);

      // 5. Value for Money (10%)
      const valueForMoney = p.discount > 0 ? 95 : 80;

      // Calculate Weighted Final Score
      const matchScore = Math.round(
        budgetFit * 0.30 +
        featureMatch * 0.30 +
        useCaseFit * 0.20 +
        ratingScore * 0.10 +
        valueForMoney * 0.10
      );

      // Generate "Why This?" Explanations
      const whyThis: string[] = [];
      if (query.maxBudget && p.price <= query.maxBudget) {
        whyThis.push(`Within your ₹${query.maxBudget.toLocaleString('en-IN')} budget (₹${p.price.toLocaleString('en-IN')})`);
      }
      if (p.rating >= 4.5) {
        whyThis.push(`Highly rated by customers (${p.rating}/5 stars)`);
      }
      if (query.useCases && query.useCases.length > 0) {
        whyThis.push(`Optimized for ${query.useCases.join(' & ')}`);
      }
      if (p.features.length > 0) {
        whyThis.push(`Key specs: ${p.features.slice(0, 2).join(', ')}`);
      }

      candidateProducts.push({
        ...p,
        matchScore,
        scoreBreakdown: {
          budgetFit,
          featureMatch,
          useCaseFit,
          ratingScore,
          valueForMoney
        },
        whyThis
      });
    }

    // Sort by Match Score descending
    return candidateProducts.sort((a, b) => b.matchScore - a.matchScore);
  }

  static async getComplementaryProducts(productId: string): Promise<ScoredProduct[]> {
    const mainProduct = await this.getProductById(productId);
    if (!mainProduct || !mainProduct.complementaryProducts.length) {
      // Fallback: recommend top accessories or mice
      const fallback = await prisma.product.findMany({
        where: { category: { in: ['accessories', 'mice', 'backpacks'] } },
        take: 3
      });
      return fallback.map(p => ({
        ...p,
        features: JSON.parse(p.featuresJson),
        specifications: JSON.parse(p.specificationsJson),
        tags: JSON.parse(p.tagsJson),
        complementaryProducts: JSON.parse(p.complementaryJson),
        matchScore: 88,
        scoreBreakdown: { budgetFit: 90, featureMatch: 85, useCaseFit: 90, ratingScore: 90, valueForMoney: 85 },
        whyThis: ['Top rated accessory', 'High compatibility']
      }));
    }

    const compProducts = await prisma.product.findMany({
      where: { id: { in: mainProduct.complementaryProducts } }
    });

    return compProducts.map(p => ({
      ...p,
      features: JSON.parse(p.featuresJson),
      specifications: JSON.parse(p.specificationsJson),
      tags: JSON.parse(p.tagsJson),
      complementaryProducts: JSON.parse(p.complementaryJson),
      matchScore: 92,
      scoreBreakdown: { budgetFit: 95, featureMatch: 90, useCaseFit: 95, ratingScore: 92, valueForMoney: 90 },
      whyThis: [
        `Complements your ${mainProduct.name}`,
        `Highly rated accessory (${p.rating}/5 stars)`
      ]
    }));
  }
}
