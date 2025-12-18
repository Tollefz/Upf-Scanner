/**
 * Allergen Chips Component
 * 
 * Viser allergener som chips/badges
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../theme';

interface AllergenChipsProps {
  allergens?: string[];
  traces?: string[];
}

export function AllergenChips({ allergens, traces }: AllergenChipsProps) {
  if (!allergens && !traces) {
    return null;
  }

  return (
    <View style={styles.container}>
      {allergens && allergens.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Allergener</Text>
          <View style={styles.chipContainer}>
            {allergens.map((allergen, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{allergen}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {traces && traces.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Kan inneholde spor av</Text>
          <View style={styles.chipContainer}>
            {traces.map((trace, index) => (
              <View key={index} style={[styles.chip, styles.traceChip]}>
                <Text style={styles.chipText}>{trace}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
  },
  traceChip: {
    backgroundColor: '#FFF8E1',
  },
  chipText: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});

