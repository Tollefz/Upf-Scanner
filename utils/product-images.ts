/**
 * Product Image Utilities
 * 
 * Håndterer prioritert bilde-seleksjon og normalisering fra ulike kilder
 */

export interface ProductImageSource {
  url: string;
  source: 'gs1-image' | 'gs1-trade-exact' | 'salling-group' | 'rema1000' | 'coop' | 'openfoodfacts';
  type?: 'front' | 'back' | 'ingredients' | 'nutrition' | 'other';
  priority?: number; // Higher = more priority
}

/**
 * Prioritert rekkefølge for bildekilder:
 * 1. GS1 Image API (høyest kvalitet)
 * 2. GS1 Trade Exact
 * 3. Kjeder (Salling Group, REMA 1000, Coop)
 * 4. Open Food Facts
 */
const SOURCE_PRIORITY: Record<string, number> = {
  'gs1-image': 100,
  'gs1-trade-exact': 90,
  'salling-group': 85,
  'rema1000': 85,
  'coop': 85,
  'openfoodfacts': 70,
};

const TYPE_PRIORITY: Record<string, number> = {
  'front': 100,
  'ingredients': 80,
  'nutrition': 70,
  'back': 60,
  'other': 50,
};

/**
 * Prioriterer bilder basert på kilde og type
 * Returnerer bildet med høyest prioritet
 */
export function selectBestImage(images: ProductImageSource[]): string | null {
  if (images.length === 0) {
    return null;
  }

  // Sorter etter prioritet (høyest først)
  const sorted = [...images].sort((a, b) => {
    const aPriority = a.priority ?? 
      (SOURCE_PRIORITY[a.source] || 50) + 
      (a.type ? TYPE_PRIORITY[a.type] || 0 : 0);
    
    const bPriority = b.priority ?? 
      (SOURCE_PRIORITY[b.source] || 50) + 
      (b.type ? TYPE_PRIORITY[b.type] || 0 : 0);

    return bPriority - aPriority;
  });

  return sorted[0].url;
}

/**
 * Normaliserer bilde-URLer fra ulike kilder til ProductImageSource array
 */
export function normalizeProductImages(data: {
  gs1ImageUrl?: string;
  gs1TradeExactImageUrl?: string;
  sallingGroupImageUrl?: string;
  rema1000ImageUrl?: string;
  coopImageUrl?: string;
  openFoodFactsImageUrl?: string;
  openFoodFactsFrontImageUrl?: string;
  openFoodFactsOtherImages?: string[];
}): ProductImageSource[] {
  const images: ProductImageSource[] = [];

  if (data.gs1ImageUrl) {
    images.push({
      url: data.gs1ImageUrl,
      source: 'gs1-image',
      type: 'front',
    });
  }

  if (data.gs1TradeExactImageUrl) {
    images.push({
      url: data.gs1TradeExactImageUrl,
      source: 'gs1-trade-exact',
      type: 'front',
    });
  }

  if (data.sallingGroupImageUrl) {
    images.push({
      url: data.sallingGroupImageUrl,
      source: 'salling-group',
      type: 'front',
    });
  }

  if (data.rema1000ImageUrl) {
    images.push({
      url: data.rema1000ImageUrl,
      source: 'rema1000',
      type: 'front',
    });
  }

  if (data.coopImageUrl) {
    images.push({
      url: data.coopImageUrl,
      source: 'coop',
      type: 'front',
    });
  }

  // Open Food Facts - front image har høyest prioritet
  if (data.openFoodFactsFrontImageUrl) {
    images.push({
      url: data.openFoodFactsFrontImageUrl,
      source: 'openfoodfacts',
      type: 'front',
    });
  } else if (data.openFoodFactsImageUrl) {
    images.push({
      url: data.openFoodFactsImageUrl,
      source: 'openfoodfacts',
      type: 'other',
    });
  }

  // Legg til andre bilder fra Open Food Facts hvis tilgjengelig
  if (data.openFoodFactsOtherImages) {
    data.openFoodFactsOtherImages.forEach(url => {
      images.push({
        url,
        source: 'openfoodfacts',
        type: 'other',
      });
    });
  }

  return images;
}

/**
 * Henter beste bilde-URL fra normalisert produktdata
 */
export function getBestImageUrl(images: ProductImageSource[]): string | null {
  return selectBestImage(images);
}

