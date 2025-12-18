import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/src/theme';

interface BottomBarProps {
  onScanPress?: () => void;
  onInfoPress?: () => void;
  onSettingsPress?: () => void;
}

/**
 * BottomBar - ScandSund-style bottom navigation bar
 * 
 * White bottom section with rounded corners and icons.
 * Pure presentational - callbacks are optional.
 */
export const BottomBar: React.FC<BottomBarProps> = ({
  onScanPress,
  onInfoPress,
  onSettingsPress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={onScanPress}
        activeOpacity={0.7}
      >
        <Text style={styles.iconText}>📷</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={onInfoPress}
        activeOpacity={0.7}
      >
        <Text style={styles.iconText}>ℹ️</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={onSettingsPress}
        activeOpacity={0.7}
      >
        <Text style={styles.iconText}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    ...Shadows.modal,
    zIndex: 10,
  },
  iconButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
});

