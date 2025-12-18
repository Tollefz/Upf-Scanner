/**
 * Primary Button Component
 * 
 * Stor, runde, "friendly" primærknapp
 */

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { Colors, Radius, Spacing, Typography, Shadows } from '../theme';

export interface PrimaryButtonProps extends TouchableOpacityProps {
  /** Button text */
  title: string;
  /** Show loading state */
  loading?: boolean;
  /** Size variant */
  size?: 'large' | 'medium' | 'small';
}

export function PrimaryButton({
  title,
  loading = false,
  size = 'large',
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[size],
        isDisabled && styles.disabled,
        !isDisabled && Shadows.button,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.textOnPrimary} />
          <Text style={styles.text}>{title}</Text>
        </View>
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  large: {
    paddingVertical: Spacing.lg,
    minHeight: 56,
  },
  medium: {
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  small: {
    paddingVertical: Spacing.sm,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...Typography.button,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});

