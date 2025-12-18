# Product Image Component - Dokumentasjon

## Oversikt

`ProductImage`-komponenten håndterer visning av produktbilder med støtte for:
- ✅ Flere bilder med automatisk prioritet
- ✅ Lazy loading (via expo-image)
- ✅ Automatisk caching (via expo-image)
- ✅ Fallback til placeholder
- ✅ Error handling
- ✅ Loading state

## Installasjon

Komponenten bruker `expo-image` som allerede er installert i prosjektet.

## Grunnleggende bruk

### Enkel bilde-URL

```tsx
import { ProductImage } from '@/components/product-detail/ProductImage';

<ProductImage
  imageUrl="https://example.com/product.jpg"
  productName="Nutella"
/>
```

### Flere bilder med prioritet (anbefalt)

```tsx
import { ProductImage } from '@/components/product-detail/ProductImage';
import type { ProductImageSource } from '@/utils/product-images';

const images: ProductImageSource[] = [
  {
    url: "https://api.gs1.org/images/product.jpg",
    source: 'gs1-image',
    type: 'front',
  },
  {
    url: "https://images.openfoodfacts.org/product.jpg",
    source: 'openfoodfacts',
    type: 'front',
  },
];

<ProductImage
  images={images}
  productName="Nutella"
/>
```

### Raw image data fra flere kilder

```tsx
<ProductImage
  imageData={{
    gs1TradeExactImageUrl: "https://gs1-api.com/image.jpg",
    openFoodFactsFrontImageUrl: "https://off.com/front.jpg",
    sallingGroupImageUrl: "https://salling.com/image.jpg",
  }}
  productName="Nutella"
/>
```

## Prioritering

Bilder prioriteres basert på:

1. **Kilde** (høyest til lavest):
   - GS1 Image API (100)
   - GS1 Trade Exact (90)
   - Salling Group / REMA 1000 / Coop (85)
   - Open Food Facts (70)

2. **Type** (høyest til lavest):
   - Front (100)
   - Ingredients (80)
   - Nutrition (70)
   - Back (60)
   - Other (50)

Bildet med høyest kombinert prioritet velges automatisk.

## Caching

Komponenten bruker `expo-image` som cacher bilder automatisk:
- **Memory cache**: Rask tilgang til nylig brukte bilder
- **Disk cache**: Bevarer bilder mellom app-restarter

Cache-policy er satt til `"memory-disk"` for optimal ytelse.

## Lazy Loading

Bilder lastes lazy ved default (kun når de er synlige). `expo-image` håndterer dette automatisk.

For å forhåndslaste bilder, kan du bruke:
```tsx
import { Image } from 'expo-image';

// Preload image
await Image.prefetch(imageUrl);
```

## Error Handling

Hvis bilde-URL ikke kan lastes, faller komponenten automatisk tilbake til placeholder. Ingen ekstra error handling nødvendig.

## Props

```typescript
interface ProductImageProps {
  // Enkel bilde-URL (bakoverkompatibilitet)
  imageUrl?: string;
  
  // Flere bilder med prioritet (anbefalt)
  images?: ProductImageSource[];
  
  // Raw data fra ulike kilder
  imageData?: {
    gs1ImageUrl?: string;
    gs1TradeExactImageUrl?: string;
    sallingGroupImageUrl?: string;
    rema1000ImageUrl?: string;
    coopImageUrl?: string;
    openFoodFactsImageUrl?: string;
    openFoodFactsFrontImageUrl?: string;
  };
  
  productName?: string;
  placeholderIcon?: string;
  placeholderText?: string;
}
```

## Eksempel: Integrasjon med produktoppslag

```tsx
import { ProductImage } from '@/components/product-detail/ProductImage';
import { normalizeProductImages } from '@/utils/product-images';

function ProductDetailScreen({ product }) {
  // Normaliser bilder fra produktoppslag
  const images = normalizeProductImages({
    gs1ImageUrl: product.gs1Image?.url,
    openFoodFactsFrontImageUrl: product.openFoodFactsFrontImage,
    sallingGroupImageUrl: product.sallingGroupImage,
  });

  return (
    <ProductImage
      images={images}
      productName={product.title}
    />
  );
}
```

## Ytelse

- **Lazy loading**: Bilder lastes kun når synlige
- **Caching**: Automatisk caching reduserer nettverkskall
- **Optimized images**: expo-image optimerer bilder automatisk
- **Transition**: Glatt 200ms transition ved bildebytte

## Tilgjengelighet

Komponenten inkluderer `accessibilityLabel` basert på produktnavn.

## Se også

- `utils/product-images.ts` - Utility-funksjoner for bildehåndtering
- `expo-image` dokumentasjon: https://docs.expo.dev/versions/latest/sdk/image/

