import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/src/theme';

interface CameraOverlayProps {
  showScanLine?: boolean;
}

/**
 * CameraOverlay - ScandSund-style scan line overlay
 * 
 * Displays a subtle green scan line over the camera view.
 * Does NOT capture touch events - purely visual.
 */
export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  showScanLine = true,
}) => {
  return (
    <View style={styles.container} pointerEvents="none">
      {showScanLine && <View style={styles.scanLine} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 5,
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
});

