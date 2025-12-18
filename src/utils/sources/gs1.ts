/**
 * GS1 Trade Exact / Image API Client
 * 
 * TODO: Get API credentials from https://developer.gs1.org/
 * Set environment variable: EXPO_PUBLIC_GS1_TRADE_EXACT_API_KEY
 * Set environment variable: EXPO_PUBLIC_GS1_IMAGE_API_KEY
 */

import Constants from 'expo-constants';
import type { Product, SourceUsed } from '../../models/Product';

const TIMEOUT = 10000; // 10 seconds

/**
 * Checks if GS1 API is configured
 */
function isGS1Configured(): boolean {
  const extra = Constants.expoConfig?.extra || {};
  const apiKey = extra.gs1TradeExactApiKey || process.env.EXPO_PUBLIC_GS1_TRADE_EXACT_API_KEY;
  return !!apiKey;
}

/**
 * Gets GS1 API key from environment
 */
function getGS1ApiKey(): string | null {
  const extra = Constants.expoConfig?.extra || {};
  return extra.gs1TradeExactApiKey || process.env.EXPO_PUBLIC_GS1_TRADE_EXACT_API_KEY || null;
}

/**
 * Gets GS1 Image API key from environment
 */
function getGS1ImageApiKey(): string | null {
  const extra = Constants.expoConfig?.extra || {};
  return extra.gs1ImageApiKey || process.env.EXPO_PUBLIC_GS1_IMAGE_API_KEY || null;
}

/**
 * Fetches product from GS1 Trade Exact API
 * 
 * TODO: Replace with actual GS1 Trade Exact API endpoint and response structure
 * Documentation: https://developer.gs1.org/
 */
export async function fetchFromGS1(gtin: string): Promise<{ product: Product | null; source: SourceUsed | null }> {
  if (!isGS1Configured()) {
    return { product: null, source: null };
  }
  
  const apiKey = getGS1ApiKey();
  if (!apiKey) {
    return { product: null, source: null };
  }
  
  try {
    // TODO: Replace with actual GS1 Trade Exact API endpoint
    // Example: https://api.gs1.org/trade-exact/v1/products/{gtin}
    const url = `https://api.gs1.org/trade-exact/v1/products/${encodeURIComponent(gtin)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok || res.status === 404) {
      return { product: null, source: null };
    }
    
    const data = await res.json();
    
    // TODO: Map GS1 Trade Exact response to Product
    // This depends on the actual API response structure
    // Example mapping (adjust based on actual API):
    const product: Product = {
      gtin,
      title: data.productDescription || data.description,
      brand: data.brandName || data.brand?.name,
      quantity: data.netContent?.value,
      unit: data.netContent?.unitCode,
      categories: data.productCategory?.name ? [data.productCategory.name] : undefined,
      ingredientsText: data.ingredientStatement,
      allergens: data.allergenInformation?.allergenType?.map((a: any) => a.name),
      traces: data.allergenInformation?.allergenTypeCode?.map((a: any) => a.name),
      nutrition: data.nutritionalInformation ? {
        energyKcalPer100g: data.nutritionalInformation.energy?.value,
        fatPer100g: data.nutritionalInformation.fat?.value,
        saturatedFatPer100g: data.nutritionalInformation.saturatedFat?.value,
        carbohydratesPer100g: data.nutritionalInformation.carbohydrates?.value,
        sugarsPer100g: data.nutritionalInformation.sugars?.value,
        fiberPer100g: data.nutritionalInformation.fiber?.value,
        proteinsPer100g: data.nutritionalInformation.proteins?.value,
        saltPer100g: data.nutritionalInformation.salt?.value,
      } : undefined,
      imageUrls: data.productImage?.url ? [data.productImage.url] : undefined,
      source: 'gs1-trade-exact',
      sourceConfidence: 95, // GS1 is authoritative
    };
    
    const source: SourceUsed = {
      name: 'GS1 Trade Exact',
      urlOrId: `GS1-TE:${gtin}`,
      matchedBy: 'ean',
      confidence: 95,
    };
    
    return { product, source };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('GS1 API timeout');
    } else {
      console.error('Error fetching from GS1:', error);
    }
    return { product: null, source: null };
  }
}

/**
 * Fetches product image from GS1 Image API
 * 
 * TODO: Replace with actual GS1 Image API endpoint
 */
export async function fetchGS1Image(gtin: string): Promise<string | null> {
  const imageApiKey = getGS1ImageApiKey();
  if (!imageApiKey) {
    return null;
  }
  
  try {
    // TODO: Replace with actual GS1 Image API endpoint
    const url = `https://api.gs1.org/image/v1/products/${encodeURIComponent(gtin)}/images`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${imageApiKey}`,
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok || res.status === 404) {
      return null;
    }
    
    const data = await res.json();
    
    // TODO: Extract image URL from GS1 Image API response
    return data.images?.[0]?.url || data.frontImage?.url || null;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('GS1 Image API timeout');
    } else {
      console.error('Error fetching GS1 image:', error);
    }
    return null;
  }
}

