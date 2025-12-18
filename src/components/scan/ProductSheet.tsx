import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AllergenChip {
  label: string;
  icon?: string;
}

type ProductSheetMode = 'product' | 'not_found' | 'error';

interface ProductSheetProps {
  mode: ProductSheetMode;
  // Product mode
  productName?: string;
  productImage?: string;
  allergens?: AllergenChip[];
  ingredientsText?: string;
  upfScore?: { score: number; level: "Grønn" | "Gul" | "Rød"; signals: Array<{ label: string; match: string }> };
  // Not found mode
  gtin?: string;
  onAddInfo?: () => void;
  // Error mode
  errorMessage?: string;
  onRetry?: () => void;
  // Common
  onClose: () => void;
  isDark?: boolean;
}

/**
 * ProductSheet - ScandSund-style product result display
 * 
 * Bottom sheet / card showing product information, not found, or error states.
 * Pure presentational component.
 */
export const ProductSheet: React.FC<ProductSheetProps> = ({
  mode,
  productName,
  productImage,
  allergens = [],
  ingredientsText,
  upfScore,
  gtin,
  onAddInfo,
  errorMessage,
  onRetry,
  onClose,
  isDark = false,
}) => {
  const insets = useSafeAreaInsets();

  // Debug logging
  React.useEffect(() => {
    if (__DEV__) {
      console.log('[ProductSheet] SHEET_VISIBLE true, mode:', mode, 'productName:', productName);
    }
    return () => {
      if (__DEV__) {
        console.log('[ProductSheet] SHEET_VISIBLE false');
      }
    };
  }, [mode, productName]);

  const renderContent = () => {
    if (mode === 'not_found') {
      return (
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundTitle, { color: isDark ? '#fff' : Colors.textPrimary }]}>
            Fant ikke produktet
          </Text>
          {gtin && (
            <Text style={[styles.notFoundGtin, { color: isDark ? '#ccc' : Colors.textSecondary }]}>
              GTIN: {gtin}
            </Text>
          )}
          {onAddInfo && (
            <TouchableOpacity
              style={styles.addInfoButton}
              onPress={onAddInfo}
              activeOpacity={0.7}
            >
              <Text style={styles.addInfoButtonText}>Legg til info</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (mode === 'error') {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, { color: isDark ? '#fff' : Colors.textPrimary }]}>
            Feil
          </Text>
          <Text style={[styles.errorMessage, { color: isDark ? '#ccc' : Colors.textSecondary }]}>
            {errorMessage || 'En feil oppstod'}
          </Text>
          {onRetry && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Prøv igjen</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Product mode
    return (
      <>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {productImage ? (
            <Image
              source={{ uri: productImage }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>📦</Text>
            </View>
          )}
        </View>

        {/* Product Name */}
        {productName && (
          <Text style={[styles.productName, { color: isDark ? '#fff' : Colors.textPrimary }]}>
            {productName}
          </Text>
        )}

        {/* Allergen Section */}
        {allergens.length > 0 && (
          <View style={styles.allergenSection}>
            <Text style={[styles.allergenSectionTitle, { color: isDark ? '#fff' : Colors.textPrimary }]}>
              ALLERGENER
            </Text>
            <Text style={[styles.allergenContainsText, { color: isDark ? '#ccc' : Colors.textSecondary }]}>
              Dette produktet inneholder <Text style={styles.allergenBoldText}>
                {allergens.map(a => a.label.toLowerCase()).join(', ')}
              </Text>.
            </Text>
            <View style={styles.allergenChipsContainer}>
              {allergens.map((allergen, index) => (
                <View key={index} style={styles.allergenChip}>
                  {allergen.icon && (
                    <Text style={styles.allergenChipIcon}>{allergen.icon}</Text>
                  )}
                  <Text style={styles.allergenChipText}>{allergen.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* UPF Score */}
        {upfScore && (
          <View style={styles.upfSection}>
            <Text style={[styles.upfTitle, { color: isDark ? '#fff' : Colors.textPrimary }]}>
              Ultraprosessert-score
            </Text>
            <View style={[
              styles.upfScoreBox,
              { backgroundColor: upfScore.level === 'Rød' ? '#ff4444' : upfScore.level === 'Gul' ? '#ffaa00' : '#44ff44' }
            ]}>
              <Text style={styles.upfLevel}>{upfScore.level}</Text>
              <Text style={styles.upfScoreValue}>{upfScore.score}/100</Text>
            </View>
            {upfScore.signals.length > 0 && (
              <View style={styles.upfSignals}>
                {upfScore.signals.slice(0, 5).map((signal, index) => (
                  <Text key={index} style={[styles.upfSignal, { color: isDark ? '#ccc' : Colors.textSecondary }]}>
                    • {signal.label}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Ingredients */}
        {ingredientsText && (
          <View style={styles.ingredientsSection}>
            <Text style={[styles.ingredientsTitle, { color: isDark ? '#fff' : Colors.textPrimary }]}>
              Ingredienser
            </Text>
            <View style={[styles.ingredientsBox, { backgroundColor: isDark ? '#2a2a2a' : Colors.background }]}>
              <Text style={[styles.ingredientsText, { color: isDark ? '#fff' : Colors.textPrimary }]}>
                {ingredientsText}
              </Text>
            </View>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* Backdrop - tap to close */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />
      
      {/* Sheet container - interactive */}
      <View 
        style={[
          styles.container,
          { 
            paddingBottom: insets.bottom + Spacing.md,
            backgroundColor: isDark ? '#1a1a1a' : '#fff'
          }
        ]}
        pointerEvents="auto"
      >
        <View style={styles.handleBar} />
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.closeButtonText}>Lukk</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    ...(Platform.OS === 'android' && { elevation: 9999 }),
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 260,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
    backgroundColor: Colors.cardBackground,
    ...Shadows.modal,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: Colors.divider,
    borderRadius: Radius.round,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  notFoundContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  notFoundTitle: {
    ...Typography.h2,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  notFoundGtin: {
    ...Typography.body,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  addInfoButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    ...Shadows.button,
  },
  addInfoButtonText: {
    ...Typography.button,
    color: Colors.textOnPrimary,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  errorTitle: {
    ...Typography.h2,
    marginBottom: Spacing.md,
    textAlign: 'center',
    color: Colors.error,
  },
  errorMessage: {
    ...Typography.body,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    ...Shadows.button,
  },
  retryButtonText: {
    ...Typography.button,
    color: Colors.textOnPrimary,
  },
  ingredientsSection: {
    marginBottom: Spacing.xl,
  },
  ingredientsTitle: {
    ...Typography.title,
    marginBottom: Spacing.md,
  },
  ingredientsBox: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  ingredientsText: {
    ...Typography.bodySmall,
  },
  upfSection: {
    marginBottom: Spacing.xl,
  },
  upfTitle: {
    ...Typography.title,
    marginBottom: Spacing.md,
  },
  upfScoreBox: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  upfLevel: {
    ...Typography.title,
    color: Colors.textOnPrimary,
    marginBottom: Spacing.xs,
  },
  upfScoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  upfSignals: {
    marginTop: Spacing.sm,
  },
  upfSignal: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: Spacing.xl,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
    ...Shadows.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 64,
    opacity: 0.3,
  },
  productName: {
    ...Typography.h2,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  allergenSection: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  allergenSectionTitle: {
    ...Typography.title,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  allergenContainsText: {
    ...Typography.body,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  allergenBoldText: {
    fontWeight: '700',
  },
  allergenChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: Spacing.sm,
  },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
    gap: 6,
  },
  allergenChipIcon: {
    fontSize: 16,
  },
  allergenChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  closeButton: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    backgroundColor: Colors.cardBackground,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.card,
  },
  closeButtonText: {
    ...Typography.button,
    color: Colors.textPrimary,
  },
});

