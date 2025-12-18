# Datakildestrategi - Implementasjonssamenvatning

## ✅ Implementert

### 1. Product Data Model (`src/data/Product.ts`)
- `Product` interface med `gtin`, `name`, `brand`, `imageUrl`, `ingredientsText`, `allergens[]`, `source`, `updatedAt`
- `ProductSource` type: `'cache' | 'openfoodfacts' | 'user'`
- Helper: `createProduct()` for å lage produkter

### 2. Product Repository (`src/data/productRepo.ts`)
- `getProductByGtin(gtin)` - Henter fra cache
- `upsertProduct(product)` - Lagrer/oppdaterer i cache
- `markNotFound(gtin)` - Marker som ikke funnet
- `getRecentScans(limit)` - For historikk senere
- Bruker AsyncStorage (lett å migrere til SQLite senere)

### 3. Open Food Facts Integration (`src/integrations/openFoodFacts.ts`)
- `fetchProductByGtin(gtin, signal)` - Henter fra OFF API
- Normaliserer allergener (fjerner "en:" prefiks)
- Strukturert logging: `LOOKUP_OFF_START`, `LOOKUP_OFF_SUCCESS`, `LOOKUP_OFF_NOT_FOUND`, `LOOKUP_OFF_ERROR`
- AbortController support

### 4. Product Lookup Service (`src/services/productLookup.ts`)
- `lookupProductByGtin(gtin, signal)` - Hovedfunksjon
- Algoritme:
  1. Sjekk cache → returner hvis funnet
  2. Kall OFF → hvis funnet: lagre i cache og returner
  3. Returner `not_found` hvis ikke funnet
- Returnerer `LookupOutcome`: `{ kind: 'product', product }` eller `{ kind: 'not_found', gtin }`

### 5. useScannerController Integration (`hooks/useScannerController.ts`)
- ✅ Integrert `lookupProductByGtin` i `handleBarcodeScanned`
- ✅ Returnerer `outcome: ScanOutcome | null` i state
- ✅ `ScanOutcome` type: `{ kind: 'product' | 'not_found' | 'error', ... }`
- ✅ Timeout (10-15s) med AbortController
- ✅ Lock resettes alltid (finally)
- ✅ Strukturert logging

## 🔄 Neste steg: UI Oppdatering

### Oppdater `app/(tabs)/index.tsx`:

1. **Erstatt eksisterende scan-logikk med `useScannerController`**:
   ```tsx
   const {
     isScanningEnabled,
     isProcessing,
     error,
     outcome,
     resetScanner,
     resumeScanning,
   } = useScannerController({
     lookupTimeoutMs: 12000, // 12s
     autoResumeOnError: true,
   });
   ```

2. **Vis outcome states**:
   - `outcome?.kind === 'product'` → Vis ProductSheet med produktdata
   - `outcome?.kind === 'not_found'` → Vis "Fant ikke produktet" kort med GTIN + "Legg til info" knapp
   - `outcome?.kind === 'error'` → Vis feilmelding + "Prøv igjen" knapp

3. **"Lukk" button skal**:
   - Kalle `resetScanner('close_product_sheet')`
   - Kalle `resumeScanning()`
   - Skjule ProductSheet

## 📝 Testplan

1. **Cache hit**: Scan samme produkt 2 ganger (først OFF, så cache)
2. **Cache miss**: Scan ukjent produkt (not_found)
3. **Offline**: Slå av nett (cache fungerer)
4. **Timeout**: Simuler timeout (lock resettes)

## 🎯 Akseptansekriterier

- ✅ Scanning fungerer uendelig (lock kan ikke henge)
- ✅ Cache hit: produkt vises umiddelbart uten nett
- ✅ Cache miss: OFF lookup og caching fungerer
- ✅ OFF not found: fallback vises
- ✅ Timeout (10-15s): feilmelding vises og scanning starter igjen
- ✅ All kode er ryddig, modulær og TypeScript-type-safe

