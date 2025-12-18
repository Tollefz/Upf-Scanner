/**
 * Banner Component
 * 
 * Informasjonsbanner med ikon og varme farger
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme';

export interface BannerProps {
  /** Banner message */
  message: string;
  /** Banner type */
  type?: 'info' | 'warning' | 'success' | 'error';
  /** Optional icon emoji */
  icon?: string;
  /** Optional custom background color */
  backgroundColor?: string;
}

export function Banner({
  message,
  type = 'info',
  icon,
  backgroundColor,
}: BannerProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return { bg: Colors.secondary, icon: icon || '⚠️' };
      case 'success':
        return { bg: Colors.success, icon: icon || '✓' };
      case 'error':
        return { bg: Colors.error, icon: icon || '✕' };
      default:
        return { bg: Colors.info, icon: icon || 'ℹ️' };
    }
  };

  const typeStyles = getTypeStyles();
  const bgColor = backgroundColor || typeStyles.bg;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: bgColor },
      ]}
    >
      {typeStyles.icon && (
        <Text style={styles.icon}>{typeStyles.icon}</Text>
      )}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  icon: {
    fontSize: 18,
  },
  message: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    flex: 1,
  },
});

