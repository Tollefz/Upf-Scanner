/**
 * Product Lookup Service
 * 
 * Binder sammen cache og Open Food Facts API.
 * Implementerer lookup-rekkefølge: cache → OFF → not_found
 */

import type { Product } from '../data/Product';
import { getProductByGtin, upsertProduct, markNotFound } from '../data/productRepo';
import { fetchProductByGtin } from '../integrations/openFoodFacts';

// Structured logging
function logLookupEvent(event: string, details?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const detailStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[LOOKUP] ${timestamp} ${event}${detailStr}`);
}

export type LookupOutcome =
  | { kind: 'product'; product: Product }
  | { kind: 'not_found'; gtin: string };

/**
 * Lookup product by GTIN
 * 
 * Algorithm:
 * 1. Check cache → if found, return product (source=cache)
 * 2. Else call OFF → if found:
 *    - upsertProduct(product) (source=openfoodfacts)
 *    - return product
 * 3. Else return not_found
 * 
 * @param gtin - GTIN/EAN code
 * @param signal - AbortSignal for cancellation
 * @returns LookupOutcome
 */
export async function lookupProductByGtin(
  gtin: string,
  signal: AbortSignal
): Promise<LookupOutcome> {
  logLookupEvent('LOOKUP_START', { gtin });

  const startTime = Date.now();

  try {
    // Step 1: Check cache
    logLookupEvent('LOOKUP_CACHE_CHECK', { gtin });
    const cached = await getProductByGtin(gtin);

    if (cached) {
      const latency = Date.now() - startTime;
      logLookupEvent('LOOKUP_CACHE_HIT', { gtin, latency, source: cached.source });
      return { kind: 'product', product: cached };
    }

    logLookupEvent('LOOKUP_CACHE_MISS', { gtin });

    // Step 2: Fetch from Open Food Facts
    const product = await fetchProductByGtin(gtin, signal);

    if (product) {
      // Step 3: Save to cache
      await upsertProduct(product);
      logLookupEvent('LOOKUP_CACHE_SAVED', { gtin });

      const latency = Date.now() - startTime;
      logLookupEvent('LOOKUP_SUCCESS', { gtin, latency, source: 'openfoodfacts' });

      return { kind: 'product', product };
    }

    // Step 4: Not found
    await markNotFound(gtin);
    const latency = Date.now() - startTime;
    logLookupEvent('LOOKUP_NOT_FOUND', { gtin, latency });

    return { kind: 'not_found', gtin };
  } catch (error: any) {
    const latency = Date.now() - startTime;

    if (error.name === 'AbortError') {
      logLookupEvent('LOOKUP_ABORTED', { gtin, latency });
      throw error; // Re-throw abort errors
    }

    logLookupEvent('LOOKUP_ERROR', { gtin, error: error.message, latency });
    throw error;
  }
}

