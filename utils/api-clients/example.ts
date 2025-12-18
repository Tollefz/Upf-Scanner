/**
 * API Clients Usage Examples
 * 
 * Dette filen viser eksempler på hvordan API-klientene brukes
 * IKKE bruk denne filen i produksjon - det er kun eksempler
 */

import { 
  createEnabledClients, 
  GS1TradeExactClient,
  SallingGroupClient,
  OpenFoodFactsClient,
} from './index';
import { getAPICredentials, getFeatureFlags } from './config';
import type { RawProductData } from './types';

/**
 * Eksempel 1: Bruk alle aktiverte klienter med feature flags
 */
export async function example1_UseAllEnabledClients(gtin: string) {
  // Opprett alle klienter basert på feature flags og credentials
  const { clients, imageClient, validationErrors } = createEnabledClients({
    config: {
      timeout: 10000,
      retries: 2,
      retryDelay: 500,
    },
  });

  // Sjekk for valideringsfeil
  if (validationErrors.length > 0) {
    console.warn('API configuration warnings:', validationErrors);
  }

  console.log(`Trying ${clients.length} sources for GTIN: ${gtin}`);

  // Prøv alle kilder parallelt
  const results = await Promise.allSettled(
    clients.map(async (client) => {
      try {
        const product = await client.fetchProductByGTIN(gtin);
        return { client: client.getSourceName(), product };
      } catch (error: any) {
        console.error(`Error from ${client.getSourceName()}:`, error.message);
        return { client: client.getSourceName(), product: null };
      }
    })
  );

  // Filtrer bort feilede resultater
  const validResults = results
    .filter((r): r is PromiseFulfilledResult<{ client: string; product: RawProductData | null }> => 
      r.status === 'fulfilled' && r.value.product !== null
    )
    .map(r => r.value);

  console.log(`Found ${validResults.length} valid results`);

  // Hent bilde fra GS1 Image hvis tilgjengelig
  let imageUrl: string | null = null;
  if (imageClient) {
    imageUrl = await imageClient.fetchImageURL(gtin);
    if (imageUrl) {
      console.log('Image URL from GS1 Image:', imageUrl);
    }
  }

  return { validResults, imageUrl };
}

/**
 * Eksempel 2: Bruk en spesifikk klient direkte
 */
export async function example2_UseSpecificClient(gtin: string) {
  const credentials = getAPICredentials();

  // Bruk GS1 Trade Exact hvis tilgjengelig
  if (credentials.gs1TradeExactApiKey) {
    const client = new GS1TradeExactClient(credentials.gs1TradeExactApiKey, {
      timeout: 15000,
      retries: 3,
    });

    const product = await client.fetchProductByGTIN(gtin);

    if (product) {
      console.log('Product from GS1 Trade Exact:');
      console.log('  Title:', product.title);
      console.log('  Brand:', product.brand);
      console.log('  Ingredients:', product.ingredients?.substring(0, 100) + '...');
      return product;
    }
  }

  return null;
}

/**
 * Eksempel 3: Slå sammen data fra flere kilder intelligent
 */
export async function example3_MergeDataFromMultipleSources(gtin: string) {
  const { clients } = createEnabledClients();

  // Hent fra alle kilder
  const results = await Promise.allSettled(
    clients.map(client => client.fetchProductByGTIN(gtin))
  );

  // Prioriteringsrekkefølge (høyere tall = høyere prioritet)
  const sourcePriority: Record<string, number> = {
    'GS1 Trade Exact': 100,
    'Salling Group': 90,
    'REMA 1000': 85,
    'Coop': 85,
    'Open Food Facts': 70,
  };

  // Sorter resultater etter prioritet
  const sortedResults = results
    .map((result, index) => ({
      result,
      priority: sourcePriority[clients[index].getSourceName()] || 50,
      sourceName: clients[index].getSourceName(),
    }))
    .filter(item => item.result.status === 'fulfilled' && item.result.value !== null)
    .sort((a, b) => b.priority - a.priority)
    .map(item => ({
      product: (item.result as PromiseFulfilledResult<RawProductData>).value,
      sourceName: item.sourceName,
    }));

  if (sortedResults.length === 0) {
    return null;
  }

  // Slå sammen data (prioriter høyere prioritetskilder)
  const merged: RawProductData = {
    gtin,
  };

  for (const { product, sourceName } of sortedResults) {
    console.log(`Merging data from: ${sourceName}`);

    // Fyll manglende felter (prioriteter allerede sortert)
    if (!merged.brand && product.brand) merged.brand = product.brand;
    if (!merged.title && product.title) merged.title = product.title;
    if (!merged.quantity && product.quantity) merged.quantity = product.quantity;
    if (!merged.unit && product.unit) merged.unit = product.unit;
    if (!merged.category && product.category) merged.category = product.category;

    // Ingredients: prefer longer/more complete
    if (!merged.ingredients && product.ingredients) {
      merged.ingredients = product.ingredients;
    } else if (
      merged.ingredients &&
      product.ingredients &&
      product.ingredients.length > merged.ingredients.length
    ) {
      merged.ingredients = product.ingredients;
    }

    // Image: prefer higher quality source
    if (!merged.image_url && product.image_url) {
      merged.image_url = product.image_url;
    }

    // Allergens: union (combine all)
    if (product.allergens) {
      const allergenSet = new Set(merged.allergens || []);
      product.allergens.forEach(a => allergenSet.add(a));
      merged.allergens = Array.from(allergenSet);
    }

    // Traces: union (combine all)
    if (product.traces) {
      const traceSet = new Set(merged.traces || []);
      product.traces.forEach(t => traceSet.add(t));
      merged.traces = Array.from(traceSet);
    }

    // Nutrition: merge fields, prefer base but fill gaps
    if (!merged.nutrition && product.nutrition) {
      merged.nutrition = product.nutrition;
    } else if (merged.nutrition && product.nutrition) {
      merged.nutrition = {
        ...merged.nutrition,
        ...Object.fromEntries(
          Object.entries(product.nutrition).filter(
            ([key, value]) => !merged.nutrition![key as keyof typeof merged.nutrition] && value !== undefined
          )
        ),
      };
    }
  }

  console.log('Merged product data:', {
    title: merged.title,
    brand: merged.brand,
    hasIngredients: !!merged.ingredients,
    allergenCount: merged.allergens?.length || 0,
    hasNutrition: !!merged.nutrition,
    hasImage: !!merged.image_url,
  });

  return merged;
}

/**
 * Eksempel 4: Trinnvis aktivering av kilder
 */
export function example4_GradualSourceActivation() {
  const flags = getFeatureFlags();
  const credentials = getAPICredentials();

  console.log('Active sources:');
  
  if (flags.openFoodFacts) {
    console.log('  ✅ Open Food Facts (always enabled)');
  }

  if (flags.sallingGroup && credentials.sallingGroupToken) {
    console.log('  ✅ Salling Group (enabled and configured)');
  } else if (flags.sallingGroup) {
    console.log('  ⚠️  Salling Group (enabled but missing credentials)');
  } else {
    console.log('  ❌ Salling Group (disabled)');
  }

  if (flags.gs1TradeExact && credentials.gs1TradeExactApiKey) {
    console.log('  ✅ GS1 Trade Exact (enabled and configured)');
  } else if (flags.gs1TradeExact) {
    console.log('  ⚠️  GS1 Trade Exact (enabled but missing credentials)');
  } else {
    console.log('  ❌ GS1 Trade Exact (disabled)');
  }

  if (flags.rema1000 && credentials.rema1000ApiKey) {
    console.log('  ✅ REMA 1000 (enabled and configured)');
  } else {
    console.log('  ❌ REMA 1000 (disabled or not configured)');
  }

  if (flags.coop && credentials.coopApiKey) {
    console.log('  ✅ Coop (enabled and configured)');
  } else {
    console.log('  ❌ Coop (disabled or not configured)');
  }
}

/**
 * Eksempel 5: Feilhåndtering og fallback
 */
export async function example5_ErrorHandlingWithFallback(gtin: string) {
  const { clients } = createEnabledClients();

  // Prøv kilder i prioritert rekkefølge med fallback
  for (const client of clients) {
    try {
      console.log(`Trying ${client.getSourceName()}...`);
      const product = await client.fetchProductByGTIN(gtin);
      
      if (product) {
        console.log(`✅ Found in ${client.getSourceName()}`);
        return product;
      }
    } catch (error: any) {
      console.warn(`⚠️  ${client.getSourceName()} failed:`, error.message);
      // Fortsett til neste kilde
      continue;
    }
  }

  console.log('❌ Product not found in any source');
  return null;
}

