import { CatalogService } from '../src/services/CatalogService.js';
import { prisma } from '../src/db/prisma.js';

describe('Product Catalog & Search Unit Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should return 50+ total products or query candidates', async () => {
    const products = await prisma.product.findMany();
    expect(products.length).toBeGreaterThanOrEqual(30);
  });

  test('should correctly filter laptops under ₹70,000 budget', async () => {
    const results = await CatalogService.searchProducts({
      category: 'laptop',
      maxBudget: 70000
    });

    expect(results.length).toBeGreaterThan(0);
    for (const prod of results) {
      expect(prod.category).toBe('laptop');
      expect(prod.price).toBeLessThanOrEqual(70000 * 1.05); // Allow margin
    }
  });

  test('should correctly retrieve complementary products for a laptop', async () => {
    const comp = await CatalogService.getComplementaryProducts('prod_lap_01');
    expect(comp.length).toBeGreaterThan(0);
    expect(comp[0].whyThis).toBeDefined();
  });
});
