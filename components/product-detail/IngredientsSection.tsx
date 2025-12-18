/**
 * Ingredients Section Component
 * 
 * Viser ingrediensliste
 * - Scrollbar hvis lang
 * - God lesbarhet
 * - Mykt kort-design
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const COLORS = {
  cardBackground: '#FFFFFF',
  background: '#F8FAF9',
  textPrimary: '#2E2E2E',
};

interface IngredientsSectionProps {
  ingredients: string;
}

export function IngredientsSection({ ingredients }: IngredientsSectionProps) {
  if (!ingredients) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ingredienser</Text>
      <View style={styles.card}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.text}>{ingredients}</Text>
        </ScrollView>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  scrollView: {
    maxHeight: 300,
  },
  scrollContent: {
    padding: 20,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
});

