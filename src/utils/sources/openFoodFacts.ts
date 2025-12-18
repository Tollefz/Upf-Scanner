/**
 * Open Food Facts API Client
 * 
 * Public API - no authentication required
 * Documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

import type { Product, SourceUsed } from '../../models/Product';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2';
const TIMEOUT = 10000; // 10 seconds

interface OpenFoodFactsResponse {
  status: number;
  code: string;
  product?: {
    product_name?: string;
    brands?: string;
    image_url?: string;
    image_front_url?: string;
    image_front_small_url?: string;
    images?: Record<string, { url?: string }>;
    ingredients_text?: string;
    ingredients_text_da?: string;
    ingredients_text_en?: string;
    ingredients?: Array<{ text?: string }>;
    allergens?: string;
    allergens_tags?: string[];
    traces?: string;
    traces_tags?: string[];
    categories?: string;
    categories_tags?: string[];
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

/**
 * Fetches product from Open Food Facts
 */
export async function fetchFromOpenFoodFacts(gtin: string): Promise<{ product: Product | null; source: SourceUsed | null }> {
  try {
    const url = `${BASE_URL}/product/${encodeURIComponent(gtin)}.json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok || res.status === 404) {
      return { product: null, source: null };
    }
    
    const data = (await res.json()) as OpenFoodFactsResponse;
    
    if (data.status === 0 || !data.product) {
      return { product: null, source: null };
    }
    
    const off = data.product;
    
    // Extract ingredients (prioritize Danish, then English, then generic)
    const ingredientsText = 
      off.ingredients_text_da ||
      off.ingredients_text ||
      off.ingredients_text_en ||
      (off.ingredients && Array.isArray(off.ingredients)
        ? off.ingredients.map(ing => ing.text).filter(Boolean).join(', ')
        : undefined);
    
    // Extract allergens
    const allergens: string[] = [];
    if (off.allergens_tags && Array.isArray(off.allergens_tags)) {
      allergens.push(...off.allergens_tags.map(tag => tag.replace(/^en:/, '').replace(/-/g, ' ')));
    }
    if (off.allergens) {
      const allergenList = off.allergens.split(',').map(a => a.trim()).filter(Boolean);
      allergens.push(...allergenList);
    }
    
    // Extract traces
    const traces: string[] = [];
    if (off.traces_tags && Array.isArray(off.traces_tags)) {
      traces.push(...off.traces_tags.map(tag => tag.replace(/^en:/, '').replace(/-/g, ' ')));
    }
    if (off.traces) {
      const traceList = off.traces.split(',').map(t => t.trim()).filter(Boolean);
      traces.push(...traceList);
    }
    
    // Extract categories
    const categories = off.categories
      ? off.categories.split(',').map(c => c.trim()).filter(Boolean)
      : off.categories_tags
      ? off.categories_tags.map(tag => tag.replace(/^en:/, '').replace(/-/g, ' ')).filter(Boolean)
      : undefined;
    
    // Extract quantity/size
    let quantity: string | undefined;
    let unit: string | undefined;
    if (off.quantity) {
      const match = off.quantity.match(/^(\d+(?:[.,]\d+)?)\s*(ml|g|kg|l|cl)$/i);
      if (match) {
        quantity = match[1];
        unit = match[2].toLowerCase();
      }
    }
    
    // Extract image URLs
    const imageUrls: string[] = [];
    if (off.image_front_url) imageUrls.push(off.image_front_url);
    if (off.image_url && !imageUrls.includes(off.image_url)) imageUrls.push(off.image_url);
    if (off.image_front_small_url && !imageUrls.includes(off.image_front_small_url)) {
      imageUrls.push(off.image_front_small_url);
    }
    // Add other images from images object
    if (off.images) {
      Object.values(off.images).forEach(img => {
        if (img.url && !imageUrls.includes(img.url)) {
          imageUrls.push(img.url);
        }
      });
    }
    
    // Extract nutrition data
    const nutrition = off.nutriments ? {
      energyKcalPer100g: off.nutriments['energy-kcal_100g'] || off.nutriments['energy-kcal'],
      fatPer100g: off.nutriments.fat_100g || off.nutriments.fat,
      saturatedFatPer100g: off.nutriments['saturated-fat_100g'] || off.nutriments['saturated-fat'],
      carbohydratesPer100g: off.nutriments.carbohydrates_100g || off.nutriments.carbohydrates,
      sugarsPer100g: off.nutriments.sugars_100g || off.nutriments.sugars,
      fiberPer100g: off.nutriments.fiber_100g || off.nutriments.fiber,
      proteinsPer100g: off.nutriments.proteins_100g || off.nutriments.proteins,
      saltPer100g: off.nutriments.salt_100g || off.nutriments.salt,
    } : undefined;
    
    // Remove undefined nutrition fields
    const cleanedNutrition = nutrition && Object.keys(nutrition).some(key => nutrition[key as keyof typeof nutrition] !== undefined)
      ? Object.fromEntries(
          Object.entries(nutrition).filter(([_, v]) => v !== undefined)
        )
      : undefined;
    
    // Calculate source confidence based on data quality
    let confidence = 70; // Base for Open Food Facts (community-driven)
    if (ingredientsText && ingredientsText.length > 50) confidence += 10;
    if (ingredientsText && ingredientsText.length > 100) confidence += 5;
    if (imageUrls.length > 0) confidence += 5;
    if (cleanedNutrition && Object.keys(cleanedNutrition).length >= 5) confidence += 5;
    if (allergens.length > 0 || traces.length > 0) confidence += 3;
    confidence = Math.min(100, confidence);
    
    const product: Product = {
      gtin,
      title: off.product_name || undefined,
      brand: off.brands || undefined,
      quantity,
      unit,
      categories: categories && categories.length > 0 ? categories : undefined,
      ingredientsText,
      allergens: allergens.length > 0 ? allergens : undefined,
      traces: traces.length > 0 ? traces : undefined,
      nutrition: cleanedNutrition as any,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      source: 'openfoodfacts',
      sourceConfidence: confidence,
    };
    
    const source: SourceUsed = {
      name: 'Open Food Facts',
      urlOrId: `https://world.openfoodfacts.org/product/${gtin}`,
      matchedBy: 'ean',
      confidence,
    };
    
    return { product, source };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('Open Food Facts API timeout');
    } else {
      console.error('Error fetching from Open Food Facts:', error);
    }
    return { product: null, source: null };
  }
}

