# Product Lookup Agent

En produktoppslags-agent for dansk mat- og drikkeapp som identifiserer produkter fra skannede EAN/GTIN-strekoder og returnerer normaliserte produktobjekter.

## Funksjonalitet

- Validerer GTIN-koder (EAN-8, EAN-13, UPC-A, GTIN-14)
- Søker i flere datakilder i prioritert rekkefølge:
  1. Open Food Facts (alltid aktiv)
  2. GS1 (hvis API-nøkkel er konfigurert)
  3. Salling Group APIs (Føtex/Netto/Bilka) - hvis token er konfigurert
  4. REMA 1000 API - hvis API-nøkkel er konfigurert
  5. Coop/365discount API - hvis API-nøkkel er konfigurert
- Slår sammen data fra flere kilder med prioritet
- Cacher resultater (24 timer)
- Logger ukjente GTIN-er for senere beriking
- Støtter OCR-fallback (når implementert)

## Bruk

### Grunnleggende bruk

```typescript
import { lookupProduct, type ProductLookupConfig } from '@/utils/product-lookup';

const result = await lookupProduct('3017620422003', {
  locale: 'da-DK',
  // Valgfrie API-nøkler:
  // gs1ApiKey: 'your-gs1-key',
  // sallingGroupToken: 'your-salling-token',
  // rema1000ApiKey: 'your-rema-key',
  // coopApiKey: 'your-coop-key',
});

if (result.product) {
  console.log('Produkt funnet:', result.product.title);
  console.log('Kilder:', result.sources_used.map(s => s.name));
} else {
  console.log('Produkt ikke funnet');
  console.log('Neste handlinger:', result.next_actions);
}
```

### Med OCR-input

```typescript
const result = await lookupProduct('3017620422003', {
  locale: 'da-DK',
}, {
  text: 'Nutella, 400g',
  brand: 'Nutella',
  name: 'Nutella',
  size: '400g',
});
```

### Konvertering til eksisterende format (bakoverkompatibilitet)

```typescript
import { normalizeToOffProduct } from '@/utils/product-lookup';

const normalizedProduct = await lookupProduct('3017620422003');
if (normalizedProduct.product) {
  const offProduct = normalizeToOffProduct(normalizedProduct.product);
  // Bruk offProduct med eksisterende kode
}
```

## Datastruktur

### NormalizedProduct

```typescript
interface NormalizedProduct {
  gtin: string;
  brand?: string;
  title?: string;
  quantity?: string;
  unit?: string;
  category?: string;
  ingredients?: string;
  allergens?: string[];
  traces?: string[];
  nutrition?: NutritionData;
  image_url?: string;
  source: string;
  source_confidence: number; // 0-100
  last_seen?: number;
}
```

### ProductLookupResult

```typescript
interface ProductLookupResult {
  product?: NormalizedProduct;
  sources_used: SourceInfo[];
  match_status: 'exact_ean' | 'probable' | 'not_found';
  next_actions?: NextAction[];
  error?: string;
}
```

## Konfigurasjon

### API-nøkler

For å aktivere ekstra datakilder, må API-nøkler konfigureres. Dette kan gjøres via:

1. Miljøvariabler (anbefalt for produksjon)
2. Konfigurasjonsfil
3. Runtime-konfigurasjon

**Viktig**: Følg alltid kildevilkår for hver API. Bruk kun offisielle API-er - ingen web scraping med mindre det eksplisitt er tillatt og konfigurert.

## Cache

Produkter caches automatisk i 24 timer for å redusere API-kall. Cache lagres i AsyncStorage.

## Ukjente GTIN-er

GTIN-er som ikke finnes i noen datakilde lagres automatisk for senere beriking. Dette kan brukes til å:

- Prioritere hvilke produkter som skal legges til
- Analysere hvilke produkter som mangler
- Følge opp med produsenter/kjeder

## Prioritering ved sammenslåing

Når data fra flere kilder sammenslås, følges denne prioriteringen:

1. **GS1** (høyest prioritet - autoritativ)
2. **Offisielle kjede-feeds** (Salling Group, REMA 1000, Coop)
3. **Open Food Facts**
4. Andre kilder

Felt slås sammen slik at:
- Felter fra høyere prioritetskilder overskriver lavere
- Manglende felter fylles fra lavere prioritetskilder
- Allergener og spor sammenslås (union)

## Fremtidige forbedringer

- [ ] Fuzzy text-søk når EAN ikke matcher
- [ ] Støtte for bildesøk (OCR fra produktbilde)
- [ ] Implementering av faktiske GS1/Salling/REMA/Coop API-integrasjoner
- [ ] Automatisk beriking av ukjente GTIN-er
- [ ] Statistikk over treffrate per kilde

