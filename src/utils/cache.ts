/**
 * Product Lookup Cache
 * 
 * Caches product lookup results in AsyncStorage with 24 hour TTL
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LookupResult } from '../models/Product';

const CACHE_KEY = 'product_lookup_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const UNKNOWN_GTINS_KEY = 'unknown_gtins';

interface CacheEntry {
  result: LookupResult;
  timestamp: number;
}

/**
 * Loads cached product lookup result
 */
export async function loadCache(gtin: string): Promise<LookupResult | null> {
  try {
    const cacheData = await AsyncStorage.getItem(CACHE_KEY);
    if (!cacheData) return null;
    
    const cache = JSON.parse(cacheData) as Record<string, CacheEntry>;
    const entry = cache[gtin];
    
    if (!entry) return null;
    
    // Check if cache is still valid
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      return null;
    }
    
    return entry.result;
  } catch (error) {
    console.error('Error loading cache:', error);
    return null;
  }
}

/**
 * Saves product lookup result to cache
 */
export async function saveCache(gtin: string, result: LookupResult): Promise<void> {
  try {
    const cacheData = await AsyncStorage.getItem(CACHE_KEY);
    const cache = cacheData ? (JSON.parse(cacheData) as Record<string, CacheEntry>) : {};
    cache[gtin] = {
      result,
      timestamp: Date.now(),
    };
    
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
 * TODO: Send to backend API instead of local storage
 */
export async function logUnknownGTIN(gtin: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(UNKNOWN_GTINS_KEY);
    const unknownGTINs = data ? (JSON.parse(data) as Array<{ gtin: string; timestamp: number }>) : [];
    
    const exists = unknownGTINs.some(entry => entry.gtin === gtin);
    if (!exists) {
      unknownGTINs.push({
        gtin,
        timestamp: Date.now(),
      });
      
      // Keep only last 1000 unknown GTINs
      const trimmed = unknownGTINs.slice(-1000);
      
      await AsyncStorage.setItem(UNKNOWN_GTINS_KEY, JSON.stringify(trimmed));
      
      // TODO: Send to backend API for enrichment
      console.log(`[TODO] Log unknown GTIN to backend: ${gtin}`);
    }
  } catch (error) {
    console.error('Error logging unknown GTIN:', error);
  }
}

/**
 * Gets list of unknown GTINs (for debugging/enrichment)
 */
export async function getUnknownGTINs(): Promise<Array<{ gtin: string; timestamp: number }>> {
  try {
    const data = await AsyncStorage.getItem(UNKNOWN_GTINS_KEY);
    return data ? (JSON.parse(data) as Array<{ gtin: string; timestamp: number }>) : [];
  } catch (error) {
    console.error('Error getting unknown GTINs:', error);
    return [];
  }
}

