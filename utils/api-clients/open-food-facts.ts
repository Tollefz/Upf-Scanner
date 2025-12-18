/**
 * Open Food Facts API Client
 * 
 * Public API - no authentication required
 * Documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

import { fetchWithRetry, type APIClientConfig } from './base';
import type { ProductAPIClient, RawProductData, NutritionData } from './types';

interface OpenFoodFactsResponse {
  status: number;
  code: string;
  product?: {
    product_name?: string;
    brands?: string;
    image_url?: string;
    image_front_url?: string;
    ingredients_text?: string;
    ingredients_text_da?: string;
    ingredients_text_en?: string;
    ingredients?: Array<{ text?: string }>;
    allergens?: string;
    allergens_tags?: string[];
    traces?: string;
    traces_tags?: string[];
    categories?: string;
    quantity?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      'energy-kcal'?: number;
      fat_100g?: number;
      fat?: number;
      'saturated-fat_100g'?: number;
      'saturated-fat'?: number;
      carbohydrates_100g?: number;
      carbohydrates?: number;
      sugars_100g?: number;
      sugars?: number;
      fiber_100g?: number;
      fiber?: number;
      proteins_100g?: number;
      proteins?: number;
      salt_100g?: number;
      salt?: number;
    };
  };
}

export class OpenFoodFactsClient implements ProductAPIClient {
  private baseURL: string;
  private config: APIClientConfig;

  constructor(config: APIClientConfig = {}) {
    this.baseURL = 'https://world.openfoodfacts.org/api/v2';
    this.config = config;
  }

  getSourceName(): string {
    return 'Open Food Facts';
  }

  async fetchProductByGTIN(gtin: string): Promise<RawProductData | null> {
    const url = `${this.baseURL}/product/${encodeURIComponent(gtin)}.json`;
    
    const response = await fetchWithRetry<OpenFoodFactsResponse>(
      url,
      {
        method: 'GET',
      },
      this.config
    );

    if (response.error || !response.data || response.data.status === 0 || !response.data.product) {
      return null;
    }

    return this.normalizeResponse(response.data.product, gtin);
  }

  /**
   * Normalizes Open Food Facts API response to common RawProductData format
   */
  private normalizeResponse(data: OpenFoodFactsResponse['product'], gtin: string): RawProductData {
    if (!data) {
      throw new Error('Product data is required');
    }

    // Extract ingredients (prioritize Danish, then English, then generic)
    const ingredients = 
      data.ingredients_text_da ||
      data.ingredients_text ||
      data.ingredients_text_en ||
      (data.ingredients && Array.isArray(data.ingredients)
        ? data.ingredients.map(ing => ing.text).filter(Boolean).join(', ')
        : undefined);

    // Extract allergens
    const allergens: string[] = [];
    if (data.allergens_tags && Array.isArray(data.allergens_tags)) {
      allergens.push(...data.allergens_tags.map(tag => tag.replace(/^en:/, '').replace(/-/g, ' ')));
    }
    if (data.allergens) {
      const allergenList = data.allergens.split(',').map(a => a.trim()).filter(Boolean);
      allergens.push(...allergenList);
    }

    // Extract traces
    const traces: string[] = [];
    if (data.traces_tags && Array.isArray(data.traces_tags)) {
      traces.push(...data.traces_tags.map(tag => tag.replace(/^en:/, '').replace(/-/g, ' ')));
    }
    if (data.traces) {
      const traceList = data.traces.split(',').map(t => t.trim()).filter(Boolean);
      traces.push(...traceList);
    }

    // Extract nutrition data
    let nutrition: NutritionData | undefined;
    if (data.nutriments) {
      const n = data.nutriments;
      nutrition = {
        energy_kcal_per_100g: n['energy-kcal_100g'] || n['energy-kcal'],
        fat_per_100g: n.fat_100g || n.fat,
        saturated_fat_per_100g: n['saturated-fat_100g'] || n['saturated-fat'],
        carbohydrates_per_100g: n.carbohydrates_100g || n.carbohydrates,
        sugars_per_100g: n.sugars_100g || n.sugars,
        fiber_per_100g: n.fiber_100g || n.fiber,
        proteins_per_100g: n.proteins_100g || n.proteins,
        salt_per_100g: n.salt_100g || n.salt,
      };
      
      // Remove undefined fields
      nutrition = Object.fromEntries(
        Object.entries(nutrition).filter(([_, v]) => v !== undefined)
      ) as NutritionData;
      
      if (Object.keys(nutrition).length === 0) {
        nutrition = undefined;
      }
    }

    // Extract quantity/size
    let quantity: string | undefined;
    let unit: string | undefined;
    if (data.quantity) {
      const match = data.quantity.match(/^(\d+(?:[.,]\d+)?)\s*(ml|g|kg|l|cl)$/i);
      if (match) {
        quantity = match[1];
        unit = match[2].toLowerCase();
      }
    }

    return {
      gtin,
      brand: data.brands || undefined,
      title: data.product_name || undefined,
      quantity,
      unit,
      category: data.categories ? data.categories.split(',').map(c => c.trim())[0] : undefined,
      ingredients,
      allergens: allergens.length > 0 ? allergens : undefined,
      traces: traces.length > 0 ? traces : undefined,
      nutrition,
      image_url: data.image_url || data.image_front_url || undefined,
    };
  }
}

