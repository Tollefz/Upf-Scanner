# API Clients Documentation

Modulære API-klienter for produktoppslag fra flere kilder.

## Oversikt

Hver datakilde har sin egen klient-fil med felles interface `fetchProductByGTIN(gtin)`.

## Konfigurasjon

### Miljøvariabler

Opprett en `.env` fil (eller bruk Expo config):

```bash
# GS1 Trade Exact API
EXPO_PUBLIC_GS1_TRADE_EXACT_API_KEY=your-api-key-here
EXPO_PUBLIC_ENABLE_GS1_TRADE_EXACT=true

# GS1 Image API
EXPO_PUBLIC_GS1_IMAGE_API_KEY=your-image-api-key-here
EXPO_PUBLIC_ENABLE_GS1_IMAGE=true

# Salling Group API
EXPO_PUBLIC_SALLING_GROUP_TOKEN=your-bearer-token-here
EXPO_PUBLIC_ENABLE_SALLING_GROUP=true

# REMA 1000 API
EXPO_PUBLIC_REMA_1000_API_KEY=your-api-key-here
EXPO_PUBLIC_ENABLE_REMA_1000=true

# Coop API
EXPO_PUBLIC_COOP_API_KEY=your-api-key-here
EXPO_PUBLIC_ENABLE_COOP=true
```

### app.json konfigurasjon (alternativ)

```json
{
  "expo": {
    "extra": {
      "gs1TradeExactApiKey": "your-api-key",
      "enableGs1TradeExact": true,
      "sallingGroupToken": "your-token",
      "enableSallingGroup": true
    }
  }
}
```

## Feature Flags - Trinnvis aktivering

Feature flags lar deg aktivere kilder gradvis:

### Steg 1: Bare Open Food Facts (default)
```typescript
// Ingen miljøvariabler nødvendig - Open Food Facts er alltid aktivert
```

### Steg 2: Legg til Salling Group
```bash
EXPO_PUBLIC_SALLING_GROUP_TOKEN=your-token
EXPO_PUBLIC_ENABLE_SALLING_GROUP=true
```

### Steg 3: Legg til GS1 Trade Exact
```bash
EXPO_PUBLIC_GS1_TRADE_EXACT_API_KEY=your-key
EXPO_PUBLIC_ENABLE_GS1_TRADE_EXACT=true
```

### Steg 4: Legg til flere kilder etter hvert
Aktiver én kilde om gangen og test før du legger til neste.

## Bruk

### Eksempel 1: Bruk alle aktiverte klienter

```typescript
import { createEnabledClients } from '@/utils/api-clients';

// Opprett alle aktiverte klienter basert på feature flags
const { clients, imageClient, validationErrors } = createEnabledClients({
  config: {
    timeout: 10000, // 10 sekunder
    retries: 2,
    retryDelay: 500,
  },
});

// Sjekk for valideringsfeil
if (validationErrors.length > 0) {
  console.warn('API configuration warnings:', validationErrors);
}

// Bruk klientene for produktoppslag
const gtin = '3017620422003';

// Prøv alle kilder parallelt
const results = await Promise.all(
  clients.map(client => 
    client.fetchProductByGTIN(gtin).catch(err => {
      console.error(`Error from ${client.getSourceName()}:`, err);
      return null;
    })
  )
);

// Filtrer bort null-resultater
const validResults = results.filter(r => r !== null);

// Hent bilde fra GS1 Image hvis tilgjengelig
let imageUrl: string | null = null;
if (imageClient) {
  imageUrl = await imageClient.fetchImageURL(gtin);
}
```

### Eksempel 2: Bruk en spesifikk klient

```typescript
import { GS1TradeExactClient } from '@/utils/api-clients';
import { getAPICredentials } from '@/utils/api-clients/config';

const credentials = getAPICredentials();

if (credentials.gs1TradeExactApiKey) {
  const client = new GS1TradeExactClient(credentials.gs1TradeExactApiKey, {
    timeout: 15000,
    retries: 3,
  });

  const product = await client.fetchProductByGTIN('3017620422003');
  
  if (product) {
    console.log('Product found:', product.title);
    console.log('Source:', client.getSourceName());
  }
}
```

### Eksempel 3: Normalisering til felles modell

Alle klienter returnerer `RawProductData` med samme struktur:

```typescript
interface RawProductData {
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
}
```

Dette gjør det enkelt å slå sammen data fra flere kilder:

```typescript
import { createEnabledClients } from '@/utils/api-clients';

const { clients } = createEnabledClients();

const gtin = '3017620422003';

// Hent fra alle kilder
const results = await Promise.allSettled(
  clients.map(client => client.fetchProductByGTIN(gtin))
);

// Slå sammen resultater (prioriter høyere prioritetsklienter)
const merged: RawProductData = {
  gtin,
};

for (const result of results) {
  if (result.status === 'fulfilled' && result.value) {
    const product = result.value;
    
    // Fyll manglende felter
    if (!merged.brand && product.brand) merged.brand = product.brand;
    if (!merged.title && product.title) merged.title = product.title;
    if (!merged.ingredients && product.ingredients) merged.ingredients = product.ingredients;
    
    // Slå sammen allergener (union)
    if (product.allergens) {
      const allergenSet = new Set(merged.allergens || []);
      product.allergens.forEach(a => allergenSet.add(a));
      merged.allergens = Array.from(allergenSet);
    }
    
    // Prefer høyere kvalitetsbilde
    if (!merged.image_url && product.image_url) {
      merged.image_url = product.image_url;
    }
  }
}
```

## Implementasjonsstatus

- ✅ **Open Food Facts**: Fullt implementert
- ✅ **GS1 Trade Exact**: Struktur klar, TODO for faktisk API-integrasjon
- ✅ **GS1 Image**: Struktur klar, TODO for faktisk API-integrasjon
- ✅ **Salling Group**: Struktur klar, TODO for faktisk API-integrasjon
- ⚠️ **REMA 1000**: Placeholder - krever API-dokumentasjon
- ⚠️ **Coop**: Placeholder - krever API-dokumentasjon

## Felles funksjonalitet

Alle klienter har:
- ✅ Timeout-håndtering (default 10 sekunder)
- ✅ Retry-logikk (default 2 retries)
- ✅ Feilhåndtering
- ✅ Normalisering til felles `RawProductData` format

## Få API-nøkler

### GS1 Trade Exact / Image
1. Registrer deg på https://developer.gs1.org/
2. Opprett en application
3. Få API-nøkkel fra dashboardet
4. Sett miljøvariabel: `EXPO_PUBLIC_GS1_TRADE_EXACT_API_KEY`

### Salling Group
1. Registrer deg på https://developer.sallinggroup.com/
2. Opprett en application
3. Få Bearer token
4. Sett miljøvariabel: `EXPO_PUBLIC_SALLING_GROUP_TOKEN`

### REMA 1000
1. Kontakt REMA 1000 for API-tilgang
2. Få API-dokumentasjon
3. Sett miljøvariabel: `EXPO_PUBLIC_REMA_1000_API_KEY`

### Coop
1. Kontakt Coop for API-tilgang
2. Få API-dokumentasjon
3. Sett miljøvariabel: `EXPO_PUBLIC_COOP_API_KEY`

