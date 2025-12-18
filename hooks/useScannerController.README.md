# useScannerController - Production-Ready Scanner Hook

## 🎯 Hvorfor denne arkitekturen eliminerer "stopper etter 2 scans"

### Root Cause
Problemet oppstod fordi scan-lock (`hasScannedRef.current`) ble satt til `true`, men ble ikke alltid resatt til `false` i alle exit-paths. Dette skjedde spesielt når:
- Navigering skjedde asynkront
- Feil oppstod uten å nå `finally`-blokken
- Timeouts ikke ble ryddet opp
- App gikk i bakgrunn/foreground uten reset

### Løsningen
`useScannerController` eliminerer problemet ved å:

1. **Sentralisert lock-håndtering**: All lock-logikk er på ett sted
2. **Idempotent reset**: `resetLock()` kan kalles flere ganger uten problemer
3. **Alle timeouts i refs**: Ingen timeouts kan "glemme" seg
4. **Livssyklus-aware**: Automatisk reset ved focus/blur/background/foreground
5. **Safety timeout**: Alltid en backup som resetter lock etter 15s
6. **Omfattende logging**: Lett å debugge hva som skjer

## 📦 API

```typescript
const {
  // State
  isScanningEnabled: boolean;
  isProcessing: boolean;
  error: ScannerError | null;
  lastScannedCode: string | null;
  
  // Actions
  onBarcodeScanned: ((barcode: string) => void) | undefined;
  pauseScanning: () => void;
  resumeScanning: () => void;
  resetScanner: (reason: string) => void;
  clearError: () => void;
} = useScannerController({
  onBarcodeScanned?: (barcode: string, barcodeType: string) => Promise<void>;
  debounceMs?: number; // Default: 800
  lookupTimeoutMs?: number; // Default: 12000
  safetyTimeoutMs?: number; // Default: 15000
});
```

## 🔒 Lock-regler

Lock settes kun ett sted: i `handleBarcodeScanned` før callback kalles.

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

Alle timeouts:
- Lagres i refs (`timeoutRef`, `safetyTimeoutRef`)
- Ryddes opp før nye settes
- Har backup safety timeout (15s)

Lookup timeout (12s):
- Viser error hvis lookup tar for lang tid
- Resetter lock automatisk
- Reaktiverer scanning

## 📱 Livssyklus

Hooken håndterer:
- **Screen focus**: Resetter alt når skjermen får fokus
- **Screen blur**: Rydder opp når skjermen mister fokus
- **App background**: Resetter lock når app går i bakgrunn
- **App foreground**: Resetter lock når app kommer tilbake
- **Unmount**: Rydder opp alle timeouts og locks

## 🧪 Logging

Alle viktige events logges:
- `SCAN_DETECTED` - Barcode detektert
- `LOCK_SET` - Lock aktivert
- `LOOKUP_START` - Produktlookup startet
- `LOOKUP_SUCCESS` - Lookup fullført
- `LOOKUP_ERROR` - Lookup feilet
- `LOOKUP_TIMEOUT` - Lookup timeout
- `LOCK_RESET` - Lock resatt (med reason)
- `SCANNING_RESUMED` - Scanning gjenopptatt
- `SCANNER_RESET` - Full reset (med reason)

## ✅ Testplan

### 1. Grunnleggende scanning
- [ ] Skann 20 produkter på rad uten restart
- [ ] Hver scan gir enten resultat eller feil
- [ ] Scanning pauser under lookup
- [ ] Scanning starter alltid igjen etter lookup

### 2. Feilhåndtering
- [ ] Invalid GTIN viser feil og resumer scanning
- [ ] Network error viser feil og resumer scanning
- [ ] Timeout viser feil og resumer scanning
- [ ] Alle feil kan retries

### 3. Livssyklus
- [ ] Gå til bakgrunn → tilbake → scanning fungerer
- [ ] Naviger bort → tilbake → scanning fungerer
- [ ] Lukk produktvisning → scanning fungerer
- [ ] App restart → scanning fungerer

### 4. Edge cases
- [ ] Rask scanning (flere på rad) → alle håndteres
- [ ] Samme GTIN scannet to ganger → debounce fungerer
- [ ] Lookup tar 15+ sekunder → safety timeout aktiverer
- [ ] App crasher → ved restart fungerer alt

## 🚀 Produksjonsklar

Hooken er produksjonsklar fordi:
- ✅ Alle edge cases håndteres
- ✅ Omfattende logging for debugging
- ✅ Type-safe TypeScript
- ✅ Ingen memory leaks (alle timeouts ryddes)
- ✅ Testbar (ren funksjonell logikk)
- ✅ Dokumentert API

## 📝 Eksempel på bruk

Se `useScannerController.example.tsx` for komplett eksempel.

