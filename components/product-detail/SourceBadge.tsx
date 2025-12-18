/**
 * Source Badge Component
 * 
 * Viser datakilde (GS1 / Butikk / Open Food Facts)
 * - Liten, diskret badge
 * - Nøytral farge
 * - Rundt design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  background: '#F0F4F2',
  text: '#5A7A6A',
};

interface SourceBadgeProps {
  source: string;
}

/**
 * Maps source name to display name
 */
function getSourceDisplayName(source: string): string {
  const sourceMap: Record<string, string> = {
    'gs1-trade-exact': 'GS1',
    'GS1 Trade Exact': 'GS1',
    'sallinggroup': 'Salling Group',
    'Salling Group': 'Salling Group',
    'rema1000': 'REMA 1000',
    'REMA 1000': 'REMA 1000',
    'coop': 'Coop',
    'Coop': 'Coop',
    'openfoodfacts': 'Open Food Facts',
    'Open Food Facts': 'Open Food Facts',
  };

  // Handle combined sources (e.g., "GS1 + Open Food Facts")
  if (source.includes('+')) {
    return source.split('+').map(s => getSourceDisplayName(s.trim())).join(' + ');
  }

  return sourceMap[source] || source;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{getSourceDisplayName(source)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
});

