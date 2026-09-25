import economy from './mamedesEconomy.json';
import type { Product } from '../types';

export const MAMEDES_ECONOMY_CATEGORY = 'Linha Econômica';
const economySkus = new Set(economy.products.map(product => product.sku));

export function supportsMamedesSizeNote(product: Product, tenantId: string): boolean {
  return tenantId === 'mamedes' && product.sku === '222222';
}

export function mamedesSizeNote(product: Product, tenantId: string, draft = ''): { notes?: string } {
  const notes = draft.trim().slice(0, 500);
  return supportsMamedesSizeNote(product, tenantId) && notes ? { notes } : {};
}

export function categorizeMamedesProduct(product: Product, tenantId: string): Product {
  if (tenantId !== 'mamedes' || !economySkus.has(product.sku)) return product;
  return { ...product, category: MAMEDES_ECONOMY_CATEGORY };
}
