import { useColorScheme } from "@/hooks/use-color-scheme";
import { useScannerController } from "@/hooks/useScannerController";
import { CameraOverlay, HeroHeader, ProductSheet } from "@/src/components/scan";
import { Colors, Radius, Spacing, Typography } from "@/src/theme";
import { checkAllergies } from "@/utils/allergy-check";
import { getAllergyPreferences, type AllergyPreferences } from "@/utils/storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

// Minimal logging for screen lifecycle
function logScreenEvent(event: string) {
  if (__DEV__) {
    console.log(`[SCREEN] ${new Date().toISOString()} ${event}`);
  }
}

// UPF scoring function (simplified - keep existing logic)
function upfScore(ingredientsText: string): { score: number; level: "Grønn" | "Gul" | "Rød"; signals: Array<{ label: string; match: string }> } {
  // Simplified version - you can keep your existing upfScore logic
  const text = ingredientsText.toLowerCase();
  let score = 0;
  const signals: Array<{ label: string; match: string }> = [];

  // Count E-numbers
  const eMatches = text.match(/\be\d{3,4}[a-z]?\b/gi) || [];
  if (eMatches.length > 0) {
    score += eMatches.length * 3;
    signals.push({ label: `E-numre (${eMatches.length})`, match: eMatches.slice(0, 3).join(', ') });
  }

  // Check for common additives
  if (/\baroma\b/i.test(text)) {
    score += 18;
    signals.push({ label: "Aroma", match: "Aroma" });
  }
  if (/\bemulgator\b/i.test(text)) {
    score += 12;
    signals.push({ label: "Emulgator", match: "Emulgator" });
  }

  score = Math.max(0, Math.min(100, score));
  const level: "Grønn" | "Gul" | "Rød" = score >= 40 ? "Rød" : score >= 15 ? "Gul" : "Grønn";

  return { score, level, signals };
}

export default function Index() {
  const [permission, requestPermission] = useCameraPermissions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Allergy preferences
  const [allergyPrefs, setAllergyPrefs] = useState<AllergyPreferences>({
    gluten: false,
    melk: false,
    egg: false,
    soya: false,
    nøtter: false,
    peanøtter: false,
    sesam: false,
    fisk: false,
    skalldyr: false,
    sennep: false,
  });

  // Load allergy preferences
  useEffect(() => {
    getAllergyPreferences().then(setAllergyPrefs);
  }, []);

  // Scanner controller
  const {
    isScanningEnabled,
    isProcessing,
    error,
    outcome,
    resetScanner,
    resumeScanning,
    retryLastScan,
    onBarcodeScanned,
  } = useScannerController({
    lookupTimeoutMs: 12000, // 12s
    autoResumeOnError: true,
    enableLogging: __DEV__,
  });

  // Screen lifecycle
  useEffect(() => {
    logScreenEvent('MOUNTED');
    return () => {
      logScreenEvent('UNMOUNTED');
    };
  }, []);

  // Handle barcode scan from camera
  // CRITICAL: This handler must ALWAYS be defined to prevent camera remounting
  // Scanning is controlled internally via isScanningEnabled state in the hook
  const handleBarcodeScanned = useCallback((event: { data: string; symbology?: string }) => {
    // onBarcodeScanned from hook always exists and handles isScanningEnabled check internally
    if (onBarcodeScanned) {
      onBarcodeScanned(event.data);
    }
  }, [onBarcodeScanned]);

  // Determine if ProductSheet should be visible
  const showProductSheet = outcome !== null;
  
  // Debug logging
  useEffect(() => {
    if (__DEV__) {
      console.log('[UI] showProductSheet:', showProductSheet, 'outcome:', outcome);
    }
  }, [showProductSheet, outcome]);
  
  const productSheetMode = useMemo(() => {
    if (!outcome) return 'product';
    if (outcome.kind === 'product') return 'product';
    if (outcome.kind === 'not_found') return 'not_found';
    if (outcome.kind === 'error') return 'error';
    return 'product';
  }, [outcome]);

  // Prepare product data for ProductSheet
  const productData = useMemo(() => {
    if (outcome?.kind === 'product') {
      const product = outcome.product;
      const ingredientsText = product.ingredientsText || '';
      
      // Calculate UPF score
      const upf = ingredientsText ? upfScore(ingredientsText) : null;

      // Convert Product to OffProduct format for checkAllergies
      const offProduct = {
        product_name: product.name || undefined,
        brands: product.brand || undefined,
        image_url: product.imageUrl || undefined,
        ingredients_text: ingredientsText || undefined,
        allergens: product.allergens?.join(', ') || undefined,
        allergens_tags: product.allergens || undefined,
      };

      // Check allergies
      const allergyResult = ingredientsText
        ? checkAllergies(offProduct, ingredientsText, allergyPrefs)
        : { status: 'no_ingredients' as const, containsHits: [], mayContainHits: [] };

      // Convert allergens to chips
      const allergenChips = (product.allergens || []).map(allergen => ({
        label: allergen,
      }));

      return {
        name: product.name || 'Navn ikke tilgjengelig',
        imageUrl: product.imageUrl || undefined,
        allergens: allergenChips,
        ingredientsText,
        upf,
        allergyResult,
      };
    }
    return null;
  }, [outcome, allergyPrefs]);

  // Handle close ProductSheet
  const handleCloseSheet = useCallback(() => {
    resetScanner('close_product_sheet');
    resumeScanning();
  }, [resetScanner, resumeScanning]);

  // Handle add info (placeholder)
  const handleAddInfo = useCallback(() => {
    // TODO: Navigate to add info screen
    console.log('Add info clicked');
  }, []);

  // Handle retry
  const handleRetry = useCallback(() => {
    retryLastScan();
  }, [retryLastScan]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Laster kamera-tillatelse...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Kamera-tillatelse kreves</Text>
        <Text style={styles.permissionSubtext} onPress={requestPermission}>
          Trykk for å be om tillatelse
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View - ALWAYS mounted, never conditionally rendered */}
      {/* Scanning is controlled via handleBarcodeScanned internal check, not by toggling the prop */}
      <View style={styles.cameraWrapper}>
          <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
        />
          </View>
          
      {/* Hero Header */}
      <HeroHeader appName="ScandSund" tagline={['Skann strekkoder.', 'Unngå allergener.']} />

      {/* Camera Overlay */}
      <CameraOverlay showScanLine={isScanningEnabled} />

      {/* Loading Indicator (when processing, but not showing result) */}
      {isProcessing && !showProductSheet && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Laster...</Text>
              </View>
      )}

      {/* Debug Badge (dev only) */}
      {__DEV__ && outcome && (
        <View style={styles.debugBadge}>
          <Text style={styles.debugBadgeText}>
            Outcome: {outcome.kind}
              </Text>
            </View>
          )}

      {/* Product Sheet */}
      {showProductSheet && (
        <ProductSheet
          mode={productSheetMode}
          productName={productData?.name}
          productImage={productData?.imageUrl}
          allergens={productData?.allergens}
          ingredientsText={productData?.ingredientsText}
          upfScore={productData?.upf || undefined}
          gtin={outcome?.kind === 'not_found' ? outcome.gtin : undefined}
          onAddInfo={productSheetMode === 'not_found' ? handleAddInfo : undefined}
          errorMessage={outcome?.kind === 'error' ? outcome.error.message : undefined}
          onRetry={productSheetMode === 'error' ? handleRetry : undefined}
          onClose={handleCloseSheet}
          isDark={isDark}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cameraWrapper: {
    flex: 1,
    // Ensure camera doesn't cover overlay
    zIndex: 1,
  },
  camera: {
    flex: 1,
  },
  permissionText: {
    ...Typography.h2,
    textAlign: 'center',
    marginTop: Spacing.xxl,
    color: Colors.textPrimary,
  },
  permissionSubtext: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.md,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.sm,
    color: Colors.textPrimary,
  },
  debugBadge: {
    position: 'absolute',
    top: 120,
    left: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    zIndex: 10000,
  },
  debugBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
