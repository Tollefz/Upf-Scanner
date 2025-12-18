# Product Lookup Utilities

Produksjonsklar TypeScript-kode for produktoppslag i en matvare-skanner-app.

## Quick Start

```typescript
import { lookupProduct } from './utils/product-lookup';

// Basic usage
const result = await lookupProduct('3017620422003');

if (result.status === 'exact_ean' && result.product) {
  console.log('Product:', result.product.title);
  console.log('Brand:', result.product.brand);
  console.log('Source confidence:', result.product.sourceConfidence);
  console.log('Sources:', result.sourcesUsed.map(s => s.name));
}
```

## Filstruktur

```
src/
├── models/
│   └── Product.ts          # Type definitions
├── utils/
│   ├── gtin.ts             # GTIN validation
│   ├── cache.ts            # AsyncStorage caching
│   ├── product-lookup.ts   # Main lookup function
│   ├── sources/
│   │   ├── openFoodFacts.ts  # Open Food Facts (implemented)
│   │   ├── gs1.ts            # GS1 (placeholder)
│   │   └── salling.ts        # Salling Group (placeholder)
│   └── index.ts            # Main exports
```

## Konfigurasjon

### Miljøvariabler

Sett opp i `.env` eller `app.json`:

```bash
# GS1 Trade Exact API
EXPO_PUBLIC_GS1_TRADE_EXACT_API_KEY=your-api-key

# GS1 Image API
EXPO_PUBLIC_GS1_IMAGE_API_KEY=your-image-api-key

# Salling Group API
EXPO_PUBLIC_SALLING_GROUP_TOKEN=your-bearer-token
```

Eller i `app.json`:

```json
{
  "expo": {
    "extra": {
      "gs1TradeExactApiKey": "your-api-key",
      "gs1ImageApiKey": "your-image-api-key",
      "sallingGroupToken": "your-token"
    }
  }
}
```

## Bruk

### Valider GTIN

```typescript
import { validateGTIN } from './utils/gtin';

const validation = validateGTIN('3017620422003');
if (validation.ok) {
  console.log('Normalized GTIN:', validation.normalized);
} else {
  console.error('Error:', validation.error);
}
```

### Produktoppslag

```typescript
import { lookupProduct } from './utils/product-lookup';

// Enkel oppslag
const result = await lookupProduct('3017620422003');

// Med OCR-text for fallback (fremtidig funksjonalitet)
const result = await lookupProduct('3017620422003', {
  ocrText: 'Nutella 400g'
});
```

### Resultat-håndtering

```typescript
const result = await lookupProduct('3017620422003');

switch (result.status) {
  case 'exact_ean':
    // Produkt funnet med eksakt GTIN-match
    if (result.product) {
      console.log('Title:', result.product.title);
      console.log('Ingredients:', result.product.ingredientsText);
      console.log('Allergens:', result.product.allergens);
      console.log('Source confidence:', result.product.sourceConfidence);
    }
    break;
    
  case 'probable':
    // Sannsynlig match (fra OCR/text search)
    // TODO: Implementer når OCR-støtte legges til
    break;
    
  case 'not_found':
    // Produkt ikke funnet
    console.log('Product not found');
    console.log('Next actions:', result.nextActions);
    break;
}
```

## Pipeline

Produktoppslaget følger denne rekkefølgen:

1. **Valider GTIN** - Sjekk format og checksum
2. **Sjekk cache** - Returner cached resultat hvis tilgjengelig (< 24 timer)
3. **Hent fra kilder parallelt:**
   - GS1 Trade Exact (hvis konfigurert)
   - Salling Group (hvis konfigurert)
   - Open Food Facts (alltid aktiv)
4. **Merge data** - Slå sammen med prioritet (GS1 > Salling > OFF)
5. **Beregn confidence** - Basert på kilde og datakvalitet
6. **Cache resultat** - Lagre for 24 timer
7. **Logg ukjente** - Hvis ikke funnet, logg til AsyncStorage

## Dataformat

### Product

```typescript
interface Product {
  gtin: string;                    // Normalisert GTIN
  title?: string;                  // Produktnavn
  brand?: string;                  // Merke
  quantity?: string;               // Mengde (f.eks. "400")
  unit?: string;                   // Enhet (f.eks. "g", "ml")
  categories?: string[];           // Produktkategorier
  ingredientsText?: string;        // Ingrediensliste som tekst
  allergens?: string[];            // Allergener
  traces?: string[];               // Spor av allergener
  nutrition?: NutritionData;       // Næringsinnhold
  imageUrls?: string[];            // Bilde-URLer (prioritert)
  source: string;                  // Datakilde (eller kombinert)
  sourceConfidence: number;        // 0-100
}
```

### LookupResult

```typescript
interface LookupResult {
  status: 'exact_ean' | 'probable' | 'not_found';
  product?: Product;
  sourcesUsed: SourceUsed[];
  nextActions?: string[];
  error?: string;
}
```

## Caching

Resultater caches automatisk i 24 timer. Gamle cache-entries (>7 dager) ryddes automatisk.

```typescript
import { loadCache, saveCache } from './utils/cache';

// Cache håndteres automatisk av lookupProduct
// Men du kan også bruke manuelt:
const cached = await loadCache('3017620422003');
if (cached) {
  // Use cached result
}
```

## Ukjente GTIN-er

Ukjente GTIN-er logges automatisk til AsyncStorage. Se dem med:

```typescript
import { getUnknownGTINs } from './utils/cache';

const unknown = await getUnknownGTINs();
console.log('Unknown GTINs:', unknown);
// TODO: Send to backend for enrichment
```

## TODO: Implementering av API-klienter

### GS1 Trade Exact
- [ ] Få API-nøkkel fra https://developer.gs1.org/
- [ ] Oppdater endpoint i `src/utils/sources/gs1.ts`
- [ ] Map API response til Product-format
- [ ] Test og valider

### Salling Group
- [ ] Få API-token fra https://developer.sallinggroup.com/
- [ ] Oppdater endpoint i `src/utils/sources/salling.ts`
- [ ] Map API response til Product-format
- [ ] Test og valider

## Testing

```typescript
// Test GTIN validation
const testGTINs = [
  '3017620422003',  // Valid EAN-13
  '12345678',       // Valid EAN-8
  '123456789012',   // Valid UPC-A
  'invalid',        // Invalid
];

testGTINs.forEach(gtin => {
  const result = validateGTIN(gtin);
  console.log(`${gtin}: ${result.ok ? 'OK' : result.error}`);
});

// Test product lookup
const result = await lookupProduct('3017620422003');
console.log('Result:', JSON.stringify(result, null, 2));
```

## Feilhåndtering

Alle API-kall har:
- 10 sekunder timeout
- Automatisk feilhåndtering
- Fallback til neste kilde hvis en feiler
- Graceful degradation

Hvis en kilde feiler, fortsetter oppslaget med andre kilder.

## Performance

- Parallell fetching fra kilder
- 24 timers cache
- Lazy loading av bilder (håndteres av komponenter)
- Optimert for mobilnettverk

