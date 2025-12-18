/**
 * Scan Screen
 * 
 * Viser kamera med barcode scanning og navigerer til ProductScreen når en GTIN skannes
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { validateGTIN } from '../utils/gtin';
import { syncUnknownReports } from '../utils/unknownReportSender';
import { Colors, Radius, Spacing, Typography, Shadows } from '../theme';

const SCAN_COOLDOWN_MS = 2000; // 2 seconds debounce

export function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanningEnabled, setScanningEnabled] = useState(true);
  const lastScannedCode = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);

  // Reset scanning when screen comes into focus
  useEffect(() => {
    setScanningEnabled(true);
  }, []);

  // Sync pending reports when screen gets focus
  useFocusEffect(
    React.useCallback(() => {
      // Sync in background (don't block UI)
      syncUnknownReports(10).catch(error => {
        console.error('[ScanScreen] Error syncing reports:', error);
      });
    }, [])
  );

  const handleBarcodeScanned = ({ data, type }: BarcodeScanningResult) => {
    // Debounce: Ignore if scanned too recently
    const now = Date.now();
    if (now - lastScanTime.current < SCAN_COOLDOWN_MS) {
      return;
    }

    // Ignore if same code scanned again
    if (lastScannedCode.current === data) {
      return;
    }

    // Normalize GTIN (remove spaces, hyphens)
    const normalized = data.replace(/[\s-]/g, '').trim();

    // Validate GTIN
    const validation = validateGTIN(normalized);
    if (!validation.ok || !validation.normalized) {
      // Invalid GTIN - log and continue scanning
      console.warn('Invalid GTIN scanned:', data, validation.error);
      return;
    }

    // Valid GTIN - disable scanning and navigate
    const validGTIN = validation.normalized;
    lastScannedCode.current = validGTIN;
    lastScanTime.current = now;
    setScanningEnabled(false);

    // Navigate to ProductScreen
    router.push({
      pathname: '/product',
      params: { gtin: validGTIN },
    });
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      // Permission denied - user needs to enable in settings
    }
  };

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  // Loading permission state
  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Ber om kameratillatelse...</Text>
      </View>
    );
  }

  // Permission denied state
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Kameratillatelse nødvendig</Text>
          <Text style={styles.permissionText}>
            Appen trenger tilgang til kameraet for å skanne strekkoder på produkter.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleRequestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Gi tillatelse</Text>
            </TouchableOpacity>
            {!permission.canAskAgain && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleOpenSettings}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Åpne innstillinger
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Camera view with scanning
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'codabar',
            'code128',
            'code39',
            'code93',
            'itf14', // GTIN-14
          ],
        }}
        // DISABLED: Scanning should only be handled by app/(tabs)/index.tsx
        // This component is kept for backwards compatibility but scanning is disabled
        onBarcodeScanned={undefined}
      >
        {/* Overlay with scan frame */}
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={styles.overlayTop} />
          
          {/* Middle section with scan frame */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrameContainer}>
              <View style={styles.scanFrame}>
                {/* Corner indicators */}
                <View style={styles.corner} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
            </View>
            <View style={styles.overlaySide} />
          </View>
          
          {/* Bottom overlay */}
          <View style={styles.overlayBottom}>
            <Text style={styles.instructionsText}>
              Scan strekkoden på produktet
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
    opacity: 0.6,
  },
  permissionTitle: {
    ...Typography.h1,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    ...Shadows.button,
  },
  buttonSecondary: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  buttonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    color: Colors.textPrimary,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: 300, // Scan frame area
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scanFrameContainer: {
    width: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: '100%',
    height: '80%',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
    borderWidth: 3,
    top: -3,
    left: -3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: Radius.sm,
  },
  cornerTopRight: {
    top: -3,
    right: -3,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderTopRightRadius: Radius.sm,
    borderTopLeftRadius: 0,
  },
  cornerBottomLeft: {
    top: 'auto',
    bottom: -3,
    left: -3,
    borderTopWidth: 0,
    borderBottomWidth: 3,
    borderBottomLeftRadius: Radius.sm,
    borderTopLeftRadius: 0,
  },
  cornerBottomRight: {
    top: 'auto',
    right: -3,
    bottom: -3,
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: Radius.sm,
    borderTopLeftRadius: 0,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  instructionsText: {
    ...Typography.body,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
