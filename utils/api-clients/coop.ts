/**
 * Coop / 365discount API Client (Placeholder)
 * 
 * TODO: Get API credentials from:
 * 1. Contact Coop for API access
 * 2. Get API documentation and endpoints
 * 3. Set environment variable: EXPO_PUBLIC_COOP_API_KEY
 */

import { fetchWithRetry, getAuthHeaders, type APIClientConfig } from './base';
import type { ProductAPIClient, RawProductData, NutritionData } from './types';

interface CoopResponse {
  // TODO: Define actual API response structure based on Coop API documentation
  ean?: string;
  name?: string;
  brand?: string;
  size?: string;
  unit?: string;
  category?: string;
  ingredients?: string;
  allergens?: string[];
  traces?: string[];
  nutrition?: NutritionData;
  imageUrl?: string;
}

export class CoopClient implements ProductAPIClient {
  private apiKey: string;
  private baseURL: string;
  private config: APIClientConfig;

  constructor(apiKey: string, config: APIClientConfig = {}) {
    if (!apiKey) {
      throw new Error('Coop API key is required');
    }
    
    this.apiKey = apiKey;
    // TODO: Replace with actual Coop API base URL
    this.baseURL = 'https://api.coop.dk/v1';
    this.config = config;
  }

  getSourceName(): string {
    return 'Coop';
  }

  async fetchProductByGTIN(gtin: string): Promise<RawProductData | null> {
    // TODO: Replace with actual endpoint path
    const url = `${this.baseURL}/products/${encodeURIComponent(gtin)}`;
    
    const response = await fetchWithRetry<CoopResponse>(
      url,
      {
        method: 'GET',
        headers: getAuthHeaders(this.apiKey),
      },
      this.config
    );

    if (response.error || !response.data) {
      console.warn(`Coop API error for GTIN ${gtin}:`, response.error);
      return null;
    }

    return this.normalizeResponse(response.data, gtin);
  }

  /**
   * Normalizes Coop API response to common RawProductData format
   * TODO: Implement based on actual API response structure
   */
  private normalizeResponse(data: CoopResponse, gtin: string): RawProductData {
    return {
      gtin,
      brand: data.brand,
      title: data.name,
      quantity: data.size ? data.size.replace(/\D/g, '') : undefined,
      unit: data.unit || (data.size ? data.size.replace(/\d/g, '').trim() : undefined),
      category: data.category,
      ingredients: data.ingredients,
      allergens: data.allergens && Array.isArray(data.allergens) && data.allergens.length > 0 
        ? data.allergens 
        : undefined,
      traces: data.traces && Array.isArray(data.traces) && data.traces.length > 0 ? data.traces : undefined,
      nutrition: data.nutrition,
      image_url: data.imageUrl,
    };
  }
}

