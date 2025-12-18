/**
 * Salling Group Products EAN API Client
 * 
 * Documentation: https://developer.sallinggroup.com/
 * 
 * TODO: Get API credentials from:
 * 1. Register at https://developer.sallinggroup.com/
 * 2. Create application and get Bearer token
 * 3. Set environment variable: EXPO_PUBLIC_SALLING_GROUP_TOKEN
 */

import { fetchWithRetry, getAuthHeaders, type APIClientConfig } from './base';
import type { ProductAPIClient, RawProductData, NutritionData } from './types';

interface SallingGroupResponse {
  ean?: string;
  name?: string;
  title?: string;
  brand?: string;
  brandName?: string;
  size?: string;
  unit?: string;
  category?: string;
  productCategory?: string;
  ingredients?: string;
  ingredientStatement?: string;
  allergens?: string[];
  allergenInformation?: string[];
  traces?: string[];
  nutrition?: SallingGroupNutrition;
  nutritionalInformation?: SallingGroupNutrition;
  imageUrl?: string;
  image_url?: string;
  productImage?: { url?: string };
}

interface SallingGroupNutrition {
  energy?: number;
  energyKcal?: number;
  fat?: number;
  saturatedFat?: number;
  saturated_fat?: number;
  carbohydrates?: number;
  sugars?: number;
  fiber?: number;
  fiber_per_100g?: number;
  proteins?: number;
  salt?: number;
}

export class SallingGroupClient implements ProductAPIClient {
  private token: string;
  private baseURL: string;
  private config: APIClientConfig;

  constructor(token: string, config: APIClientConfig = {}) {
    if (!token) {
      throw new Error('Salling Group token is required');
    }
    
    this.token = token;
    // TODO: Replace with actual Salling Group API base URL
    // Example: https://api.sallinggroup.com/v1
    this.baseURL = 'https://api.sallinggroup.com/v1';
    this.config = config;
  }

  getSourceName(): string {
    return 'Salling Group';
  }

  async fetchProductByGTIN(gtin: string): Promise<RawProductData | null> {
    // TODO: Replace with actual endpoint path
    // Example: /products/{ean}
    const url = `${this.baseURL}/products/${encodeURIComponent(gtin)}`;
    
    const response = await fetchWithRetry<SallingGroupResponse>(
      url,
      {
        method: 'GET',
        headers: getAuthHeaders(this.token),
      },
      this.config
    );

    if (response.error || !response.data) {
      console.warn(`Salling Group API error for GTIN ${gtin}:`, response.error);
      return null;
    }

    return this.normalizeResponse(response.data, gtin);
  }

  /**
   * Normalizes Salling Group API response to common RawProductData format
   */
  private normalizeResponse(data: SallingGroupResponse, gtin: string): RawProductData {
    // Extract nutrition data
    const nutritionData = data.nutrition || data.nutritionalInformation;
    let nutrition: NutritionData | undefined;
    
    if (nutritionData) {
      nutrition = {
        energy_kcal_per_100g: nutritionData.energyKcal || nutritionData.energy,
        fat_per_100g: nutritionData.fat,
        saturated_fat_per_100g: nutritionData.saturatedFat || nutritionData.saturated_fat,
        carbohydrates_per_100g: nutritionData.carbohydrates,
        sugars_per_100g: nutritionData.sugars,
        fiber_per_100g: nutritionData.fiber || nutritionData.fiber_per_100g,
        proteins_per_100g: nutritionData.proteins,
        salt_per_100g: nutritionData.salt,
      };
      
      // Remove undefined fields
      nutrition = Object.fromEntries(
        Object.entries(nutrition).filter(([_, v]) => v !== undefined)
      ) as NutritionData;
      
      if (Object.keys(nutrition).length === 0) {
        nutrition = undefined;
      }
    }

    // Extract image URL (handle multiple possible field names)
    const image_url = data.imageUrl || data.image_url || data.productImage?.url;

    return {
      gtin,
      brand: data.brand || data.brandName,
      title: data.name || data.title,
      quantity: data.size ? data.size.replace(/\D/g, '') : undefined,
      unit: data.unit || (data.size ? data.size.replace(/\d/g, '').trim() : undefined),
      category: data.category || data.productCategory,
      ingredients: data.ingredients || data.ingredientStatement,
      allergens: data.allergens && Array.isArray(data.allergens) && data.allergens.length > 0 
        ? data.allergens 
        : data.allergenInformation && Array.isArray(data.allergenInformation) && data.allergenInformation.length > 0
        ? data.allergenInformation
        : undefined,
      traces: data.traces && Array.isArray(data.traces) && data.traces.length > 0 ? data.traces : undefined,
      nutrition,
      image_url,
    };
  }
}

