/**
 * Secondary Button Component
 * 
 * Sekundærknapp med border eller transparent bakgrunn
 */

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme';

export interface SecondaryButtonProps extends TouchableOpacityProps {
  /** Button text */
  title: string;
  /** Size variant */
  size?: 'large' | 'medium' | 'small';
  /** Variant style */
  variant?: 'outline' | 'ghost';
}

export function SecondaryButton({
  title,
  size = 'medium',
  variant = 'ghost',
  disabled,
  style,
  ...props
}: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[size],
        variant === 'outline' && styles.outline,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      <Text
        style={[
          styles.text,
          variant === 'outline' && styles.textOutline,
          disabled && styles.textDisabled,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'transparent',
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
  outline: {
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.cardBackground,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  textOutline: {
    color: Colors.textPrimary,
  },
  textDisabled: {
    color: Colors.textTertiary,
  },
});

