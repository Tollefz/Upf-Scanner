/**
 * Product Detail Screen Component
 * 
 * Viser produktinformasjon i et varmt, forbrukervennlig design
 * 
 * Designprinsipper:
 * - Lys off-white bakgrunn
 * - Myke runde kort
 * - Varme mat-farger (ingen tech-blått)
 * - Tydelig hierarki
 * - Trygg og vennlig følelse
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ProductImage } from './ProductImage';
import { ProductHeader } from './ProductHeader';
import { SourceBadge } from './SourceBadge';
import { AllergenSection } from './AllergenSection';
import { IngredientsSection } from './IngredientsSection';
import { NutritionOverview } from './NutritionOverview';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { EmptyState } from './EmptyState';

// Design system colors
const COLORS = {
  background: '#F8FAF9',
  primary: '#4CAF50',
  secondary: '#FFB74D',
  textPrimary: '#2E2E2E',
  textSecondary: '#6B6B6B',
  cardBackground: '#FFFFFF',
  divider: '#E6ECE9',
};

// Product data interface
export interface ProductDetailData {
  gtin: string;
  title?: string;
  brand?: string;
  image_url?: string;
  source: string;
  source_confidence: number;
  allergens?: string[];
  traces?: string[];
  ingredients?: string;
  nutrition?: {
    energy_kcal_per_100g?: number;
    fat_per_100g?: number;
    carbohydrates_per_100g?: number;
    proteins_per_100g?: number;
    salt_per_100g?: number;
  };
}

interface ProductDetailScreenProps {
  product?: ProductDetailData;
  loading?: boolean;
  error?: string;
}

/**
 * Main Product Detail Screen
 * 
 * Layout struktur (top to bottom):
 * 1. Product Image (full width, aspect ratio 1:1)
 * 2. Product Header (title, brand, source badge)
 * 3. Confidence Indicator (høy/middels/lav)
 * 4. Allergen Section (hvis allergener finnes)
 * 5. Nutrition Overview (kompakt visning)
 * 6. Ingredients Section (scrollbar hvis lang)
 */
export function ProductDetailScreen({
  product,
  loading,
  error,
}: ProductDetailScreenProps) {
  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Henter produkt...</Text>
        </View>
      </View>
    );
  }

  // Error / Not found state
  if (error || !product) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Fant ikke produktet"
          message="Vi kunne ikke finne dette produktet i våre databaser."
          suggestion="Prøv å scanne strekkoden på nytt, eller legg det til manuelt."
        />
      </View>
    );
  }

  // Map source confidence to label
  const confidenceLabel = 
    product.source_confidence >= 80 ? 'Høy' :
    product.source_confidence >= 50 ? 'Middels' :
    'Lav';

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Product Image - Top of screen, full width */}
      <ProductImage 
        imageUrl={product.image_url}
        productName={product.title}
      />

      {/* 2. Product Header */}
      <View style={styles.headerSection}>
        <ProductHeader
          title={product.title || 'Navn ikke tilgjengelig'}
          brand={product.brand}
        />
        
        {/* Source Badge */}
        <View style={styles.badgeContainer}>
          <SourceBadge source={product.source} />
          <ConfidenceIndicator confidence={confidenceLabel} />
        </View>
      </View>

      {/* 3. Allergen Section - Prominent placement */}
      {product.allergens && product.allergens.length > 0 && (
        <AllergenSection allergens={product.allergens} traces={product.traces} />
      )}

      {/* 4. Nutrition Overview - Compact */}
      {product.nutrition && (
        <NutritionOverview nutrition={product.nutrition} />
      )}

      {/* 5. Ingredients Section - Scrollable if long */}
      {product.ingredients && (
        <IngredientsSection ingredients={product.ingredients} />
      )}

      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  bottomSpacing: {
    height: 32,
  },
});

