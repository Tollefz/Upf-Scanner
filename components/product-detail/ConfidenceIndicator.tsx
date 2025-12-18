/**
 * Confidence Indicator Component
 * 
 * Viser source confidence (Høy / Middels / Lav)
 * - Fargekodet (grønn / gul / oransje)
 * - Rundt design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  high: '#4CAF50',
  medium: '#FFB74D',
  low: '#FF9800',
  text: '#FFFFFF',
};

interface ConfidenceIndicatorProps {
  confidence: 'Høy' | 'Middels' | 'Lav';
}

export function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  const getBackgroundColor = () => {
    switch (confidence) {
      case 'Høy':
        return COLORS.high;
      case 'Middels':
        return COLORS.medium;
      case 'Lav':
        return COLORS.low;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.text}>{confidence} pålitelighet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
});

