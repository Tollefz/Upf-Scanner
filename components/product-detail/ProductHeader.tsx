/**
 * Product Header Component
 * 
 * Viser produktnavn og merke
 * - Produktnavn: 20pt, semi-bold
 * - Merke: 14pt, grå tekst
 * - God spacing mellom elementer
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  textPrimary: '#2E2E2E',
  textSecondary: '#6B6B6B',
};

interface ProductHeaderProps {
  title: string;
  brand?: string;
}

export function ProductHeader({ title, brand }: ProductHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {brand && (
        <Text style={styles.brand} numberOfLines={1}>
          {brand}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 28,
    marginBottom: 6,
  },
  brand: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

