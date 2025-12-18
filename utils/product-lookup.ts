/**
 * Product Lookup Agent for Danish Food & Beverage Mobile App
 * 
 * Identifies products from scanned EAN/GTIN barcodes and returns normalized product objects.
 * Maximizes hit rate while respecting source terms of service.
 * 
 * Supports: EAN-8, EAN-13, UPC-A (12), GTIN-14
 * Sources: GS1 Trade Exact/Image (priority 1), Chain APIs (priority 2), Open Food Facts (priority 3)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration interface for API keys and allowed sources
export interface ProductLookupConfig {
  locale?: string;
  // TODO: Configure GS1 Trade Exact API credentials
  // Get API key from: https://developer.gs1.org/
  gs1TradeExactApiKey?: string;
  gs1ImageApiKey?: string;
  // TODO: Configure Salling Group API token
  // Get token from: https://developer.sallinggroup.com/
  sallingGroupToken?: string;
  // TODO: Configure REMA 1000 API key
  // Contact REMA 1000 for API access
  rema1000ApiKey?: string;
  // TODO: Configure Coop/365discount API key
  // Contact Coop for API access
  coopApiKey?: string;
  allowedScrapingSources?: string[]; // Explicitly allowed scraping sources (should be empty)
}

// Normalized product data structure
export interface NormalizedProduct {
  gtin: string;
  brand?: string;
  title?: string;
  quantity?: string;
  unit?: string;
  category?: string;
  ingredients?: string;
  allergens?: string[];
  traces?: string[];
  nutrition?: NutritionData;
  image_url?: string;
  source: string;
  source_confidence: number; // 0-100
  last_seen?: number; // timestamp
}

export interface NutritionData {
  energy_kcal_per_100g?: number;
  fat_per_100g?: number;
  saturated_fat_per_100g?: number;
  carbohydrates_per_100g?: number;
  sugars_per_100g?: number;
  fiber_per_100g?: number;
  proteins_per_100g?: number;
  salt_per_100g?: number;
}

// Source information
export interface SourceInfo {
  name: string;
  url_or_id: string;
  matched_by: 'ean' | 'text_search' | 'fuzzy';
  confidence: number;
}

// Match status
export type MatchStatus = 'exact_ean' | 'probable' | 'not_found';

// Next actions when not found
export type NextAction = 'ask_user_photo' | 'ask_user_name' | 'store_unknown_gtin';

// Product lookup result
export interface ProductLookupResult {
  product?: NormalizedProduct;
  sources_used: SourceInfo[];
  match_status: MatchStatus;
  next_actions?: NextAction[];
  error?: string;
}

// OCR input (optional)
export interface OCRInput {
  text?: string; // Extracted text from packaging
  brand?: string;
  name?: string;
  size?: string; // e.g., "500ml", "200g"
  imageBase64?: string; // Product image (front)
}

// Cache entry
interface CacheEntry {
  product: NormalizedProduct;
  sources_used: SourceInfo[];
  match_status: MatchStatus;
  timestamp: number;
}

const CACHE_KEY = 'product_lookup_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const UNKNOWN_GTINS_KEY = 'unknown_gtins';
const API_TIMEOUT = 10000; // 10 seconds

// Default configuration
const DEFAULT_CONFIG: ProductLookupConfig = {
  locale: 'da-DK',
  allowedScrapingSources: [],
};

/**
 * Calculates EAN/GTIN checksum using Luhn algorithm
 */
function calculateChecksum(gtin: string): number {
  const digits = gtin.split('').map(Number);
  let sum = 0;
  
  for (let i = digits.length - 2; i >= 0; i--) {
    const multiplier = (digits.length - 1 - i) % 2 === 0 ? 3 : 1;
    sum += digits[i] * multiplier;
  }
  
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validates GTIN/EAN code with checksum verification
 * Supports EAN-8, EAN-13, UPC-A (12), and GTIN-14
 */
export function validateGTIN(gtin: string): { valid: boolean; normalized?: string; error?: string } {
  // Remove spaces and normalize
  const normalized = gtin.replace(/\s+/g, '').trim();
  
  // Check length
  if (normalized.length !== 8 && normalized.length !== 12 && normalized.length !== 13 && normalized.length !== 14) {
    return {
      valid: false,
      error: `Ugyldig GTIN-lengde: ${normalized.length}. Forventet 8, 12, 13 eller 14 siffer.`,
    };
  }
  
  // Check if all digits
  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      error: 'GTIN må kun inneholde siffer',
    };
  }
  
  // Validate checksum (last digit is check digit)
  const checkDigit = parseInt(normalized[normalized.length - 1], 10);
  const calculatedCheck = calculateChecksum(normalized);
  
  if (checkDigit !== calculatedCheck) {
    return {
      valid: false,
      error: 'Ugyldig GTIN-checksum',
    };
  }
  
  return {
    valid: true,
    normalized,
  };
}

/**
 * Fetches product from GS1 Trade Exact API (highest priority)
 * TODO: Implement actual GS1 Trade Exact API integration
 * Documentation: https://developer.gs1.org/
 */
async function fetchFromGS1TradeExact(
  gtin: string,
  apiKey?: string
): Promise<{ product?: NormalizedProduct; source?: SourceInfo }> {
  if (!apiKey) {
    return {};
  }
  
  try {
    // TODO: Replace with actual GS1 Trade Exact API endpoint
    // Example: https://api.gs1.org/trade-exact/v1/products/{gtin}
    const url = `https://api.gs1.org/trade-exact/v1/products/${encodeURIComponent(gtin)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok || res.status === 404) {
      return {};
    }
    
    const data = await res.json();
    
    // TODO: Map GS1 Trade Exact response to NormalizedProduct
    // This depends on the actual API response structure
    const product: NormalizedProduct = {
      gtin,
      brand: data.brandName || data.brand?.name,
      title: data.productDescription || data.description,
      quantity: data.netContent?.value,
      unit: data.netContent?.unitCode,
      category: data.productCategory?.name,
      ingredients: data.ingredientStatement,
      allergens: data.allergenInformation?.allergenType?.map((a: any) => a.name),
      traces: data.allergenInformation?.allergenTypeCode?.map((a: any) => a.name),
      nutrition: data.nutritionalInformation ? {
        energy_kcal_per_100g: data.nutritionalInformation.energy?.value,
        fat_per_100g: data.nutritionalInformation.fat?.value,
        saturated_fat_per_100g: data.nutritionalInformation.saturatedFat?.value,
        carbohydrates_per_100g: data.nutritionalInformation.carbohydrates?.value,
        sugars_per_100g: data.nutritionalInformation.sugars?.value,
        fiber_per_100g: data.nutritionalInformation.fiber?.value,
        proteins_per_100g: data.nutritionalInformation.proteins?.value,
        salt_per_100g: data.nutritionalInformation.salt?.value,
      } : undefined,
      image_url: data.productImage?.url,
      source: 'gs1-trade-exact',
      source_confidence: calculateSourceConfidence('gs1-trade-exact', data),
      last_seen: Date.now(),
    };
    
    const source: SourceInfo = {
      name: 'GS1 Trade Exact',
      url_or_id: `GS1-TE:${gtin}`,
      matched_by: 'ean',
      confidence: product.source_confidence,
    };
    
    return { product, source };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('GS1 Trade Exact API timeout');
    } else {
      console.error('Error fetching from GS1 Trade Exact:', error);
    }
    return {};
  }
}

/**
 * Fetches product image from GS1 Image API
 * TODO: Implement actual GS1 Image API integration
 */
async function fetchFromGS1Image(
  gtin: string,
  apiKey?: string
): Promise<{ image_url?: string }> {
  if (!apiKey) {
    return {};
  }
  
  try {
    // TODO: Replace with actual GS1 Image API endpoint
    const url = `https://api.gs1.org/image/v1/products/${encodeURIComponent(gtin)}/images`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok || res.status === 404) {
      return {};
    }
    
    const data = await res.json();
    
    // TODO: Extract image URL from GS1 Image API response
    const image_url = data.images?.[0]?.url || data.frontImage?.url;
    
    return { image_url };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('GS1 Image API timeout');
    } else {
      console.error('Error fetching from GS1 Image:', error);
    }
    return {};
  }
}

/**
 * Fetches product from Open Food Facts (fallback source)
 */
async function fetchFromOpenFoodFacts(gtin: string): Promise<{ product?: NormalizedProduct; source?: SourceInfo }> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(gtin)}.json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok || res.status === 404) {
      return {};
    }
    
    const data = await res.json();
    
    if (data.status === 0 || !data.product) {
      return {};
    }
    
    const off = data.product;
    
    // Extract ingredients (prioritize Danish, then English, then generic)
    const ingredients = 
      off.ingredients_text_da ||
      off.ingredients_text ||
      off.ingredients_text_en ||
      (off.ingredients && Array.isArray(off.ingredients)
        ? off.ingredients.map((ing: any) => ing.text).filter(Boolean).join(', ')
        : '') ||
      undefined;
    
    // Extract allergens
    const allergens: string[] = [];
    if (off.allergens_tags && Array.isArray(off.allergens_tags)) {
      allergens.push(...off.allergens_tags.map((tag: string) => tag.replace(/^en:/, '').replace(/-/g, ' ')));
    }
    if (off.allergens) {
      const allergenList = off.allergens.split(',').map((a: string) => a.trim()).filter(Boolean);
      allergens.push(...allergenList);
    }
    
    // Extract traces
    const traces: string[] = [];
    if (off.traces_tags && Array.isArray(off.traces_tags)) {
      traces.push(...off.traces_tags.map((tag: string) => tag.replace(/^en:/, '').replace(/-/g, ' ')));
    }
    if (off.traces) {
      const traceList = off.traces.split(',').map((t: string) => t.trim()).filter(Boolean);
      traces.push(...traceList);
    }
    
    // Extract nutrition data
    const nutrition: NutritionData = {};
    if (off.nutriments) {
      const n = off.nutriments;
      nutrition.energy_kcal_per_100g = n['energy-kcal_100g'] || n['energy-kcal'];
      nutrition.fat_per_100g = n.fat_100g || n.fat;
      nutrition.saturated_fat_per_100g = n['saturated-fat_100g'] || n['saturated-fat'];
      nutrition.carbohydrates_per_100g = n.carbohydrates_100g || n.carbohydrates;
      nutrition.sugars_per_100g = n.sugars_100g || n.sugars;
      nutrition.fiber_per_100g = n.fiber_100g || n.fiber;
      nutrition.proteins_per_100g = n.proteins_100g || n.proteins;
      nutrition.salt_per_100g = n.salt_100g || n.salt;
    }
    
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
    
    const product: NormalizedProduct = {
      gtin,
      brand: off.brands || undefined,
      title: off.product_name || undefined,
      quantity,
      unit,
      category: off.categories ? off.categories.split(',').map((c: string) => c.trim())[0] : undefined,
      ingredients,
      allergens: allergens.length > 0 ? allergens : undefined,
      traces: traces.length > 0 ? traces : undefined,
      nutrition: Object.keys(nutrition).length > 0 ? nutrition : undefined,
      image_url: off.image_url || off.image_front_url || undefined,
      source: 'openfoodfacts',
      source_confidence: calculateSourceConfidence('openfoodfacts', { ingredients, image_url: off.image_url }),
      last_seen: Date.now(),
    };
    
    const source: SourceInfo = {
      name: 'Open Food Facts',
      url_or_id: `https://world.openfoodfacts.org/product/${gtin}`,
      matched_by: 'ean',
      confidence: product.source_confidence,
    };
    
    return { product, source };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('Open Food Facts API timeout');
    } else {
      console.error('Error fetching from Open Food Facts:', error);
    }
    return {};
  }
}

/**
 * Fetches product from Salling Group APIs (Føtex, Netto, Bilka)
 * TODO: Implement actual Salling Group API integration
 * Documentation: https://developer.sallinggroup.com/
 */
async function fetchFromSallingGroup(gtin: string, token?: string): Promise<{ product?: NormalizedProduct; source?: SourceInfo }> {
  if (!token) {
    return {};
  }
  
  try {
    // TODO: Replace with actual Salling Group API endpoint
    // Example: https://api.sallinggroup.com/v1/products/{gtin}
    const url = `https://api.sallinggroup.com/v1/products/${encodeURIComponent(gtin)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok || res.status === 404) {
      return {};
    }
    
    const data = await res.json();
    
    // TODO: Map Salling Group response to NormalizedProduct
    const product: NormalizedProduct = {
      gtin,
      brand: data.brand,
      title: data.name || data.title,
      quantity: data.size,
      unit: data.unit,
      category: data.category,
      ingredients: data.ingredients,
      allergens: Array.isArray(data.allergens) ? data.allergens : undefined,
      traces: Array.isArray(data.traces) ? data.traces : undefined,
      nutrition: data.nutrition,
      image_url: data.imageUrl || data.image_url,
      source: 'sallinggroup',
      source_confidence: calculateSourceConfidence('sallinggroup', data),
      last_seen: Date.now(),
    };
    
    const source: SourceInfo = {
      name: 'Salling Group',
      url_or_id: `Salling:${gtin}`,
      matched_by: 'ean',
      confidence: product.source_confidence,
    };
    
    return { product, source };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('Salling Group API timeout');
    } else {
      console.error('Error fetching from Salling Group:', error);
    }
    return {};
  }
}

/**
 * Fetches product from REMA 1000 API
 * TODO: Implement actual REMA 1000 API integration
 * Contact REMA 1000 for API documentation
 */
async function fetchFromRema1000(gtin: string, apiKey?: string): Promise<{ product?: NormalizedProduct; source?: SourceInfo }> {
  if (!apiKey) {
    return {};
  }
  
  try {
    // TODO: Replace with actual REMA 1000 API endpoint
    const url = `https://api.rema1000.dk/v1/products/${encodeURIComponent(gtin)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok || res.status === 404) {
      return {};
    }
    
    const data = await res.json();
    
    const product: NormalizedProduct = {
      gtin,
      brand: data.brand,
      title: data.name,
      quantity: data.size,
      unit: data.unit,
      category: data.category,
      ingredients: data.ingredients,
      allergens: Array.isArray(data.allergens) ? data.allergens : undefined,
      traces: Array.isArray(data.traces) ? data.traces : undefined,
      nutrition: data.nutrition,
      image_url: data.imageUrl || data.image_url,
      source: 'rema1000',
      source_confidence: calculateSourceConfidence('rema1000', data),
      last_seen: Date.now(),
    };
    
    const source: SourceInfo = {
      name: 'REMA 1000',
      url_or_id: `REMA1000:${gtin}`,
      matched_by: 'ean',
      confidence: product.source_confidence,
    };
    
    return { product, source };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('REMA 1000 API timeout');
    } else {
      console.error('Error fetching from REMA 1000:', error);
    }
    return {};
  }
}

/**
 * Fetches product from Coop/365discount API
 * TODO: Implement actual Coop API integration
 * Contact Coop for API documentation
 */
async function fetchFromCoop(gtin: string, apiKey?: string): Promise<{ product?: NormalizedProduct; source?: SourceInfo }> {
  if (!apiKey) {
    return {};
  }
  
  try {
    // TODO: Replace with actual Coop API endpoint
    const url = `https://api.coop.dk/v1/products/${encodeURIComponent(gtin)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok || res.status === 404) {
      return {};
    }
    
    const data = await res.json();
    
    const product: NormalizedProduct = {
      gtin,
      brand: data.brand,
      title: data.name,
      quantity: data.size,
      unit: data.unit,
      category: data.category,
      ingredients: data.ingredients,
      allergens: Array.isArray(data.allergens) ? data.allergens : undefined,
      traces: Array.isArray(data.traces) ? data.traces : undefined,
      nutrition: data.nutrition,
      image_url: data.imageUrl || data.image_url,
      source: 'coop',
      source_confidence: calculateSourceConfidence('coop', data),
      last_seen: Date.now(),
    };
    
    const source: SourceInfo = {
      name: 'Coop',
      url_or_id: `Coop:${gtin}`,
      matched_by: 'ean',
      confidence: product.source_confidence,
    };
    
    return { product, source };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('Coop API timeout');
    } else {
      console.error('Error fetching from Coop:', error);
    }
    return {};
  }
}

/**
 * Calculates source confidence (0-100) based on source type and data quality
 */
function calculateSourceConfidence(source: string, data: any): number {
  let baseConfidence = 50;
  
  // Base confidence by source
  switch (source) {
    case 'gs1-trade-exact':
      baseConfidence = 95; // GS1 is authoritative
      break;
    case 'sallinggroup':
    case 'rema1000':
    case 'coop':
      baseConfidence = 85; // Official chain APIs
      break;
    case 'openfoodfacts':
      baseConfidence = 70; // Community-driven
      break;
    default:
      baseConfidence = 50;
  }
  
  // Adjust based on data quality
  let qualityBonus = 0;
  
  // Ingredients quality
  const ingredients = data.ingredients || data.ingredientStatement;
  if (ingredients) {
    if (typeof ingredients === 'string' && ingredients.length > 50) {
      qualityBonus += 10;
    } else if (typeof ingredients === 'string' && ingredients.length > 20) {
      qualityBonus += 5;
    }
  }
  
  // Image availability
  if (data.image_url || data.productImage?.url || data.imageUrl) {
    qualityBonus += 5;
  }
  
  // Nutrition data completeness
  const nutrition = data.nutrition || data.nutritionalInformation;
  if (nutrition) {
    const nutritionFields = Object.keys(nutrition).length;
    if (nutritionFields >= 5) {
      qualityBonus += 5;
    } else if (nutritionFields >= 3) {
      qualityBonus += 2;
    }
  }
  
  // Allergen information
  if (data.allergens || data.allergenInformation) {
    qualityBonus += 3;
  }
  
  return Math.min(100, baseConfidence + qualityBonus);
}

/**
 * Merges product data from multiple sources intelligently
 * Priority: GS1 Trade Exact > Chain APIs > Open Food Facts
 */
function mergeProductData(sources: Array<{ product: NormalizedProduct; source: SourceInfo }>): { product: NormalizedProduct; sources_used: SourceInfo[] } {
  if (sources.length === 0) {
    throw new Error('No sources to merge');
  }
  
  // Sort by priority/confidence
  const sorted = [...sources].sort((a, b) => {
    const priority = (source: string) => {
      if (source === 'gs1-trade-exact') return 100;
      if (source === 'sallinggroup' || source === 'rema1000' || source === 'coop') return 90;
      if (source === 'openfoodfacts') return 70;
      return 50;
    };
    
    const aPriority = priority(a.product.source);
    const bPriority = priority(b.product.source);
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return b.product.source_confidence - a.product.source_confidence;
  });
  
  const base = sorted[0].product;
  const merged: NormalizedProduct = { ...base };
  const sources_used: SourceInfo[] = [sorted[0].source];
  
  // Merge fields from other sources (fill gaps intelligently)
  for (let i = 1; i < sorted.length; i++) {
    const other = sorted[i].product;
    
    // Only fill in missing fields (prioritize base source)
    if (!merged.brand && other.brand) merged.brand = other.brand;
    if (!merged.title && other.title) merged.title = other.title;
    if (!merged.quantity && other.quantity) merged.quantity = other.quantity;
    if (!merged.unit && other.unit) merged.unit = other.unit;
    if (!merged.category && other.category) merged.category = other.category;
    
    // Ingredients: prefer longer/more complete
    if (!merged.ingredients && other.ingredients) {
      merged.ingredients = other.ingredients;
    } else if (merged.ingredients && other.ingredients && other.ingredients.length > merged.ingredients.length) {
      merged.ingredients = other.ingredients;
    }
    
    // Image: prefer higher quality source
    if (!merged.image_url && other.image_url) {
      merged.image_url = other.image_url;
    }
    
    // Merge allergens (union - combine all)
    if (other.allergens) {
      const allergenSet = new Set(merged.allergens || []);
      other.allergens.forEach(a => allergenSet.add(a));
      merged.allergens = Array.from(allergenSet);
    }
    
    // Merge traces (union - combine all)
    if (other.traces) {
      const traceSet = new Set(merged.traces || []);
      other.traces.forEach(t => traceSet.add(t));
      merged.traces = Array.from(traceSet);
    }
    
    // Merge nutrition (prefer more complete)
    if (!merged.nutrition && other.nutrition) {
      merged.nutrition = other.nutrition;
    } else if (merged.nutrition && other.nutrition) {
      // Merge nutrition fields, prefer base but fill gaps
      merged.nutrition = {
        ...merged.nutrition,
        ...Object.fromEntries(
          Object.entries(other.nutrition).filter(([key, value]) => !merged.nutrition![key as keyof NutritionData])
        ),
      };
    }
    
    sources_used.push(sorted[i].source);
  }
  
  // Recalculate source confidence based on merged data quality
  const mergedData = {
    ingredients: merged.ingredients,
    image_url: merged.image_url,
    nutrition: merged.nutrition,
    allergens: merged.allergens,
  };
  merged.source_confidence = calculateSourceConfidence(base.source, mergedData);
  merged.source = sources_used.map(s => s.name).join(' + ');
  
  return { product: merged, sources_used };
}

/**
 * Loads cached product data
 */
async function loadCache(gtin: string): Promise<CacheEntry | null> {
  try {
    const cacheData = await AsyncStorage.getItem(CACHE_KEY);
    if (!cacheData) return null;
    
    const cache = JSON.parse(cacheData);
    const entry = cache[gtin];
    
    if (!entry) return null;
    
    // Check if cache is still valid
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      return null;
    }
    
    return entry;
  } catch (error) {
    console.error('Error loading cache:', error);
    return null;
  }
}

/**
 * Saves product data to cache
 */
async function saveCache(gtin: string, entry: CacheEntry): Promise<void> {
  try {
    const cacheData = await AsyncStorage.getItem(CACHE_KEY);
    const cache = cacheData ? JSON.parse(cacheData) : {};
    cache[gtin] = entry;
    
    // Clean old entries (older than 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    Object.keys(cache).forEach(key => {
      if (cache[key].timestamp < sevenDaysAgo) {
        delete cache[key];
      }
    });
    
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

/**
 * Stores unknown GTIN for later enrichment
 */
async function storeUnknownGTIN(gtin: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(UNKNOWN_GTINS_KEY);
    const unknownGTINs = data ? JSON.parse(data) : [];
    
    const exists = unknownGTINs.some((entry: any) => entry.gtin === gtin);
    if (!exists) {
      unknownGTINs.push({
        gtin,
        timestamp: Date.now(),
      });
      
      await AsyncStorage.setItem(UNKNOWN_GTINS_KEY, JSON.stringify(unknownGTINs));
    }
  } catch (error) {
    console.error('Error storing unknown GTIN:', error);
  }
}

/**
 * Converts NormalizedProduct to Open Food Facts OffProduct format for backward compatibility
 */
export function normalizeToOffProduct(normalized: NormalizedProduct): {
  product_name?: string;
  brands?: string;
  image_url?: string;
  ingredients_text?: string;
  ingredients_text_da?: string;
  ingredients_text_en?: string;
  allergens?: string;
  allergens_tags?: string[];
  traces?: string;
  traces_tags?: string[];
  countries_tags?: string[];
} {
  // Split allergens into tags format (OFF uses en:allergen-name format)
  const allergens_tags = normalized.allergens
    ? normalized.allergens.map(a => `en:${a.toLowerCase().replace(/\s+/g, '-')}`)
    : undefined;
  
  const traces_tags = normalized.traces
    ? normalized.traces.map(t => `en:${t.toLowerCase().replace(/\s+/g, '-')}`)
    : undefined;
  
  // Assume Danish if locale indicates Denmark
  const ingredients_text_da = normalized.ingredients;
  const ingredients_text_en = normalized.ingredients;
  
  return {
    product_name: normalized.title,
    brands: normalized.brand,
    image_url: normalized.image_url,
    ingredients_text: normalized.ingredients,
    ingredients_text_da,
    ingredients_text_en,
    allergens: normalized.allergens?.join(', '),
    allergens_tags,
    traces: normalized.traces?.join(', '),
    traces_tags,
    countries_tags: ['en:denmark'], // Default to Denmark
  };
}

/**
 * Main product lookup function
 * 
 * @param gtin - GTIN/EAN code (8, 12, 13, or 14 digits)
 * @param config - Configuration with API keys
 * @param ocrInput - Optional OCR input for fallback search
 * @returns Product lookup result with normalized product data
 */
export async function lookupProduct(
  gtin: string,
  config: ProductLookupConfig = {},
  ocrInput?: OCRInput
): Promise<ProductLookupResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Validate GTIN
  const validation = validateGTIN(gtin);
  if (!validation.valid || !validation.normalized) {
    return {
      sources_used: [],
      match_status: 'not_found',
      next_actions: ['ask_user_photo', 'store_unknown_gtin'],
      error: validation.error || 'Ugyldig GTIN',
    };
  }
  
  const normalizedGTIN = validation.normalized;
  
  // Check cache first
  const cached = await loadCache(normalizedGTIN);
  if (cached) {
    return {
      product: cached.product,
      sources_used: cached.sources_used,
      match_status: cached.match_status,
    };
  }
  
  // Try sources in priority order (parallelize where possible)
  // Priority 1: GS1 Trade Exact
  // Priority 2: Chain APIs (Salling Group, REMA 1000, Coop)
  // Priority 3: Open Food Facts (fallback)
  const sourcePromises = [
    fetchFromGS1TradeExact(normalizedGTIN, finalConfig.gs1TradeExactApiKey),
    fetchFromSallingGroup(normalizedGTIN, finalConfig.sallingGroupToken),
    fetchFromRema1000(normalizedGTIN, finalConfig.rema1000ApiKey),
    fetchFromCoop(normalizedGTIN, finalConfig.coopApiKey),
    fetchFromOpenFoodFacts(normalizedGTIN),
  ];
  
  // Also try GS1 Image API in parallel (for image only)
  const imagePromise = fetchFromGS1Image(normalizedGTIN, finalConfig.gs1ImageApiKey);
  
  const [sourceResults, imageResult] = await Promise.all([
    Promise.all(sourcePromises),
    imagePromise,
  ]);
  
  const foundSources = sourceResults.filter(r => r.product && r.source);
  
  if (foundSources.length > 0) {
    try {
      const { product, sources_used } = mergeProductData(foundSources as Array<{ product: NormalizedProduct; source: SourceInfo }>);
      
      // Enhance with GS1 Image if available
      if (imageResult.image_url && !product.image_url) {
        product.image_url = imageResult.image_url;
      }
      
      // Save to cache
      await saveCache(normalizedGTIN, {
        product,
        sources_used,
        match_status: 'exact_ean',
        timestamp: Date.now(),
      });
      
      return {
        product,
        sources_used,
        match_status: 'exact_ean',
      };
    } catch (error) {
      console.error('Error merging product data:', error);
      // Fall through to not_found
    }
  }
  
  // No EAN match found - try OCR/text search if available
  if (ocrInput && (ocrInput.text || ocrInput.name || ocrInput.brand)) {
    // TODO: Implement fuzzy text search in sources that support it
    // For now, return not_found
  }
  
  // No match found
  await storeUnknownGTIN(normalizedGTIN);
  
  return {
    sources_used: [],
    match_status: 'not_found',
    next_actions: ['ask_user_photo', 'ask_user_name', 'store_unknown_gtin'],
  };
}
