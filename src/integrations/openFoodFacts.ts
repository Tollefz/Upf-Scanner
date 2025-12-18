/**
 * Open Food Facts Integration
 * 
 * Fetches and normalizes product data from Open Food Facts API.
 */

import type { Product } from '../data/Product';
import { createProduct } from '../data/Product';

// Structured logging
function logOffEvent(event: string, details?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const detailStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[OFF] ${timestamp} ${event}${detailStr}`);
}

interface OffResponse {
  status: number; // 1 = found, 0 = not found
  code: string;
  product?: {
    product_name?: string;
    brands?: string;
    image_url?: string;
    ingredients_text?: string;
    ingredients_text_da?: string;
    ingredients_text_en?: string;
    ingredients?: Array<{ text?: string }>;
    allergens?: string;
    allergens_tags?: string[];
    traces?: string;
    traces_tags?: string[];
  };
}

/**
 * Normalize allergens array - remove "en:" prefix, normalize format, and remove duplicates
 */
function normalizeAllergens(
  allergens?: string,
  allergensTags?: string[]
): string[] {
  const normalizedSet = new Set<string>();

  // From tags (e.g., "en:gluten" -> "gluten")
  if (allergensTags && Array.isArray(allergensTags)) {
    allergensTags.forEach(tag => {
      const cleaned = tag.replace(/^en:/, '').replace(/-/g, ' ').trim().toLowerCase();
      if (cleaned) {
        normalizedSet.add(cleaned);
      }
    });
  }

  // From string (comma-separated)
  if (allergens) {
    const allergenList = allergens
      .split(',')
      .map(a => a.trim().toLowerCase())
      .filter(Boolean);
    allergenList.forEach(allergen => {
      // Remove "en:" prefix if present
      const cleaned = allergen.replace(/^en:/, '').replace(/-/g, ' ').trim();
      if (cleaned) {
        normalizedSet.add(cleaned);
      }
    });
  }

  // Convert Set to array and capitalize first letter of each word
  return Array.from(normalizedSet).map(allergen => {
    return allergen
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  });
}

/**
 * Fetch product from Open Food Facts API
 * 
 * @param gtin - GTIN/EAN code
 * @param signal - AbortSignal for cancellation
 * @returns Product or null if not found
 */
export async function fetchProductByGtin(
  gtin: string,
  signal: AbortSignal
): Promise<Product | null> {
  logOffEvent('LOOKUP_OFF_START', { gtin });

  const startTime = Date.now();

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(gtin)}.json`;
    
    const res = await fetch(url, { signal });

    if (res.status === 404) {
      const latency = Date.now() - startTime;
      logOffEvent('LOOKUP_OFF_NOT_FOUND', { gtin, latency });
      return null;
    }

    if (!res.ok) {
      const latency = Date.now() - startTime;
      logOffEvent('LOOKUP_OFF_ERROR', { gtin, status: res.status, latency });
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as OffResponse;

    if (data.status === 0 || !data.product) {
      const latency = Date.now() - startTime;
      logOffEvent('LOOKUP_OFF_NOT_FOUND', { gtin, latency });
      return null;
    }

    const off = data.product;

    // Extract ingredients (prioritize Danish, then English, then generic)
    const ingredientsText =
      off.ingredients_text_da ||
      off.ingredients_text ||
      off.ingredients_text_en ||
      (off.ingredients && Array.isArray(off.ingredients)
        ? off.ingredients.map(ing => ing.text).filter(Boolean).join(', ')
        : null) ||
      null;

    // Normalize allergens
    const allergens = normalizeAllergens(off.allergens, off.allergens_tags);

    // Create normalized Product
    const product = createProduct({
      gtin,
      name: off.product_name || null,
      brand: off.brands || null,
      imageUrl: off.image_url || null,
      ingredientsText,
      allergens,
      source: 'openfoodfacts',
      updatedAt: Date.now(),
    });

    const latency = Date.now() - startTime;
    logOffEvent('LOOKUP_OFF_SUCCESS', { gtin, latency, hasIngredients: !!ingredientsText });

    return product;
  } catch (error: any) {
    const latency = Date.now() - startTime;

    if (error.name === 'AbortError') {
      logOffEvent('LOOKUP_OFF_ABORTED', { gtin, latency });
      throw error; // Re-throw abort errors
    }

    logOffEvent('LOOKUP_OFF_ERROR', { gtin, error: error.message, latency });
    throw error;
  }
}

