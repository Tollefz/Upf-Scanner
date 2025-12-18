import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '@/src/theme';

interface HeroHeaderProps {
  appName?: string;
  tagline?: string[];
}

/**
 * HeroHeader - ScandSund-style hero section
 * 
 * Displays app name and tagline at the top of the scan screen.
 * Pure presentational component - no logic.
 */
export const HeroHeader: React.FC<HeroHeaderProps> = ({
  appName = 'ScandSund',
  tagline = ['Skann strekkoder.', 'Unngå allergener.'],
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.appName}>{appName}</Text>
      {tagline.map((line, index) => (
        <Text key={index} style={styles.tagline}>
          {line}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '400',
    lineHeight: 22,
  },
});

