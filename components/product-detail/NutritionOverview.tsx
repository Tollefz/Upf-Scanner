/**
 * Nutrition Overview Component
 * 
 * Viser enkel næringsoversikt
 * - Kompakt design
 * - Viktigste næringsstoffer
 * - Per 100g
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  cardBackground: '#FFFFFF',
  textPrimary: '#2E2E2E',
  textSecondary: '#6B6B6B',
  divider: '#E6ECE9',
};

interface NutritionOverviewProps {
  nutrition: {
    energy_kcal_per_100g?: number;
    fat_per_100g?: number;
    carbohydrates_per_100g?: number;
    proteins_per_100g?: number;
    salt_per_100g?: number;
  };
}

export function NutritionOverview({ nutrition }: NutritionOverviewProps) {
  const items = [
    { label: 'Energi', value: nutrition.energy_kcal_per_100g, unit: 'kcal' },
    { label: 'Fett', value: nutrition.fat_per_100g, unit: 'g' },
    { label: 'Karbohydrater', value: nutrition.carbohydrates_per_100g, unit: 'g' },
    { label: 'Protein', value: nutrition.proteins_per_100g, unit: 'g' },
    { label: 'Salt', value: nutrition.salt_per_100g, unit: 'g' },
  ].filter(item => item.value !== undefined);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Næringsinnhold</Text>
      <View style={styles.card}>
        <Text style={styles.per100g}>Per 100g</Text>
        {items.map((item, index) => (
          <View key={item.label}>
            <View style={styles.row}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>
                {item.value?.toFixed(1)} {item.unit}
              </Text>
            </View>
            {index < items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
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
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  per100g: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
});

