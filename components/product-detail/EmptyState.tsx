/**
 * Empty State Component
 * 
 * Vises når produkt ikke finnes
 * - Vennlig melding
 * - Tydelige neste steg
 * - Trygg og støttende tone
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  background: '#F8FAF9',
  cardBackground: '#FFFFFF',
  textPrimary: '#2E2E2E',
  textSecondary: '#6B6B6B',
  primary: '#4CAF50',
};

interface EmptyStateProps {
  title: string;
  message: string;
  suggestion?: string;
}

export function EmptyState({ title, message, suggestion }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔍</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {suggestion && (
          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.background,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  suggestionBox: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 22,
    textAlign: 'center',
  },
});

