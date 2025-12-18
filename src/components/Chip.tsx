/**
 * Chip Component
 * 
 * Liten status-chip for statusindikatorer
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme';

export interface ChipProps {
  /** Chip text */
  label: string;
  /** Chip variant */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning';
  /** Custom background color */
  backgroundColor?: string;
  /** Custom text color */
  textColor?: string;
}

export function Chip({
  label,
  variant = 'default',
  backgroundColor,
  textColor,
}: ChipProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { bg: Colors.primary, text: Colors.textOnPrimary };
      case 'secondary':
        return { bg: Colors.secondary, text: Colors.textPrimary };
      case 'success':
        return { bg: Colors.success, text: Colors.textOnPrimary };
      case 'warning':
        return { bg: Colors.warning, text: Colors.textPrimary };
      default:
        return { bg: Colors.cardBorder, text: Colors.textSecondary };
    }
  };

  const variantStyles = getVariantStyles();
  const bg = backgroundColor || variantStyles.bg;
  const text = textColor || variantStyles.text;

  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.round,
    alignSelf: 'flex-start',
  },
  label: {
    ...Typography.caption,
    fontWeight: '500',
  },
});

