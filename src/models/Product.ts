/**
 * Product Data Models
 * 
 * Normalisert produktmodell for hele appen
 */

export interface Product {
  gtin: string;
  title?: string;
  brand?: string;
  quantity?: string;
  unit?: string;
  categories?: string[];
  ingredientsText?: string;
  allergens?: string[];
  traces?: string[];
  nutrition?: NutritionData;
  imageUrls?: string[];
  source: string;
  sourceConfidence: number; // 0-100
}

export interface NutritionData {
  energyKcalPer100g?: number;
  fatPer100g?: number;
  saturatedFatPer100g?: number;
  carbohydratesPer100g?: number;
  sugarsPer100g?: number;
  fiberPer100g?: number;
  proteinsPer100g?: number;
  saltPer100g?: number;
}

export interface SourceUsed {
  name: string;
  urlOrId: string;
  matchedBy: 'ean' | 'text_search' | 'fuzzy';
  confidence: number;
}

export interface LookupResult {
  status: 'exact_ean' | 'probable' | 'not_found';
  product?: Product;
  sourcesUsed: SourceUsed[];
  nextActions?: string[];
  error?: string;
}

export interface LookupOptions {
  ocrText?: string;
}

