import { CartService } from '../src/services/CartService.js';
import { prisma } from '../src/db/prisma.js';

describe('Server-side Cart & Money Bounds Unit Tests', () => {
  let testCartId: string;

  beforeAll(async () => {
    const cart = await CartService.getOrCreateCart();
    testCartId = cart.id;
  });

  afterAll(async () => {
    await prisma.cart.deleteMany({ where: { id: testCartId } });
    await prisma.$disconnect();
  });

  test('should add item and accurately calculate server-side price subtotal', async () => {
    const cart = await CartService.addItem(testCartId, 'prod_mouse_01', 2); // ₹8995 * 2 = ₹17990
    expect(cart.itemCount).toBe(2);
    expect(cart.subtotal).toBe(17990);
  });

  test('should throw error when attempting to add non-existent product', async () => {
    await expect(CartService.addItem(testCartId, 'invalid_prod_9999', 1))
      .rejects.toThrow();
  });
});
