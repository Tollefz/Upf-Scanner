/**
 * Usage Examples for Product Lookup
 * 
 * Eksempler på hvordan lookupProduct brukes i appen
 */

import { lookupProduct } from './product-lookup';
import { validateGTIN } from './gtin';
import type { LookupResult } from '../models/Product';

/**
 * Eksempel 1: Enkel produktoppslag
 */
export async function example1_SimpleLookup() {
  const result = await lookupProduct('3017620422003');
  
  if (result.status === 'exact_ean' && result.product) {
    console.log('Product found:', result.product.title);
    console.log('Brand:', result.product.brand);
    console.log('Source confidence:', result.product.sourceConfidence);
    console.log('Sources:', result.sourcesUsed.map(s => s.name));
  } else {
    console.log('Product not found');
  }
  
  return result;
}

/**
 * Eksempel 2: Håndtering av ulike resultater
 */
export async function example2_HandleResults() {
  const result = await lookupProduct('3017620422003');
  
  switch (result.status) {
    case 'exact_ean':
      if (result.product) {
        // Produkt funnet - vis informasjon
        return {
          success: true,
          product: result.product,
          sources: result.sourcesUsed,
        };
      }
      break;
      
    case 'probable':
      // Sannsynlig match (fra OCR/text search)
      // TODO: Implementer når OCR-støtte legges til
      return {
        success: false,
        message: 'Probable match - needs verification',
      };
      
    case 'not_found':
      // Produkt ikke funnet
      return {
        success: false,
        message: 'Product not found',
        nextActions: result.nextActions,
      };
  }
}

/**
 * Eksempel 3: Valider GTIN før oppslag
 */
export async function example3_ValidateThenLookup(gtin: string) {
  // Valider først
  const validation = validateGTIN(gtin);
  if (!validation.ok) {
    return {
      error: validation.error,
    };
  }
  
  // Deretter gjør oppslag
  const result = await lookupProduct(validation.normalized!);
  return result;
}

/**
 * Eksempel 4: Bruk i React-komponent
 */
export function example4_ReactComponentUsage() {
  // I en React-komponent:
  /*
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleScan = async (gtin: string) => {
    setLoading(true);
    try {
      const result = await lookupProduct(gtin);
      if (result.status === 'exact_ean' && result.product) {
        setProduct(result.product);
      } else {
        // Håndter not_found
        Alert.alert('Ikke funnet', 'Produktet ble ikke funnet');
      }
    } catch (error) {
      console.error('Lookup error:', error);
    } finally {
      setLoading(false);
    }
  };
  */
}

/**
 * Eksempel 5: Sjekk cache før oppslag
 */
export async function example5_CheckCacheFirst(gtin: string) {
  // Cache sjekkes automatisk i lookupProduct
  // Men du kan også sjekke manuelt:
  const { loadCache } = await import('./cache');
  
  const cached = await loadCache(gtin);
  if (cached) {
    console.log('Using cached result');
    return cached;
  }
  
  // Hvis ikke i cache, gjør nytt oppslag
  return await lookupProduct(gtin);
}

/**
 * Eksempel 6: Logg ukjente GTIN-er
 */
export async function example6_LogUnknownGTINs() {
  const { getUnknownGTINs } = await import('./cache');
  
  // Hent alle ukjente GTIN-er
  const unknown = await getUnknownGTINs();
  console.log(`Found ${unknown.length} unknown GTINs`);
  
  // TODO: Send til backend for beriking
  // await sendToBackend(unknown);
}

