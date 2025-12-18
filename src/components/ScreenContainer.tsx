/**
 * Screen Container Component
 * 
 * Standard container for screens med konsistent styling
 */

import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../theme';

export interface ScreenContainerProps extends ViewProps {
  /** Padding variant */
  padding?: keyof typeof Spacing | 'none';
  /** Whether to apply safe area padding */
  safeArea?: boolean;
}

export function ScreenContainer({
  children,
  style,
  padding = 'lg',
  safeArea = false,
  ...props
}: ScreenContainerProps) {
  const paddingValue = padding === 'none' ? 0 : Spacing[padding as keyof typeof Spacing];

  return (
    <View
      style={[
        styles.container,
        { padding: paddingValue },
        safeArea && styles.safeArea,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
});

