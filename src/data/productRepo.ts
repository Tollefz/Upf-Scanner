/**
 * Product Repository
 * 
 * Repository-lag for produktlagring med AsyncStorage.
 * Designet for enkel migrering til SQLite senere.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from './Product';

const PRODUCTS_KEY = 'products_cache';
const NOT_FOUND_KEY = 'products_not_found';

/**
 * Get product by GTIN from cache
 */
export async function getProductByGtin(gtin: string): Promise<Product | null> {
  try {
    const data = await AsyncStorage.getItem(PRODUCTS_KEY);
    if (!data) return null;

    const products: Record<string, Product> = JSON.parse(data);
    const product = products[gtin];

    if (!product) return null;

    // Check if cache is stale (older than 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (product.updatedAt < sevenDaysAgo) {
      // Cache is stale, but return it anyway (can be refreshed)
      return product;
    }

    return product;
  } catch (error) {
    console.error('[ProductRepo] Error getting product:', error);
    return null;
  }
}

/**
 * Upsert product to cache
 */
export async function upsertProduct(product: Product): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(PRODUCTS_KEY);
    const products: Record<string, Product> = data ? JSON.parse(data) : {};

    // Update product with current timestamp
    products[product.gtin] = {
      ...product,
      updatedAt: Date.now(),
    };

    // Clean old entries (older than 30 days) to prevent storage bloat
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    Object.keys(products).forEach(gtin => {
      if (products[gtin].updatedAt < thirtyDaysAgo) {
        delete products[gtin];
      }
    });

    await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch (error) {
    console.error('[ProductRepo] Error upserting product:', error);
  }
}

/**
 * Mark GTIN as not found (optional - for tracking)
 */
export async function markNotFound(gtin: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(NOT_FOUND_KEY);
    const notFound: Record<string, number> = data ? JSON.parse(data) : {};

    notFound[gtin] = Date.now();

    // Clean old entries (older than 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    Object.keys(notFound).forEach(key => {
      if (notFound[key] < sevenDaysAgo) {
        delete notFound[key];
      }
    });

    await AsyncStorage.setItem(NOT_FOUND_KEY, JSON.stringify(notFound));
  } catch (error) {
    console.error('[ProductRepo] Error marking not found:', error);
  }
}

/**
 * Get recent scans (for history feature later)
 */
export async function getRecentScans(limit: number = 50): Promise<Product[]> {
  try {
    const data = await AsyncStorage.getItem(PRODUCTS_KEY);
    if (!data) return [];

    const products: Record<string, Product> = JSON.parse(data);
    const productArray = Object.values(products);

    // Sort by updatedAt (most recent first)
    productArray.sort((a, b) => b.updatedAt - a.updatedAt);

    return productArray.slice(0, limit);
  } catch (error) {
    console.error('[ProductRepo] Error getting recent scans:', error);
    return [];
  }
}

/**
 * Check if GTIN was recently marked as not found
 */
export async function wasRecentlyNotFound(gtin: string): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(NOT_FOUND_KEY);
    if (!data) return false;

    const notFound: Record<string, number> = JSON.parse(data);
    return gtin in notFound;
  } catch (error) {
    return false;
  }
}

