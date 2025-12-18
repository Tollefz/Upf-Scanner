/**
 * Product Image Component - Usage Examples
 * 
 * Eksempler på hvordan ProductImage-komponenten brukes
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProductImage } from './ProductImage';
import type { ProductImageSource } from '@/utils/product-images';

/**
 * Eksempel 1: Enkel bruk med en bilde-URL
 */
export function Example1_SimpleUsage() {
  return (
    <ProductImage
      imageUrl="https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.400.jpg"
      productName="Nutella"
    />
  );
}

/**
 * Eksempel 2: Bruk med flere bilder (anbefalt)
 * Prioriterer automatisk front-of-pack fra høyest kvalitetskilde
 */
export function Example2_MultipleImages() {
  const images: ProductImageSource[] = [
    {
      url: "https://api.gs1.org/images/3017620422003/front.jpg",
      source: 'gs1-image',
      type: 'front',
    },
    {
      url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.400.jpg",
      source: 'openfoodfacts',
      type: 'front',
    },
  ];

  return (
    <ProductImage
      images={images}
      productName="Nutella"
    />
  );
}

/**
 * Eksempel 3: Bruk med raw image data fra ulike kilder
 * Komponenten normaliserer og prioriterer automatisk
 */
export function Example3_RawImageData() {
  return (
    <ProductImage
      imageData={{
        gs1TradeExactImageUrl: "https://api.gs1.org/trade-exact/products/3017620422003/image.jpg",
        openFoodFactsFrontImageUrl: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.400.jpg",
        sallingGroupImageUrl: "https://api.sallinggroup.com/products/3017620422003/image.jpg",
      }}
      productName="Nutella"
    />
  );
}

/**
 * Eksempel 4: Custom placeholder
 */
export function Example4_CustomPlaceholder() {
  return (
    <ProductImage
      productName="Ukjent produkt"
      placeholderIcon="🍽️"
      placeholderText="Ingen produktbilde"
    />
  );
}

/**
 * Eksempel 5: Real-world scenario - kombinerer data fra flere kilder
 */
export function Example5_RealWorldScenario() {
  // Data fra produktoppslag
  const productData = {
    gtin: '3017620422003',
    title: 'Nutella',
    brand: 'Ferrero',
    // Bildene kan komme fra flere kilder
    images: [
      // GS1 Image API (høyest prioritet)
      {
        url: "https://api.gs1.org/images/3017620422003/front.jpg",
        source: 'gs1-image' as const,
        type: 'front' as const,
      },
      // Open Food Facts (fallback)
      {
        url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.400.jpg",
        source: 'openfoodfacts' as const,
        type: 'front' as const,
      },
    ],
  };

  return (
    <View style={styles.container}>
      <ProductImage
        images={productData.images}
        productName={productData.title}
      />
    </View>
  );
}

/**
 * Eksempel 6: Med error handling (automatisk fallback til placeholder)
 * Hvis bilde-URL ikke kan lastes, vises placeholder automatisk
 */
export function Example6_ErrorHandling() {
  return (
    <ProductImage
      imageUrl="https://invalid-url-that-will-fail.com/image.jpg"
      productName="Test produkt"
      placeholderText="Bilde kunne ikke lastes"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

