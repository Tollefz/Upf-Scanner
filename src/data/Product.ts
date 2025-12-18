/**
 * Product Data Model
 * 
 * Normalisert produktmodell for cache og API-responser
 */

export type ProductSource = 'cache' | 'openfoodfacts' | 'user';

export interface Product {
  gtin: string; // Primary key
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  ingredientsText: string | null;
  allergens: string[]; // Normalisert array (uten "en:" prefiks)
  source: ProductSource;
  updatedAt: number; // ms epoch
}

/**
 * Helper to create a Product from partial data
 */
export function createProduct(data: Partial<Product> & { gtin: string }): Product {
  return {
    gtin: data.gtin,
    name: data.name ?? null,
    brand: data.brand ?? null,
    imageUrl: data.imageUrl ?? null,
    ingredientsText: data.ingredientsText ?? null,
    allergens: data.allergens ?? [],
    source: data.source ?? 'openfoodfacts',
    updatedAt: data.updatedAt ?? Date.now(),
  };
}

