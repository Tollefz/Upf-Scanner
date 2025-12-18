/**
 * GS1 Trade Exact API Client
 * 
 * Documentation: https://developer.gs1.org/
 * 
 * TODO: Get API credentials from:
 * 1. Register at https://developer.gs1.org/
 * 2. Create application and get API key
 * 3. Set environment variable: EXPO_PUBLIC_GS1_TRADE_EXACT_API_KEY
 */

import { fetchWithRetry, getAuthHeaders, type APIClientConfig } from './base';
import type { ProductAPIClient, RawProductData, NutritionData } from './types';

interface GS1TradeExactResponse {
  gtin: string;
  brandName?: string;
  productDescription?: string;
  netContent?: {
    value?: string;
    unitCode?: string;
  };
  productCategory?: {
    name?: string;
  };
  ingredientStatement?: string;
  allergenInformation?: {
    allergenType?: Array<{ name: string }>;
    allergenTypeCode?: Array<{ name: string }>;
  };
  nutritionalInformation?: {
    energy?: { value?: number };
    fat?: { value?: number };
    saturatedFat?: { value?: number };
    carbohydrates?: { value?: number };
    sugars?: { value?: number };
    fiber?: { value?: number };
    proteins?: { value?: number };
    salt?: { value?: number };
  };
  productImage?: {
    url?: string;
  };
}

export class GS1TradeExactClient implements ProductAPIClient {
  private apiKey: string;
  private baseURL: string;
  private config: APIClientConfig;

  constructor(apiKey: string, config: APIClientConfig = {}) {
    if (!apiKey) {
      throw new Error('GS1 Trade Exact API key is required');
    }
    
    this.apiKey = apiKey;
    // TODO: Replace with actual GS1 Trade Exact API base URL
    this.baseURL = 'https://api.gs1.org/trade-exact/v1';
    this.config = config;
  }

  getSourceName(): string {
    return 'GS1 Trade Exact';
  }

  async fetchProductByGTIN(gtin: string): Promise<RawProductData | null> {
    // TODO: Replace with actual endpoint path
    const url = `${this.baseURL}/products/${encodeURIComponent(gtin)}`;
    
    const response = await fetchWithRetry<GS1TradeExactResponse>(
      url,
      {
        method: 'GET',
        headers: getAuthHeaders(undefined, this.apiKey), // API key as Bearer token
      },
      this.config
    );

    if (response.error || !response.data) {
      console.warn(`GS1 Trade Exact API error for GTIN ${gtin}:`, response.error);
      return null;
    }

    return this.normalizeResponse(response.data, gtin);
  }

  /**
   * Normalizes GS1 Trade Exact API response to common RawProductData format
   */
  private normalizeResponse(data: GS1TradeExactResponse, gtin: string): RawProductData {
    // Extract nutrition data
    let nutrition: NutritionData | undefined;
    if (data.nutritionalInformation) {
      const ni = data.nutritionalInformation;
      nutrition = {
        energy_kcal_per_100g: ni.energy?.value,
        fat_per_100g: ni.fat?.value,
        saturated_fat_per_100g: ni.saturatedFat?.value,
        carbohydrates_per_100g: ni.carbohydrates?.value,
        sugars_per_100g: ni.sugars?.value,
        fiber_per_100g: ni.fiber?.value,
        proteins_per_100g: ni.proteins?.value,
        salt_per_100g: ni.salt?.value,
      };
      
      // Remove undefined fields
      nutrition = Object.fromEntries(
        Object.entries(nutrition).filter(([_, v]) => v !== undefined)
      ) as NutritionData;
      
      if (Object.keys(nutrition).length === 0) {
        nutrition = undefined;
      }
    }

    // Extract allergens
    const allergens = data.allergenInformation?.allergenType?.map(a => a.name);
    
    // Extract traces
    const traces = data.allergenInformation?.allergenTypeCode?.map(a => a.name);

    return {
      gtin,
      brand: data.brandName,
      title: data.productDescription,
      quantity: data.netContent?.value,
      unit: data.netContent?.unitCode,
      category: data.productCategory?.name,
      ingredients: data.ingredientStatement,
      allergens: allergens && allergens.length > 0 ? allergens : undefined,
      traces: traces && traces.length > 0 ? traces : undefined,
      nutrition: nutrition && Object.keys(nutrition).length > 0 ? nutrition : undefined,
      image_url: data.productImage?.url,
    };
  }
}

