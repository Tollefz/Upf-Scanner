/**
 * Product Image Component
 * 
 * Viser produktbilde med lazy loading, caching og fallback
 * 
 * Features:
 * - Støtter flere bilder (prioriterer front-of-pack)
 * - Lazy loading (expo-image)
 * - Automatisk caching (expo-image)
 * - Fallback til nøytral placeholder
 * - Error handling
 * - Loading state
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { normalizeProductImages, selectBestImage, type ProductImageSource } from '@/utils/product-images';

const COLORS = {
  background: '#F8FAF9',
  cardBackground: '#FFFFFF',
  textSecondary: '#6B6B6B',
  primary: '#4CAF50',
};

interface ProductImageProps {
  /**
   * Enkel bilde-URL (bakoverkompatibilitet)
   */
  imageUrl?: string;
  
  /**
   * Flere bilder med prioritet (anbefalt)
   */
  images?: ProductImageSource[];
  
  /**
   * Alternativ: Raw data fra ulike kilder
   */
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
  
  /**
   * Custom placeholder content
   */
  placeholderIcon?: string;
  placeholderText?: string;
}

export function ProductImage({
  imageUrl,
  images,
  imageData,
  productName,
  placeholderIcon = '📦',
  placeholderText = 'Ingen bilde tilgjengelig',
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Bestem hvilket bilde som skal vises
  const bestImageUrl = useMemo(() => {
    // Prioritet 1: images array (hvis gitt)
    if (images && images.length > 0) {
      return selectBestImage(images);
    }

    // Prioritet 2: imageData (normaliser til images array)
    if (imageData) {
      const normalizedImages = normalizeProductImages(imageData);
      if (normalizedImages.length > 0) {
        return selectBestImage(normalizedImages);
      }
    }

    // Prioritet 3: imageUrl (bakoverkompatibilitet)
    return imageUrl || null;
  }, [images, imageData, imageUrl]);

  // Reset error state når bilde-URL endres
  React.useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [bestImageUrl]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <View style={styles.container}>
      {bestImageUrl && !hasError ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: bestImageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={200}
            cachePolicy="memory-disk"
            priority="high"
            accessibilityLabel={productName ? `Bilde av ${productName}` : 'Produktbilde'}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
          />
          
          {/* Loading overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
        </View>
      ) : (
        <Placeholder
          icon={placeholderIcon}
          text={placeholderText}
        />
      )}
    </View>
  );
}

/**
 * Placeholder Component
 */
function Placeholder({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>{icon}</Text>
      <Text style={styles.placeholderText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 18,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  placeholderIcon: {
    fontSize: 64,
    opacity: 0.3,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
