/**
 * Product Lookup - Main API
 * 
 * Pipeline-rekkefølge: GS1 > Salling > Open Food Facts
 * 
 * Usage:
 * ```ts
 * import { lookupProduct } from './utils/product-lookup';
 * 
 * const result = await lookupProduct('3017620422003');
 * if (result.status === 'exact_ean' && result.product) {
 *   console.log('Product:', result.product.title);
 *   console.log('Sources:', result.sourcesUsed);
 * }
 * ```
 */

import { validateGTIN } from './gtin';
import { loadCache, saveCache, logUnknownGTIN } from './cache';
import { fetchFromGS1, fetchGS1Image } from './sources/gs1';
import { fetchFromSalling } from './sources/salling';
import { fetchFromOpenFoodFacts } from './sources/openFoodFacts';
import type { Product, LookupResult, LookupOptions, SourceUsed } from '../models/Product';

/**
 * Calculates source confidence (0-100) based on source type and data quality
 */
function calculateSourceConfidence(
  sourceName: string,
  product: Product
): number {
  let baseConfidence = 50;
  
  // Base confidence by source
  switch (sourceName) {
    case 'gs1-trade-exact':
      baseConfidence = 95; // GS1 is authoritative
      break;
    case 'salling-group':
      baseConfidence = 85; // Official chain API
      break;
    case 'openfoodfacts':
      baseConfidence = 70; // Community-driven
      break;
    default:
      baseConfidence = 50;
  }
  
  // Adjust based on data quality
  let qualityBonus = 0;
  
  if (product.ingredientsText) {
    if (product.ingredientsText.length > 100) {
      qualityBonus += 10;
    } else if (product.ingredientsText.length > 50) {
      qualityBonus += 5;
    }
  }
  
  if (product.imageUrls && product.imageUrls.length > 0) {
    qualityBonus += 5;
  }
  
  if (product.nutrition && Object.keys(product.nutrition).length >= 5) {
    qualityBonus += 5;
  }
  
  if (product.allergens && product.allergens.length > 0) {
    qualityBonus += 3;
  }
  
  return Math.min(100, baseConfidence + qualityBonus);
}

/**
 * Merges product data from multiple sources with priority
 * Priority: GS1 > Salling > Open Food Facts
 */
function mergeProductData(
  results: Array<{ product: Product; source: SourceUsed }>
): { product: Product; sourcesUsed: SourceUsed[] } {
  if (results.length === 0) {
    throw new Error('No results to merge');
  }
  
  // Sort by priority
  const sorted = [...results].sort((a, b) => {
    const priority = (source: string) => {
      if (source.includes('gs1')) return 100;
      if (source.includes('salling')) return 90;
      if (source.includes('openfoodfacts')) return 70;
      return 50;
    };
    
    const aPriority = priority(a.product.source);
    const bPriority = priority(b.product.source);
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return b.product.sourceConfidence - a.product.sourceConfidence;
  });
  
  const base = sorted[0].product;
  const merged: Product = { ...base };
  const sourcesUsed: SourceUsed[] = [sorted[0].source];
  
  // Merge fields from other sources (fill gaps)
  for (let i = 1; i < sorted.length; i++) {
    const other = sorted[i].product;
    
    // Fill missing fields
    if (!merged.title && other.title) merged.title = other.title;
    if (!merged.brand && other.brand) merged.brand = other.brand;
    if (!merged.quantity && other.quantity) merged.quantity = other.quantity;
    if (!merged.unit && other.unit) merged.unit = other.unit;
    
    // Categories: merge arrays
    if (other.categories && other.categories.length > 0) {
      const categorySet = new Set(merged.categories || []);
      other.categories.forEach(cat => categorySet.add(cat));
      merged.categories = Array.from(categorySet);
    }
    
    // Ingredients: prefer longer/more complete
    if (!merged.ingredientsText && other.ingredientsText) {
      merged.ingredientsText = other.ingredientsText;
    } else if (
      merged.ingredientsText &&
      other.ingredientsText &&
      other.ingredientsText.length > merged.ingredientsText.length
    ) {
      merged.ingredientsText = other.ingredientsText;
    }
    
    // Allergens: union
    if (other.allergens && other.allergens.length > 0) {
      const allergenSet = new Set(merged.allergens || []);
      other.allergens.forEach(a => allergenSet.add(a));
      merged.allergens = Array.from(allergenSet);
    }
    
    // Traces: union
    if (other.traces && other.traces.length > 0) {
      const traceSet = new Set(merged.traces || []);
      other.traces.forEach(t => traceSet.add(t));
      merged.traces = Array.from(traceSet);
    }
    
    // Nutrition: merge fields, prefer base but fill gaps
    if (!merged.nutrition && other.nutrition) {
      merged.nutrition = other.nutrition;
    } else if (merged.nutrition && other.nutrition) {
      merged.nutrition = {
        ...merged.nutrition,
        ...Object.fromEntries(
          Object.entries(other.nutrition).filter(
            ([key, value]) => !merged.nutrition![key as keyof typeof merged.nutrition] && value !== undefined
          )
        ),
      };
    }
    
    // Image URLs: merge, prefer base
    if (other.imageUrls && other.imageUrls.length > 0) {
      const imageSet = new Set(merged.imageUrls || []);
      other.imageUrls.forEach(url => imageSet.add(url));
      merged.imageUrls = Array.from(imageSet);
    }
    
    sourcesUsed.push(sorted[i].source);
  }
  
  // Recalculate source confidence based on merged data
  merged.sourceConfidence = calculateSourceConfidence(base.source, merged);
  merged.source = sourcesUsed.map(s => s.name).join(' + ');
  
  return { product: merged, sourcesUsed };
}

/**
 * Main product lookup function
 * 
 * @param gtin - GTIN/EAN code (8, 12, 13, or 14 digits)
 * @param opts - Optional: OCR text for fallback search
 * @returns Lookup result with product data or error
 * 
 * @example
 * ```ts
 * // Basic usage
 * const result = await lookupProduct('3017620422003');
 * 
 * // With OCR text for fallback
 * const result = await lookupProduct('3017620422003', {
 *   ocrText: 'Nutella 400g'
 * });
 * ```
 */
export async function lookupProduct(
  gtin: string,
  opts?: LookupOptions
): Promise<LookupResult> {
  // Validate GTIN
  const validation = validateGTIN(gtin);
  if (!validation.ok || !validation.normalized) {
    return {
      status: 'not_found',
      sourcesUsed: [],
      nextActions: ['scan_again'],
      error: validation.error || 'Invalid GTIN',
    };
  }
  
  const normalizedGTIN = validation.normalized;
  
  // Check cache first
  const cached = await loadCache(normalizedGTIN);
  if (cached) {
    return cached;
  }
  
  // Try sources in priority order (parallelize where possible)
  // Priority: GS1 > Salling > Open Food Facts
  const sourcePromises = [
    fetchFromGS1(normalizedGTIN),
    fetchFromSalling(normalizedGTIN),
    fetchFromOpenFoodFacts(normalizedGTIN),
  ];
  
  // Also fetch GS1 image in parallel if GS1 is configured
  const imagePromise = fetchGS1Image(normalizedGTIN);
  
  const [sourceResults, gs1ImageUrl] = await Promise.all([
    Promise.all(sourcePromises),
    imagePromise,
  ]);
  
  // Filter out null results
  const validResults = sourceResults.filter(
    (r): r is { product: Product; source: SourceUsed } => r.product !== null && r.source !== null
  );
  
  if (validResults.length > 0) {
    try {
      // Enhance with GS1 image if available
      if (gs1ImageUrl && validResults.length > 0) {
        const firstResult = validResults[0];
        if (!firstResult.product.imageUrls) {
          firstResult.product.imageUrls = [];
        }
        if (!firstResult.product.imageUrls.includes(gs1ImageUrl)) {
          firstResult.product.imageUrls.unshift(gs1ImageUrl); // Add to front
        }
      }
      
      const { product, sourcesUsed } = mergeProductData(validResults);
      
      const result: LookupResult = {
        status: 'exact_ean',
        product,
        sourcesUsed,
      };
      
      // Save to cache
      await saveCache(normalizedGTIN, result);
      
      return result;
    } catch (error) {
      console.error('Error merging product data:', error);
      // Fall through to not_found
    }
  }
  
  // No EAN match found - try OCR/text search if available
  if (opts?.ocrText) {
    // TODO: Implement fuzzy text search in sources that support it
    // For now, return not_found
  }
  
  // No match found
  await logUnknownGTIN(normalizedGTIN);
  
  return {
    status: 'not_found',
    sourcesUsed: [],
    nextActions: ['scan_again', 'manual_entry'],
  };
}

