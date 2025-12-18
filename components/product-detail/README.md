# Product Detail Screen - Design Dokumentasjon

## Oversikt

Produktvisningsskjermen er designet for å være **trygg, varm og forbrukervennlig**. Designet følger mat-fokuserte prinsipper med varme farger og myke former, i stedet for kald tech-æstetikk.

## Design System

### Farger

```typescript
const COLORS = {
  background: '#F8FAF9',      // Lys off-white bakgrunn
  primary: '#4CAF50',         // Mild grønn (handlinger)
  secondary: '#FFB74D',       // Varm gul/oransje (aksenter)
  textPrimary: '#2E2E2E',     // Hovedtekst
  textSecondary: '#6B6B6B',   // Sekundær tekst
  cardBackground: '#FFFFFF',  // Hvitt kort-bakgrunn
  divider: '#E6ECE9',         // Delere/linjer
};
```

### Typografi

- **Produktnavn**: 20pt, semi-bold (600)
- **Seksjonstitler**: 18pt, semi-bold (600)
- **Body tekst**: 14pt, regular (400)
- **Merke/Badge**: 12-14pt, medium (500)
- **God linjeavstand**: 22-28px

### Border Radius

- **Kort**: 16-18px (myke, runde hjørner)
- **Badges**: 12px (rundt)
- **Knapper**: 16px

### Skygger

- **Myke skygger**: Low opacity (0.05), small radius (4-8px)
- **Kun dybde, ikke harde kort**: Ingen tydelige borders

## Layout Struktur

### Vertikal Rekkefølge (top to bottom)

1. **Product Image** (full width, 1:1 aspect ratio)
   - Runde hjørner (18px)
   - Placeholder hvis ingen bilde
   - Myk skygge

2. **Product Header** (padding 20px)
   - Produktnavn
   - Merke
   - Source badge + Confidence indicator (i samme rad)

3. **Allergen Section** (hvis tilgjengelig)
   - Tydelig visning med varme farger
   - "Inneholder" (orange bakgrunn)
   - "Kan inneholde spor av" (gul bakgrunn)

4. **Nutrition Overview** (hvis tilgjengelig)
   - Kompakt kort
   - Viktigste næringsstoffer
   - Per 100g

5. **Ingredients Section** (hvis tilgjengelig)
   - Scrollbar hvis lang liste
   - God lesbarhet (14pt, line-height 22px)

### Spacing

- **Seksjoner**: 24px margin-bottom
- **Kort padding**: 20px
- **Horizontal padding**: 20px
- **Bottom spacing**: 32px

## Komponenter

### ProductImage
- Viser produktbilde eller placeholder
- Full width, 1:1 aspect ratio
- Runde hjørner, myk skygge

### ProductHeader
- Produktnavn (20pt, semi-bold)
- Merke (14pt, grå)

### SourceBadge
- Diskret badge med datakilde
- Nøytral farge (#F0F4F2)
- Rundt design

### ConfidenceIndicator
- Fargekodet (Høy/Middels/Lav)
- Grønn/Gul/Oransje

### AllergenSection
- Tydelig visning
- Varme farger (orange/gul bakgrunn)
- Adskilt "inneholder" og "kan inneholde"

### NutritionOverview
- Kompakt design
- Viktigste næringsstoffer
- Per 100g visning

### IngredientsSection
- Scrollbar hvis lang
- God lesbarhet
- Mykt kort-design

### EmptyState
- Vennlig melding
- Tydelige neste steg
- Trygg og støttende tone

## Tom-tilstand (Empty State)

Når produkt ikke finnes, vises:

```
🔍
Fant ikke produktet

Vi kunne ikke finne dette produktet i våre databaser.

[Forslag: Prøv å scanne strekkoden på nytt, eller legg det til manuelt.]
```

- Stor ikon (64pt)
- Tydelig tittel
- Forklarende melding
- Forslag til neste steg (i eget kort)

## Design Prinsipper

### 1. Trygghet
- Tydelig informasjon om allergener
- Klar kildeangivelse
- Confidence indicator

### 2. Varme
- Varme farger (grønn, oransje, gul)
- Myke former
- Ingen harde linjer

### 3. Forbrukervennlighet
- Enkel struktur
- God lesbarhet
- Tydelig hierarki
- Ikke overfylt

### 4. Mat-fokus
- Varme farger (ikke tech-blått)
- Naturlige farger
- Menneskelig tone

## Implementering

```typescript
import { ProductDetailScreen } from '@/components/product-detail/ProductDetailScreen';

<ProductDetailScreen
  product={{
    gtin: '3017620422003',
    title: 'Nutella',
    brand: 'Ferrero',
    source: 'GS1 Trade Exact',
    source_confidence: 95,
    allergens: ['hasselnøtter', 'melk'],
    ingredients: 'Sukker, palmeolje, hasselnøtter...',
    nutrition: {
      energy_kcal_per_100g: 539,
      fat_per_100g: 30.9,
      carbohydrates_per_100g: 57.5,
    },
  }}
/>
```

## Tilgjengelighet

- Alle bilder har `accessibilityLabel`
- God kontrast på tekst
- Tydelig hierarki
- Lesbar font-størrelse (minimum 14pt)

## Responsive Design

- Fungerer på alle skjermstørrelser
- ScrollView for langt innhold
- Max-height på ingrediensliste (300px)
- Adaptive spacing

