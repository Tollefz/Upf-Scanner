/**
 * Card Component
 * 
 * Mykt runde kort med subtil skygge
 */

import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Shadows } from '../theme';

export interface CardProps extends ViewProps {
  /** Padding inside card */
  padding?: keyof typeof Spacing;
  /** Whether to apply shadow */
  shadow?: boolean;
  /** Custom background color */
  backgroundColor?: string;
}

export function Card({
  children,
  style,
  padding = 'md',
  shadow = true,
  backgroundColor = Colors.cardBackground,
  ...props
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding: Spacing[padding] },
        { backgroundColor },
        shadow && Shadows.card,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    backgroundColor: Colors.cardBackground,
  },
});

