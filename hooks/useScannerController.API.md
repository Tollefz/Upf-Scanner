# useScannerController - Stabil API Dokumentasjon

## 🎯 API Signatur (Produksjonsklar)

### Types

```typescript
export type ScannerErrorType = 
  | 'invalid_gtin' 
  | 'network_error' 
  | 'timeout' 
  | 'unknown'
  | 'aborted';

export interface ScannerError {
  type: ScannerErrorType;
  message: string;
  code?: string;        // GTIN that caused the error
  timestamp?: number;   // When error occurred
}

export type BarcodeType = 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' | 'UNKNOWN';

export interface UseScannerControllerOptions {
  onBarcodeScanned?: (barcode: string, barcodeType: BarcodeType) => Promise<void>;
  debounceMs?: number;              // Default: 800
  lookupTimeoutMs?: number;         // Default: 12000
  safetyTimeoutMs?: number;         // Default: 15000
  autoResumeOnError?: boolean;       // Default: false
  enableLogging?: boolean;          // Default: __DEV__
}

export interface UseScannerControllerReturn {
  // ========== STATE (Read-only) ==========
  isScanningEnabled: boolean;
  isProcessing: boolean;
  error: ScannerError | null;
  lastScannedCode: string | null;
  currentBarcodeType: BarcodeType | null;
  
  // ========== ACTIONS (Imperative) ==========
  pauseScanning: () => void;
  resumeScanning: () => void;
  resetScanner: (reason?: string) => void;
  clearError: () => void;
  retryLastScan: () => void;
  
  // ========== HANDLER (For CameraView) ==========
  onBarcodeScanned: ((barcode: string) => void) | undefined;
}
```

## ✅ Hvorfor dette API-et er stabilt

### 1. **Separasjon av Concerns**
- **State**: Read-only state for UI (reactive)
- **Actions**: Imperative actions for UI (explicit control)
- **Handler**: Direct handler for CameraView (automatic)

### 2. **Idempotent Lock Management**
- Lock settes kun ett sted
- Lock resettes i ALLE exit-paths (finally, errors, timeouts, abort, focus, background)
- Safety timeout (15s) garanterer reset

### 3. **Alle Timeouts i Refs**
- Ingen memory leaks
- Ryddes opp før nye settes
- Cleanup ved unmount

### 4. **Livssyklus-Aware**
- Automatisk reset ved focus/blur
- Automatisk reset ved background/foreground
- Cleanup ved unmount

### 5. **Type-Safe**
- Full TypeScript support
- Tydelige typer for alle states
- Ingen `any` types

### 6. **Produksjonsklar**
- Omfattende logging (kan skrus av)
- Error handling med retry
- Auto-resume option
- Fremtidsrettet (lett å utvide)

## 📝 Eksempel på bruk

```typescript
import { useScannerController } from '@/hooks/useScannerController';
import { CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';

export function ScanScreen() {
  const router = useRouter();
  
  const {
    // State
    isScanningEnabled,
    isProcessing,
    error,
    lastScannedCode,
    currentBarcodeType,
    
    // Actions
    pauseScanning,
    resumeScanning,
    resetScanner,
    clearError,
    retryLastScan,
    
    // Handler
    onBarcodeScanned,
  } = useScannerController({
    onBarcodeScanned: async (barcode, barcodeType) => {
      // Your product lookup logic
      const result = await fetchProduct(barcode);
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      router.push({ 
        pathname: '/product', 
        params: { gtin: barcode } 
      });
    },
    debounceMs: 800,
    lookupTimeoutMs: 12000,
    safetyTimeoutMs: 15000,
    autoResumeOnError: false,
    enableLogging: __DEV__,
  });

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
        }}
        onBarcodeScanned={onBarcodeScanned}
      />
      
      {/* Loading overlay */}
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator />
          <Text>Henter produkt...</Text>
        </View>
      )}
      
      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text>{error.message}</Text>
          <Button title="Prøv igjen" onPress={retryLastScan} />
          <Button title="Lukk" onPress={clearError} />
        </View>
      )}
      
      {/* Pause/resume controls */}
      <Button 
        title={isScanningEnabled ? "Pause" : "Resume"} 
        onPress={isScanningEnabled ? pauseScanning : resumeScanning} 
      />
    </View>
  );
}
```

## 🔒 Lock-regler (garantert)

Lock resettes i:
- ✅ `finally` (via `resetLock`)
- ✅ Alle error-cases
- ✅ Timeout (lookup timeout)
- ✅ Safety timeout (15s backup)
- ✅ Abort (når ny scan starter)
- ✅ `useFocusEffect` (screen focus)
- ✅ `AppState` → foreground
- ✅ `resetScanner()` (manual reset)
- ✅ Unmount cleanup

## ⏱ Timeout-håndtering

- **Lookup timeout**: 12s (default) - viser error hvis lookup tar for lang tid
- **Safety timeout**: 15s (default) - alltid resetter lock som backup
- Alle timeouts lagres i refs og ryddes opp

## 🚀 Produksjonsklar

API-et er produksjonsklar fordi:
- ✅ Alle edge cases håndteres
- ✅ Omfattende logging (kan skrus av)
- ✅ Type-safe TypeScript
- ✅ Ingen memory leaks
- ✅ Testbar (ren funksjonell logikk)
- ✅ Dokumentert API
- ✅ Fremtidsrettet (lett å utvide)

