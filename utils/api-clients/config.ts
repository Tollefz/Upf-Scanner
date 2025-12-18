/**
 * API Client Configuration
 * 
 * Feature flags and environment variable management for product lookup sources
 */

import Constants from 'expo-constants';

// Feature flags - enable/disable sources
export interface SourceFeatureFlags {
  gs1TradeExact: boolean;
  gs1Image: boolean;
  sallingGroup: boolean;
  rema1000: boolean;
  coop: boolean;
  openFoodFacts: boolean; // Always enabled as fallback
}

// API credentials from environment variables
export interface APICredentials {
  gs1TradeExactApiKey?: string;
  gs1ImageApiKey?: string;
  sallingGroupToken?: string;
  rema1000ApiKey?: string;
  coopApiKey?: string;
}

// Default feature flags (all disabled except Open Food Facts)
export const DEFAULT_FEATURE_FLAGS: SourceFeatureFlags = {
  gs1TradeExact: false,
  gs1Image: false,
  sallingGroup: false,
  rema1000: false,
  coop: false,
  openFoodFacts: true, // Always enabled
};

/**
 * Loads API credentials from environment variables
 * 
 * Setup in app.json or environment:
 * extra: {
 *   gs1TradeExactApiKey: process.env.GS1_TRADE_EXACT_API_KEY,
 *   gs1ImageApiKey: process.env.GS1_IMAGE_API_KEY,
 *   sallingGroupToken: process.env.SALLING_GROUP_TOKEN,
 *   rema1000ApiKey: process.env.REMA_1000_API_KEY,
 *   coopApiKey: process.env.COOP_API_KEY,
 * }
 */
export function getAPICredentials(): APICredentials {
  const extra = Constants.expoConfig?.extra || {};
  
  return {
    gs1TradeExactApiKey: extra.gs1TradeExactApiKey || process.env.EXPO_PUBLIC_GS1_TRADE_EXACT_API_KEY,
    gs1ImageApiKey: extra.gs1ImageApiKey || process.env.EXPO_PUBLIC_GS1_IMAGE_API_KEY,
    sallingGroupToken: extra.sallingGroupToken || process.env.EXPO_PUBLIC_SALLING_GROUP_TOKEN,
    rema1000ApiKey: extra.rema1000ApiKey || process.env.EXPO_PUBLIC_REMA_1000_API_KEY,
    coopApiKey: extra.coopApiKey || process.env.EXPO_PUBLIC_COOP_API_KEY,
  };
}

/**
 * Loads feature flags from environment variables or uses defaults
 * 
 * Enable sources by setting environment variables:
 * EXPO_PUBLIC_ENABLE_GS1_TRADE_EXACT=true
 * EXPO_PUBLIC_ENABLE_SALLING_GROUP=true
 * etc.
 */
export function getFeatureFlags(): SourceFeatureFlags {
  const extra = Constants.expoConfig?.extra || {};
  const env = process.env;
  
  return {
    gs1TradeExact: extra.enableGs1TradeExact === true || env.EXPO_PUBLIC_ENABLE_GS1_TRADE_EXACT === 'true',
    gs1Image: extra.enableGs1Image === true || env.EXPO_PUBLIC_ENABLE_GS1_IMAGE === 'true',
    sallingGroup: extra.enableSallingGroup === true || env.EXPO_PUBLIC_ENABLE_SALLING_GROUP === 'true',
    rema1000: extra.enableRema1000 === true || env.EXPO_PUBLIC_ENABLE_REMA_1000 === 'true',
    coop: extra.enableCoop === true || env.EXPO_PUBLIC_ENABLE_COOP === 'true',
    openFoodFacts: true, // Always enabled
  };
}

/**
 * Validates that required credentials are present for enabled sources
 */
export function validateConfig(flags: SourceFeatureFlags, credentials: APICredentials): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (flags.gs1TradeExact && !credentials.gs1TradeExactApiKey) {
    errors.push('GS1 Trade Exact is enabled but API key is missing');
  }
  
  if (flags.gs1Image && !credentials.gs1ImageApiKey) {
    errors.push('GS1 Image is enabled but API key is missing');
  }
  
  if (flags.sallingGroup && !credentials.sallingGroupToken) {
    errors.push('Salling Group is enabled but token is missing');
  }
  
  if (flags.rema1000 && !credentials.rema1000ApiKey) {
    errors.push('REMA 1000 is enabled but API key is missing');
  }
  
  if (flags.coop && !credentials.coopApiKey) {
    errors.push('Coop is enabled but API key is missing');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

