/**
 * Product Image Component
 * 
 * Viser produktbilde eller placeholder
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Radius, Shadows } from '../theme';

interface ProductImageProps {
  imageUrl?: string;
  productName?: string;
}

export function ProductImage({ imageUrl, productName }: ProductImageProps) {
  return (
    <View style={styles.container}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="contain"
          transition={200}
          accessibilityLabel={productName ? `Bilde av ${productName}` : 'Produktbilde'}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📦</Text>
          <Text style={styles.placeholderText}>
            Ingen bilde tilgjengelig
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
    backgroundColor: Colors.cardBackground,
    ...Shadows.card,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  placeholderIcon: {
    fontSize: 64,
    opacity: 0.3,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});

