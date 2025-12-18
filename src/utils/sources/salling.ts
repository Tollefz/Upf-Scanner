/**
 * Salling Group Products EAN API Client
 * 
 * TODO: Get API credentials from https://developer.sallinggroup.com/
 * Set environment variable: EXPO_PUBLIC_SALLING_GROUP_TOKEN
 */

import Constants from 'expo-constants';
import type { Product, SourceUsed } from '../../models/Product';

const TIMEOUT = 10000; // 10 seconds

/**
 * Checks if Salling Group API is configured
 */
function isSallingConfigured(): boolean {
  const extra = Constants.expoConfig?.extra || {};
  const token = extra.sallingGroupToken || process.env.EXPO_PUBLIC_SALLING_GROUP_TOKEN;
  return !!token;
}

/**
 * Gets Salling Group token from environment
 */
function getSallingToken(): string | null {
  const extra = Constants.expoConfig?.extra || {};
  return extra.sallingGroupToken || process.env.EXPO_PUBLIC_SALLING_GROUP_TOKEN || null;
}

/**
 * Fetches product from Salling Group API
 * 
 * TODO: Replace with actual Salling Group API endpoint and response structure
 * Documentation: https://developer.sallinggroup.com/
 */
export async function fetchFromSalling(gtin: string): Promise<{ product: Product | null; source: SourceUsed | null }> {
  if (!isSallingConfigured()) {
    return { product: null, source: null };
  }
  
  const token = getSallingToken();
  if (!token) {
    return { product: null, source: null };
  }
  
  try {
    // TODO: Replace with actual Salling Group API endpoint
    // Example: https://api.sallinggroup.com/v1/products/{ean}
    const url = `https://api.sallinggroup.com/v1/products/${encodeURIComponent(gtin)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok || res.status === 404) {
      return { product: null, source: null };
    }
    
    const data = await res.json();
    
    // TODO: Map Salling Group response to Product
    // This depends on the actual API response structure
    // Example mapping (adjust based on actual API):
    const product: Product = {
      gtin,
      title: data.name || data.title,
      brand: data.brand || data.brandName,
      quantity: data.size ? data.size.replace(/\D/g, '') : undefined,
      unit: data.unit || (data.size ? data.size.replace(/\d/g, '').trim() : undefined),
      categories: data.category ? [data.category] : data.productCategory ? [data.productCategory] : undefined,
      ingredientsText: data.ingredients || data.ingredientStatement,
      allergens: Array.isArray(data.allergens) ? data.allergens : undefined,
      traces: Array.isArray(data.traces) ? data.traces : undefined,
      nutrition: data.nutrition || data.nutritionalInformation ? {
        energyKcalPer100g: data.nutrition?.energyKcal || data.nutritionalInformation?.energy?.value,
        fatPer100g: data.nutrition?.fat || data.nutritionalInformation?.fat?.value,
        saturatedFatPer100g: data.nutrition?.saturatedFat || data.nutritionalInformation?.saturatedFat?.value,
        carbohydratesPer100g: data.nutrition?.carbohydrates || data.nutritionalInformation?.carbohydrates?.value,
        sugarsPer100g: data.nutrition?.sugars || data.nutritionalInformation?.sugars?.value,
        fiberPer100g: data.nutrition?.fiber || data.nutritionalInformation?.fiber?.value,
        proteinsPer100g: data.nutrition?.proteins || data.nutritionalInformation?.proteins?.value,
        saltPer100g: data.nutrition?.salt || data.nutritionalInformation?.salt?.value,
      } : undefined,
      imageUrls: data.imageUrl || data.image_url || data.productImage?.url ? [data.imageUrl || data.image_url || data.productImage.url] : undefined,
      source: 'salling-group',
      sourceConfidence: 85, // Official chain API
    };
    
    const source: SourceUsed = {
      name: 'Salling Group',
      urlOrId: `Salling:${gtin}`,
      matchedBy: 'ean',
      confidence: 85,
    };
    
    return { product, source };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('Salling Group API timeout');
    } else {
      console.error('Error fetching from Salling Group:', error);
    }
    return { product: null, source: null };
  }
}

