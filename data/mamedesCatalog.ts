import economy from './mamedesEconomy.json';
import type { Product } from '../types';

export const MAMEDES_ECONOMY_CATEGORY = 'Linha Econômica';
const economySkus = new Set(economy.products.map(product => product.sku));

export function categorizeMamedesProduct(product: Product, tenantId: string): Product {
  if (tenantId !== 'mamedes' || !economySkus.has(product.sku)) return product;
  return { ...product, category: MAMEDES_ECONOMY_CATEGORY };
}
