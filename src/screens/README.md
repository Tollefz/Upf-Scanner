# Screens Documentation

## ScanScreen

Scanner-skjerm med scan-frame overlay og "Simuler scan"-knapp for testing.

### Bruk

```typescript
import { ScanScreen } from '@/src/screens/ScanScreen';

// I din router/komponent
<ScanScreen />
```

### Funksjonalitet

- Viser scan-frame overlay (placeholder for kamera)
- "Simuler scan"-knapp som navigerer til ProductScreen med mock GTIN
- Enkel instruksjonstekst

### Navigasjon

Bruker `expo-router` for navigasjon. Når "Simuler scan" trykkes, navigeres til `/product` med GTIN-parameter.

## ProductScreen

Produktvisningsskjerm som viser produktdata fra lookupProduct.

### Bruk

```typescript
import { ProductScreen } from '@/src/screens/ProductScreen';

// Naviger til ProductScreen med GTIN
router.push({
  pathname: '/product',
  params: { gtin: '3017620422003' },
});
```

### Funksjonalitet

- Henter produktdata via `lookupProduct(gtin)`
- Viser loading-state mens data hentes
- Viser produktbilde (eller placeholder)
- Viser produktnavn, merke, kilde, kvalitet
- Viser allergener som chips
- Viser ingrediensliste i scrollbar kort
- Viser næringsinnhold (hvis tilgjengelig)
- "Scan nytt produkt"-knapp som navigerer tilbake

### States

1. **Loading**: Viser ActivityIndicator og "Henter produkt..."
2. **Success**: Viser produktdata
3. **Not Found**: Viser "Fant ikke produktet" med tilbake-knapp
4. **Error**: Viser feilmelding

### Komponenter brukt

- `ProductImage` - Produktbilde med placeholder
- `SourceBadge` - Kilde og kvalitetsindikator
- `AllergenChips` - Allergener som chips
- `InfoCard` - Kort for ingredienser og næringsinnhold

## Oppsett

For å bruke disse skjermene i appen:

1. **ScanScreen** kan brukes i `app/(tabs)/index.tsx`:

```typescript
import { ScanScreen } from '@/src/screens/ScanScreen';

export default function Index() {
  return <ScanScreen />;
}
```

2. **ProductScreen** er tilgjengelig via `/product` route (allerede satt opp i `app/product.tsx`)

## Design

Alle skjermer følger design-systemet i `src/theme.ts`:
- Lys bakgrunn (#F8FAF9)
- Primær grønn (#4CAF50)
- Myke runde kort (radius 16)
- Matvennlig, ikke tech-blått

