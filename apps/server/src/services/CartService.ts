import { prisma } from '../db/prisma.js';

export interface CartItemDetail {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl?: string | null;
}

export interface CartSummary {
  id: string;
  userId?: string | null;
  items: CartItemDetail[];
  subtotal: number;
  itemCount: number;
  currency: string;
  status: string;
}

export class CartService {
  static async getOrCreateCart(cartId?: string, userId?: string): Promise<CartSummary> {
    let cart = null;

    if (cartId) {
      cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: {
            include: { product: true }
          }
        }
      });
    }

    if (!cart) {
      if (userId) {
        await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: {
            id: userId,
            name: 'Guest',
            email: `${userId}@guest.local`,
            role: 'customer'
          }
        });
      }

      cart = await prisma.cart.create({
        data: {
          userId,
          status: 'active'
        },
        include: {
          items: {
            include: { product: true }
          }
        }
      });
    }

    return this.calculateCartSummary(cart);
  }

  static async addItem(cartId: string, productId: string, quantity: number = 1): Promise<CartSummary> {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new Error(`Product with ID '${productId}' not found`);
    }

    if (product.stock < quantity) {
      throw new Error(`Insufficient stock for product '${product.name}'. Available: ${product.stock}`);
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId, productId }
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          price: product.price // Always use server side price
        }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId,
          productId,
          quantity,
          price: product.price // Always use server side price
        }
      });
    }

    return this.getOrCreateCart(cartId);
  }

  static async removeItem(cartId: string, itemId: string): Promise<CartSummary> {
    await prisma.cartItem.deleteMany({
      where: {
        id: itemId,
        cartId
      }
    });

    return this.getOrCreateCart(cartId);
  }

  static async clearCart(cartId: string): Promise<CartSummary> {
    await prisma.cartItem.deleteMany({
      where: { cartId }
    });

    return this.getOrCreateCart(cartId);
  }

  static calculateCartSummary(cart: any): CartSummary {
    let subtotal = 0;
    let itemCount = 0;

    const items: CartItemDetail[] = (cart.items || []).map((item: any) => {
      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;
      itemCount += item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || 'Product',
        productCategory: item.product?.category || 'general',
        price: item.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        imageUrl: item.product?.imageUrl
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      subtotal,
      itemCount,
      currency: 'INR',
      status: cart.status
    };
  }
}
