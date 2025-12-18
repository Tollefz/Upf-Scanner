/**
 * Product Screen
 * 
 * Viser produktresultat med bilde, informasjon og næringsdata
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { lookupProduct } from '../utils/product-lookup';
import type { Product, LookupResult } from '../models/Product';
import { ProductImage } from '../components/ProductImage';
import { SourceBadge } from '../components/SourceBadge';
import { AllergenChips } from '../components/AllergenChips';
import { InfoCard } from '../components/InfoCard';
import { Colors, Radius, Spacing, Typography, Shadows } from '../theme';
import { ScreenContainer, Card, PrimaryButton, Banner } from '../components';

export function ProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gtin: string }>();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Cache last loaded GTIN to avoid re-loading same product
  const lastLoadedGtinRef = React.useRef<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.gtin) {
        console.log('[ProductScreen] PRODUCT_MOUNT: No GTIN, showing error');
        setError('Ingen GTIN oppgitt');
        setLoading(false);
        return;
      }

      // If we already loaded this GTIN, don't reload
      if (lastLoadedGtinRef.current === params.gtin && result) {
        console.log('[ProductScreen] PRODUCT_MOUNT: Already loaded', params.gtin);
        setLoading(false);
        return;
      }

      console.log('[ProductScreen] PRODUCT_MOUNT: Loading', params.gtin);
      console.log('[ProductScreen] LOOKUP_START:', params.gtin, 'at', Date.now());
      
      try {
        setLoading(true);
        setError(null);
        const lookupResult = await lookupProduct(params.gtin);
        const lookupDuration = Date.now();
        console.log('[ProductScreen] LOOKUP_END:', params.gtin, 'status:', lookupResult.status, 'duration:', lookupDuration);
        
        // ROOT CAUSE FIX: Do NOT auto-navigate away from ProductScreen
        // ScannerScreen already handles navigation based on lookup result
        // ProductScreen should just display what it gets, or show error state
        if (lookupResult.status === 'not_found') {
          console.log('[ProductScreen] Product not found, showing error state (no auto-navigate)');
          setError('Produktet ble ikke funnet');
          setResult(lookupResult);
          lastLoadedGtinRef.current = params.gtin;
          // DO NOT navigate - let user use "Scan nytt produkt" button
          return;
        }
        
        setResult(lookupResult);
        lastLoadedGtinRef.current = params.gtin;
      } catch (err: any) {
        console.log('[ProductScreen] LOOKUP_ERROR:', err.message);
        setError(err.message || 'Kunne ikke hente produkt');
        setResult({
          status: 'not_found',
          sourcesUsed: [],
          error: err.message,
        });
        lastLoadedGtinRef.current = params.gtin;
        // DO NOT navigate - let user use "Scan nytt produkt" button
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    
    return () => {
      console.log('[ProductScreen] PRODUCT_UNMOUNT');
    };
  }, [params.gtin]);

  const handleScanNew = () => {
    router.back();
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.loadingContainer} padding="none">
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Henter produktinformasjon...</Text>
      </ScreenContainer>
    );
  }

  // Show error state instead of auto-navigating
  if (error || (result && result.status === 'not_found')) {
    return (
      <ScreenContainer style={styles.loadingContainer} padding="none">
        <Text style={styles.errorIcon}>📦</Text>
        <Text style={styles.errorTitle}>Produktet ble ikke funnet</Text>
        <Text style={styles.errorText}>
          {error || 'Kunne ikke hente produktinformasjon'}
        </Text>
        <PrimaryButton
          title="Scan nytt produkt"
          onPress={handleScanNew}
          size="large"
          style={{ marginTop: 24 }}
        />
      </ScreenContainer>
    );
  }

  const product = result.product;
  if (!product) {
    return null;
  }

  return (
    <ScreenContainer padding="none">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image Hero Card */}
        <Card style={styles.imageHeroCard} padding="none" shadow>
          <ProductImage
            imageUrl={product.imageUrls?.[0]}
            productName={product.title}
          />
        </Card>

        <View style={styles.contentContainer}>
          {/* Product Header */}
          {(product.title || product.brand || (product.quantity && product.unit)) && (
            <View style={styles.headerContainer}>
              {product.title && (
                <Text style={styles.title} numberOfLines={2}>
                  {product.title}
                </Text>
              )}
              {product.brand && (
                <Text style={styles.brand} numberOfLines={1}>
                  {product.brand}
                </Text>
              )}
              {product.quantity && product.unit && (
                <Text style={styles.quantity}>
                  {product.quantity} {product.unit}
                </Text>
              )}
            </View>
          )}

          {/* Source Badge */}
          <View style={styles.badgeContainer}>
            <SourceBadge
              source={product.source}
              confidence={product.sourceConfidence}
            />
          </View>

          {/* Allergens */}
          <View style={styles.section}>
            <AllergenChips
              allergens={product.allergens}
              traces={product.traces}
            />
          </View>

          {/* Ingredients */}
          {product.ingredientsText ? (
            <InfoCard title="Ingredienser" scrollable={true}>
              <Text style={styles.ingredientsText}>
                {product.ingredientsText}
              </Text>
            </InfoCard>
          ) : (
            <Banner
              message="Ingredienslisten mangler for dette produktet"
              type="warning"
              icon="ℹ️"
            />
          )}

          {/* Nutrition */}
          {product.nutrition && (
            <InfoCard title="Næringsinnhold">
              <Text style={styles.nutritionLabel}>Per 100g</Text>
              <View style={styles.nutritionList}>
                {product.nutrition.energyKcalPer100g !== undefined && (
                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionName}>Energi</Text>
                    <Text style={styles.nutritionValue}>
                      {product.nutrition.energyKcalPer100g} kcal
                    </Text>
                  </View>
                )}
                {product.nutrition.fatPer100g !== undefined && (
                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionName}>Fett</Text>
                    <Text style={styles.nutritionValue}>
                      {product.nutrition.fatPer100g.toFixed(1)} g
                    </Text>
                  </View>
                )}
                {product.nutrition.carbohydratesPer100g !== undefined && (
                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionName}>Karbohydrater</Text>
                    <Text style={styles.nutritionValue}>
                      {product.nutrition.carbohydratesPer100g.toFixed(1)} g
                    </Text>
                  </View>
                )}
                {product.nutrition.proteinsPer100g !== undefined && (
                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionName}>Protein</Text>
                    <Text style={styles.nutritionValue}>
                      {product.nutrition.proteinsPer100g.toFixed(1)} g
                    </Text>
                  </View>
                )}
                {product.nutrition.saltPer100g !== undefined && (
                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionName}>Salt</Text>
                    <Text style={styles.nutritionValue}>
                      {product.nutrition.saltPer100g.toFixed(1)} g
                    </Text>
                  </View>
                )}
              </View>
            </InfoCard>
          )}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <PrimaryButton
          title="Scan nytt produkt"
          onPress={handleScanNew}
          size="large"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom button
  },
  imageHeroCard: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
    opacity: 0.6,
  },
  errorTitle: {
    ...Typography.h1,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  headerContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  brand: {
    ...Typography.subtitle,
    marginBottom: Spacing.xs,
  },
  quantity: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  badgeContainer: {
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.md,
  },
  ingredientsText: {
    ...Typography.body,
    lineHeight: 24,
  },
  nutritionLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    fontWeight: '500',
  },
  nutritionList: {
    // Nutrition list styles
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  nutritionName: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  nutritionValue: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    ...Shadows.button,
  },
});

