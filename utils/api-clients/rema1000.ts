/**
 * REMA 1000 API Client (Placeholder)
 * 
 * TODO: Get API credentials from:
 * 1. Contact REMA 1000 for API access
 * 2. Get API documentation and endpoints
 * 3. Set environment variable: EXPO_PUBLIC_REMA_1000_API_KEY
 */

import { fetchWithRetry, getAuthHeaders, type APIClientConfig } from './base';
import type { ProductAPIClient, RawProductData, NutritionData } from './types';

interface REMA1000Response {
  // TODO: Define actual API response structure based on REMA 1000 API documentation
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

export class REMA1000Client implements ProductAPIClient {
  private apiKey: string;
  private baseURL: string;
  private config: APIClientConfig;

  constructor(apiKey: string, config: APIClientConfig = {}) {
    if (!apiKey) {
      throw new Error('REMA 1000 API key is required');
    }
    
    this.apiKey = apiKey;
    // TODO: Replace with actual REMA 1000 API base URL
    this.baseURL = 'https://api.rema1000.dk/v1';
    this.config = config;
  }

  getSourceName(): string {
    return 'REMA 1000';
  }

  async fetchProductByGTIN(gtin: string): Promise<RawProductData | null> {
    // TODO: Replace with actual endpoint path
    const url = `${this.baseURL}/products/${encodeURIComponent(gtin)}`;
    
    const response = await fetchWithRetry<REMA1000Response>(
      url,
      {
        method: 'GET',
        headers: getAuthHeaders(undefined, this.apiKey, true), // Use X-API-Key header
      },
      this.config
    );

    if (response.error || !response.data) {
      console.warn(`REMA 1000 API error for GTIN ${gtin}:`, response.error);
      return null;
    }

    return this.normalizeResponse(response.data, gtin);
  }

  /**
   * Normalizes REMA 1000 API response to common RawProductData format
   * TODO: Implement based on actual API response structure
   */
  private normalizeResponse(data: REMA1000Response, gtin: string): RawProductData {
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

