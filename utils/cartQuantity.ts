import type { Product } from '../types';

export type CartItem = { product: Product; quantity: number };

export function quantityLimit(product: Product): number {
  if (product.stock === undefined || product.stock === null) return Number.MAX_SAFE_INTEGER;
  const stock = Number(product.stock);
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
}

export function setProductQuantity(cart: CartItem[], product: Product, quantity: number): CartItem[] {
  if (!Number.isSafeInteger(quantity) || quantity < 0) return cart;
  const nextQuantity = Math.min(quantity, quantityLimit(product));
  const existing = cart.find(item => item.product.id === product.id);
  const remaining = cart.filter(item => item.product.id !== product.id);
  if (nextQuantity === 0) return remaining;
  // Keep the original position and any selected variation/promotional price.
  if (existing) {
    let replaced = false;
    return cart.flatMap(item => {
      if (item.product.id !== product.id) return [item];
      if (replaced) return [];
      replaced = true;
      return [{ product: existing.product, quantity: nextQuantity }];
    });
  }
  return [...cart, { product, quantity: nextQuantity }];
}
