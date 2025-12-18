/**
 * Barcode Scanner - Enkel integrasjon med expo-barcode-scanner
 * 
 * Features:
 * - Ber om kameratillatelse
 * - Skanner EAN/UPC
 * - Ekstraherer GTIN
 * - Debounce for å unngå multiple scans
 * - Navigerer til ProductScreen med gtin parameter
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { validateGTIN } from '../utils/gtin';

interface BarcodeScannerSimpleProps {
  /** Callback når barcode er skannet (valgfritt, hvis ikke oppgitt navigerer automatisk) */
  onBarcodeScanned?: (gtin: string) => void;
  /** Hvor lenge skal vi vente før vi tillater ny scan (ms) */
  debounceDelay?: number;
}

/**
 * Enkel barcode scanner komponent
 */
export function BarcodeScannerSimple({
  onBarcodeScanned,
  debounceDelay = 2000, // 2 sekunder default
}: BarcodeScannerSimpleProps) {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  
  // Debounce state
  const lastScannedRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isProcessingRef = useRef(false);

  /**
   * Håndterer når en barcode er skannet
   */
  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    const now = Date.now();
    const barcode = result.data;

    // Debounce: Ignorer hvis samme kode skannes for raskt
    if (
      lastScannedRef.current === barcode &&
      now - lastScanTimeRef.current < debounceDelay
    ) {
      return;
    }

    // Ignorer hvis vi allerede prosesserer en scan
    if (isProcessingRef.current) {
      return;
    }

    // Valider GTIN
    const validation = validateGTIN(barcode);
    if (!validation.ok || !validation.normalized) {
      console.warn('Invalid GTIN:', barcode);
      return;
    }

    const gtin = validation.normalized;

    // Oppdater debounce state
    lastScannedRef.current = barcode;
    lastScanTimeRef.current = now;
    isProcessingRef.current = true;

    // Stopp scanning midlertidig
    setScanning(false);

    // Kall callback eller naviger
    if (onBarcodeScanned) {
      onBarcodeScanned(gtin);
    } else {
      // Standard: Naviger til ProductScreen
      router.push({
        pathname: '/product',
        params: { gtin },
      });
    }

    // Gjenoppta scanning etter delay
    setTimeout(() => {
      isProcessingRef.current = false;
      setScanning(true);
    }, debounceDelay);
  }, [debounceDelay, onBarcodeScanned, router]);

  /**
   * Håndterer kameratillatelse
   */
  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Kameratillatelse nødvendig',
        'Appen trenger tilgang til kameraet for å skanne strekkoder. Vennligst gi tillatelse i innstillinger.',
        [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Åpne innstillinger', onPress: () => {
            // Bruker må åpne innstillinger manuelt
            Alert.alert('Åpne innstillinger', 'Gå til Innstillinger > Appen > Kamera og slå på tilgang.');
          }},
        ]
      );
    }
  }, [requestPermission]);

  // Vis loading state mens vi sjekker tillatelse
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>Sjekker kameratillatelse...</Text>
      </View>
    );
  }

  // Vis melding hvis tillatelse ikke er gitt
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>
          Kameratillatelse er nødvendig for å skanne strekkoder
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleRequestPermission}
        >
          <Text style={styles.buttonText}>Gi kameratillatelse</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Vis scanner
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        // DISABLED: Scanning should only be handled by app/(tabs)/index.tsx
        // This component is kept for backwards compatibility but scanning is disabled
        onBarcodeScanned={undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
      >
        {/* Scan frame overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instructionText}>
            Hold strekkoden i rammen
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scanFrame: {
    width: 280,
    height: 200,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  topLeft: {
    top: -3,
    left: -3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -3,
    right: -3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -3,
    left: -3,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -3,
    right: -3,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

