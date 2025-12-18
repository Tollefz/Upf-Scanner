/**
 * Allergen Section Component
 * 
 * Viser allergener og spor
 * - Tydelig visning med varme farger
 * - Adskilt "inneholder" og "kan inneholde"
 * - Mykt kort-design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  cardBackground: '#FFFFFF',
  contains: '#FFF3E0',
  mayContain: '#FFF8E1',
  textPrimary: '#2E2E2E',
  textSecondary: '#6B6B6B',
  divider: '#E6ECE9',
};

interface AllergenSectionProps {
  allergens?: string[];
  traces?: string[];
}

export function AllergenSection({ allergens, traces }: AllergenSectionProps) {
  const hasAllergens = allergens && allergens.length > 0;
  const hasTraces = traces && traces.length > 0;

  if (!hasAllergens && !hasTraces) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Allergener</Text>

      {hasAllergens && (
        <View style={styles.allergenBox}>
          <View style={[styles.box, styles.containsBox]}>
            <Text style={styles.boxTitle}>⚠️ Inneholder</Text>
            <Text style={styles.boxText}>
              {allergens.join(', ')}
            </Text>
          </View>
        </View>
      )}

      {hasTraces && (
        <View style={styles.allergenBox}>
          <View style={[styles.box, styles.mayContainBox]}>
            <Text style={styles.boxTitle}>ℹ️ Kan inneholde spor av</Text>
            <Text style={styles.boxText}>
              {traces.join(', ')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  allergenBox: {
    marginBottom: 12,
  },
  box: {
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  containsBox: {
    backgroundColor: COLORS.contains,
  },
  mayContainBox: {
    backgroundColor: COLORS.mayContain,
  },
  boxTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  boxText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
});

