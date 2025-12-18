/**
 * Source Badge Component
 * 
 * Viser datakilde og kvalitetsindikator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../theme';

interface SourceBadgeProps {
  source: string;
  confidence: number;
}

/**
 * Maps source confidence to quality label
 */
function getConfidenceLabel(confidence: number): 'Høy' | 'Middels' | 'Lav' {
  if (confidence >= 80) return 'Høy';
  if (confidence >= 50) return 'Middels';
  return 'Lav';
}

/**
 * Gets color for confidence label
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return Colors.success;
  if (confidence >= 50) return Colors.warning;
  return Colors.error;
}

export function SourceBadge({ source, confidence }: SourceBadgeProps) {
  const qualityLabel = getConfidenceLabel(confidence);
  const qualityColor = getConfidenceColor(confidence);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.sourceText}>Kilde: {source}</Text>
      </View>
      <View style={[styles.qualityBadge, { backgroundColor: qualityColor }]}>
        <Text style={styles.qualityText}>Kvalitet: {qualityLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#F0F4F2',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
  },
  sourceText: {
    ...Typography.caption,
    fontWeight: '500',
    color: '#5A7A6A',
  },
  qualityBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
  },
  qualityText: {
    ...Typography.caption,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

