/**
 * Product Lookup Utilities - Main Export
 * 
 * Export main lookup function and types for easy import
 */

export { lookupProduct } from './product-lookup';
export { validateGTIN, detectGTINType } from './gtin';
export { loadCache, saveCache, logUnknownGTIN, getUnknownGTINs } from './cache';
export type { GTINValidationResult } from './gtin';
export type { Product, LookupResult, LookupOptions, SourceUsed, NutritionData } from '../models/Product';

