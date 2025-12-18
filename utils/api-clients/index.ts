/**
 * API Clients Index
 * 
 * Central export point for all product API clients
 */

export * from './base';
export * from './config';
export * from './types';

// API Clients
export { GS1TradeExactClient } from './gs1-trade-exact';
export { GS1ImageClient } from './gs1-image';
export { SallingGroupClient } from './salling-group';
export { REMA1000Client } from './rema1000';
export { CoopClient } from './coop';
export { OpenFoodFactsClient } from './open-food-facts';

// Factory function to create all enabled clients
import { getAPICredentials, getFeatureFlags, validateConfig } from './config';
import { GS1TradeExactClient } from './gs1-trade-exact';
import { GS1ImageClient } from './gs1-image';
import { SallingGroupClient } from './salling-group';
import { REMA1000Client } from './rema1000';
import { CoopClient } from './coop';
import { OpenFoodFactsClient } from './open-food-facts';
import type { ProductAPIClient } from './types';
import type { APIClientConfig } from './base';

export interface ClientFactoryOptions {
  config?: APIClientConfig;
  skipValidation?: boolean;
}

/**
 * Creates all enabled API clients based on feature flags and credentials
 */
export function createEnabledClients(options: ClientFactoryOptions = {}): {
  clients: ProductAPIClient[];
  imageClient?: GS1ImageClient;
  validationErrors: string[];
} {
  const flags = getFeatureFlags();
  const credentials = getAPICredentials();
  const { config = {}, skipValidation = false } = options;

  const clients: ProductAPIClient[] = [];
  const validationErrors: string[] = [];
  let imageClient: GS1ImageClient | undefined;

  // Validate configuration (unless skipped)
  if (!skipValidation) {
    const validation = validateConfig(flags, credentials);
    if (!validation.valid) {
      validationErrors.push(...validation.errors);
      console.warn('API configuration validation failed:', validation.errors);
    }
  }

  // GS1 Trade Exact
  if (flags.gs1TradeExact && credentials.gs1TradeExactApiKey) {
    try {
      clients.push(new GS1TradeExactClient(credentials.gs1TradeExactApiKey, config));
    } catch (error: any) {
      validationErrors.push(`Failed to create GS1 Trade Exact client: ${error.message}`);
    }
  }

  // GS1 Image (separate client, not a ProductAPIClient)
  if (flags.gs1Image && credentials.gs1ImageApiKey) {
    try {
      imageClient = new GS1ImageClient(credentials.gs1ImageApiKey, config);
    } catch (error: any) {
      validationErrors.push(`Failed to create GS1 Image client: ${error.message}`);
    }
  }

  // Salling Group
  if (flags.sallingGroup && credentials.sallingGroupToken) {
    try {
      clients.push(new SallingGroupClient(credentials.sallingGroupToken, config));
    } catch (error: any) {
      validationErrors.push(`Failed to create Salling Group client: ${error.message}`);
    }
  }

  // REMA 1000
  if (flags.rema1000 && credentials.rema1000ApiKey) {
    try {
      clients.push(new REMA1000Client(credentials.rema1000ApiKey, config));
    } catch (error: any) {
      validationErrors.push(`Failed to create REMA 1000 client: ${error.message}`);
    }
  }

  // Coop
  if (flags.coop && credentials.coopApiKey) {
    try {
      clients.push(new CoopClient(credentials.coopApiKey, config));
    } catch (error: any) {
      validationErrors.push(`Failed to create Coop client: ${error.message}`);
    }
  }

  // Open Food Facts (always enabled)
  if (flags.openFoodFacts) {
    clients.push(new OpenFoodFactsClient(config));
  }

  return { clients, imageClient, validationErrors };
}

