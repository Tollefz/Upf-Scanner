# Forbedringer av skanningsfunksjonalitet

## Oversikt

Dette dokumentet beskriver forbedringene som er implementert for å gjøre skanning av produkter mer robust og forutsigbar.

## Hovedendringer

### 1. Feiltype-skille

Appen skiller nå mellom ulike feiltyper:
- **404 / Not Found**: "Produktet finnes ikke i databasen"
- **Network Error** (timeout, 5xx, ingen nettverk): "Kunne ikke kontakte databasen – prøv igjen"
- **Missing Ingredients**: Egen state når produkt finnes men mangler ingrediensliste
- **Unknown Error**: Generisk feilhåndtering

### 2. State Machine

Implementert en state machine med følgende states:
- `idle`: Ingen skanning pågår
- `loading`: Skanning pågår
- `found`: Produkt funnet med ingredienser
- `not_found`: Produkt ikke funnet
- `missing_ingredients`: Produkt funnet men mangler ingrediensliste
- `error`: Feil oppstod (nettverk/timeout)

### 3. Fallback når produkt ikke finnes

Når et produkt ikke finnes, får brukeren tre alternativer:
1. **Rapporter produkt**: Kopierer produktinfo til utklippstavle og gir lenker til Open Food Facts
2. **Skann ingrediensliste (OCR)**: Plassholder for OCR-funksjonalitet (kan forbedres senere)
3. **Legg inn manuelt**: Tillater bruker å legge inn produktnavn og ingredienser manuelt

Ukjente strekkoder lagres automatisk lokalt i en kø for senere rapportering.

### 4. Fallback når ingrediensliste mangler

Når produkt finnes men mangler ingrediensliste:
1. **Skann ingrediensliste (OCR)**: Plassholder for OCR
2. **Legg inn manuelt**: Tillater manuell inntasting
3. **Rapporter mangel**: Enkel rapportering med ett trykk

Hvis ingredienser legges inn via OCR eller manuelt, beregnes UPF-score og allergener basert på disse dataene, og det markeres tydelig at dataene er "Basert på bilde/OCR" eller "Basert på manuell inntasting".

### 5. Bedre brukerfeedback

- **Loading state**: Viser "Fant strekkode: XXXXX" + "Søker i database…"
- **Tydelige feilmeldinger**: Alle feil har nå konkrete meldinger
- **Retry-funksjonalitet**: Nettverksfeil kan retries med ett trykk
- **Data source indicator**: Viser om data kommer fra Open Food Facts, OCR eller manuell inntasting

### 6. Logging og instrumentering

Ny utility (`utils/scan-logging.ts`) som logger:
- Strekkode
- Resultatstatus (found, not_found, missing_ingredients, network_error, timeout, unknown_error)
- Latency (responstid)
- Datakilde (openfoodfacts, ocr, manual, unknown)
- Om ingredienser finnes og lengde
- Produktnavn (hvis tilgjengelig)

Ukjente strekkoder lagres i en lokal kø med:
- Strekkode
- Første gang sett
- Siste gang sett
- Antall ganger skannet

## Tekniske detaljer

### Nye filer

- `utils/scan-logging.ts`: Logging og kø-håndtering for ukjente strekkoder

### Endrede filer

- `app/(tabs)/index.tsx`: Hovedendringer:
  - Ny state machine for skanningsresultater
  - Forbedret feilhåndtering i `fetchOffProduct`
  - Nye UI-komponenter for alle states
  - Modaler for OCR og manuell inntasting
  - Integrering med logging-systemet

### Datamodell for logging

```typescript
type ScanLogEntry = {
  barcode: string;
  status: ScanResultStatus;
  latency: number;
  timestamp: number;
  dataSource: 'openfoodfacts' | 'ocr' | 'manual' | 'unknown';
  hasIngredients: boolean;
  ingredientsLength?: number;
  productName?: string;
};

type UnknownBarcode = {
  barcode: string;
  firstSeen: number;
  lastSeen: number;
  count: number;
};
```

## Akseptansekriterier

✅ Skanning av enhver strekkode ender i en tydelig state innen 3–5 sekunder
✅ Ved "ikke funnet" kan brukeren alltid rapportere/legge inn info
✅ Ved "mangler ingredienser" kan brukeren alltid bruke OCR eller rapportere
✅ Nettverksfeil viser "prøv igjen" og blir ikke feilaktig "ikke funnet"
✅ Alle skanninger logges for analyse

## Backend-integrasjon

### Produktrapportering

Appen sender nå automatisk produktrapporter til en backend. Rapporter inkluderer:
- Strekkode
- Status (not_found, missing_ingredients, error)
- Produktnavn (hvis tilgjengelig)
- Valgfritt bilde av produktet/ingredienslisten
- Tidsstempel
- App-versjon

### Konfigurasjon

For å aktivere backend-sending, oppdater `BACKEND_URL` i `utils/product-reporting.ts`:
```typescript
const BACKEND_URL = __DEV__ 
  ? 'https://your-backend-dev.com/api/reports' // Dev URL
  : 'https://your-backend.com/api/reports'; // Production URL
```

### Rapporteringsflyt

1. Bruker trykker "Rapporter produkt" når produkt ikke finnes eller mangler data
2. Modal vises med mulighet for å legge ved bilde
3. Bruker kan ta bilde eller velge fra galleri
4. Ved "Send rapport" sendes data til backend (automatisk)
5. Hvis sending feiler, lagres rapporten lokalt og sendes ved neste mulighet

### Backend API-spesifikasjon

Backend bør akseptere POST-requests til `/api/reports` med følgende format:

```json
{
  "reports": [
    {
      "barcode": "1234567890123",
      "status": "not_found" | "missing_ingredients" | "error",
      "productName": "Produktnavn (optional)",
      "timestamp": 1234567890,
      "imageUri": "data:image/jpeg;base64,... (optional)",
      "appVersion": "1.0.0"
    }
  ],
  "timestamp": 1234567890
}
```

Backend kan returnere:
```json
{
  "accepted": ["barcode1", "barcode2"], // Optional: list of accepted barcodes
  "message": "Reports received"
}
```

## Fremtidige forbedringer

1. **OCR-implementering**: Integrer en OCR-bibliotek (f.eks. ML Kit eller Tesseract) for å faktisk skanne ingredienslister fra bilder
2. **Analytics dashboard**: Visualiser logging-data for å se hvilke produkter som feiler mest
3. **Offline-støtte**: Cache produkter lokalt for offline-tilgang
4. **Batch-sending**: Optimaliser sending av flere rapporter samtidig

## Testing

Test følgende scenarioer:
1. Scan produkt som finnes med ingredienser → Skal vise produktinfo
2. Scan produkt som ikke finnes → Skal vise "ikke funnet" med alternativer
3. Scan produkt uten ingredienser → Skal vise "mangler ingredienser" med alternativer
4. Scan med dårlig nettverk → Skal vise nettverksfeil med retry
5. Legg inn manuelt → Skal beregne UPF-score basert på manuell data
6. Rapporter produkt → Skal kopiere info til utklippstavle

