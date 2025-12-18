/**
 * Common types for API clients
 */

export interface RawProductData {
  gtin: string;
  brand?: string;
  title?: string;
  quantity?: string;
  unit?: string;
  category?: string;
  ingredients?: string;
  allergens?: string[];
  traces?: string[];
  nutrition?: NutritionData;
  image_url?: string;
}

export interface NutritionData {
  energy_kcal_per_100g?: number;
  fat_per_100g?: number;
  saturated_fat_per_100g?: number;
  carbohydrates_per_100g?: number;
  sugars_per_100g?: number;
  fiber_per_100g?: number;
  proteins_per_100g?: number;
  salt_per_100g?: number;
}

/**
 * Interface all product API clients must implement
 */
export interface ProductAPIClient {
  fetchProductByGTIN(gtin: string): Promise<RawProductData | null>;
  getSourceName(): string;
}

