/**
 * Info Card Component
 * 
 * Gjenbrukbar kortkomponent for å vise informasjon
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '../theme';

interface InfoCardProps {
  title?: string;
  children: React.ReactNode;
  scrollable?: boolean;
}

export function InfoCard({ title, children, scrollable = false }: InfoCardProps) {
  const content = scrollable ? (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={true}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.md,
  },
  content: {
    // Content styles
  },
  scrollContent: {
    maxHeight: 300,
  },
});

