# Product Lookup Module

Produksjonsklar TypeScript-kode for produktoppslag i matvare-skanner-appen.

## Quick Start

```typescript
import { lookupProduct } from '@/src/utils/product-lookup';

const result = await lookupProduct('3017620422003');
if (result.status === 'exact_ean' && result.product) {
  console.log('Product:', result.product.title);
}
```

## Filstruktur

```
src/
├── models/
│   └── Product.ts              # Type definitions
└── utils/
    ├── gtin.ts                 # GTIN validation (EAN-8, UPC-A, EAN-13, GTIN-14)
    ├── cache.ts                # AsyncStorage caching (24h TTL)
    ├── product-lookup.ts       # Main lookup function ⭐
    ├── index.ts                # Exports
    ├── README.md               # Full documentation
    ├── USAGE_EXAMPLE.ts        # Usage examples
    └── sources/
        ├── openFoodFacts.ts    # ✅ Implemented
        ├── gs1.ts              # ⚠️ Placeholder (needs API key)
        └── salling.ts          # ⚠️ Placeholder (needs API key)
```

## Hovedfunksjonalitet

### 1. GTIN-validering (`gtin.ts`)
- Støtter EAN-8, UPC-A (12), EAN-13, GTIN-14
- Validerer checksum (Luhn-algoritme)
- Normaliserer (fjerner mellomrom/bindestrek)

### 2. Produktoppslag (`product-lookup.ts`)
- Pipeline: GS1 > Salling > Open Food Facts
- Parallell fetching
- Intelligent merging med prioritet
- Automatisk caching (24 timer)
- Logging av ukjente GTIN-er

### 3. Datakilder (`sources/`)
- **Open Food Facts**: ✅ Fullt implementert (ingen auth)
- **GS1**: ⚠️ Placeholder (trenger API-nøkkel)
- **Salling Group**: ⚠️ Placeholder (trenger API-token)

## Konfigurasjon

Legg til i `app.json` eller `.env`:

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

```typescript
import { lookupProduct } from '@/src/utils/product-lookup';

// Enkel oppslag
const result = await lookupProduct('3017620422003');

// Håndter resultat
if (result.status === 'exact_ean' && result.product) {
  console.log(result.product.title);
  console.log(result.product.ingredientsText);
  console.log(result.product.allergens);
}
```

## Se også

- `src/utils/README.md` - Full dokumentasjon
- `src/utils/USAGE_EXAMPLE.ts` - Flere eksempler

