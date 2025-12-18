# UI-struktur - Oversikt

## Filstruktur

```
src/
├── theme.ts                    # Design system (farger, spacing, radius)
├── screens/
│   ├── ScanScreen.tsx          # Scanner-skjerm med "Simuler scan"
│   ├── ProductScreen.tsx       # Produktvisningsskjerm
│   ├── index.ts                # Exports
│   └── README.md               # Dokumentasjon
├── components/
│   ├── ProductImage.tsx        # Produktbilde med placeholder
│   ├── SourceBadge.tsx         # Kilde + kvalitetsindikator
│   ├── AllergenChips.tsx       # Allergener som chips
│   ├── InfoCard.tsx            # Gjenbrukbar kortkomponent
│   └── index.ts                # Exports
└── models/
    └── Product.ts              # Type definitions (allerede eksisterer)
```

## Design System

Alle designverdier er definert i `src/theme.ts`:

- **Farger**: Bakgrunn (#F8FAF9), Primær (#4CAF50), Sekundær (#FFB74D)
- **Spacing**: xs, sm, md, lg, xl, xxl
- **Radius**: sm (8), md (16), lg (24), xl (32)
- **Typography**: h1, h2, body, bodySmall, caption
- **Shadows**: card, button

## Skjermer

### ScanScreen (`src/screens/ScanScreen.tsx`)
- Viser scan-frame overlay
- "Simuler scan"-knapp for testing
- Navigerer til ProductScreen med mock GTIN

### ProductScreen (`src/screens/ProductScreen.tsx`)
- Henter produktdata via `lookupProduct(gtin)`
- Viser loading-state
- Viser produktbilde, navn, merke
- Viser kilde/kvalitet-badge
- Viser allergener, ingredienser, næringsinnhold
- "Scan nytt produkt"-knapp

## Komponenter

### ProductImage
- Viser produktbilde eller placeholder
- 1:1 aspect ratio
- Runde hjørner, myk skygge

### SourceBadge
- Viser datakilde
- Viser kvalitet (Høy/Middels/Lav) basert på sourceConfidence
- Fargekodet (grønn/gul/rød)

### AllergenChips
- Viser allergener som chips
- Viser spor separat
- Varme farger (orange/gul)

### InfoCard
- Gjenbrukbar kortkomponent
- Støtter scrollbar innhold
- Myk skygge, runde hjørner

## Integrasjon

### Navigasjon
Bruker `expo-router`:
- ScanScreen → ProductScreen via `router.push({ pathname: '/product', params: { gtin } })`
- ProductScreen registrert i `app/_layout.tsx` og `app/product.tsx`

### Produktoppslag
ProductScreen kaller `lookupProduct(gtin)` fra `src/utils/product-lookup.ts`:
- Håndterer loading-state
- Håndterer not_found-state
- Viser produktdata

## Testing

1. Åpne appen
2. ScanScreen vises med "Simuler scan"-knapp
3. Trykk knappen → navigerer til ProductScreen med GTIN '3017620422003'
4. ProductScreen henter produktdata og viser resultatet

## Neste steg

- Integrer ekte kamera i ScanScreen
- Legg til flere produkter i mock-data
- Forbedre error-handling
- Legg til flere animasjoner/transitions

