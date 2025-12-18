# Barcode Scanner Guide - Expo

## Oversikt

Komplett integrasjon med `expo-camera` for barcode scanning med:
- Kameratillatelse-håndtering
- GTIN-validasjon og normalisering
- Debounce for å unngå multiple scans
- Automatisk navigering til ProductScreen

---

## Debounce Forklaring

### Hva er debounce?

**Debounce** er en teknikk for å unngå at samme handling utføres flere ganger for raskt.

### Hvorfor trenger vi debounce i barcode scanner?

1. **Kamera detekterer samme kode flere ganger** - Barcode scanner API kan detektere samme strekkode 10-20 ganger per sekund
2. **Navigasjon skjer flere ganger** - Uten debounce vil brukeren navigere til ProductScreen flere ganger
3. **API-kall multipliseres** - Uten debounce vil vi gjøre samme API-kall mange ganger

### Hvordan fungerer debounce i koden?

```typescript
// Debounce logikk
const lastScannedRef = useRef<string | null>(null);
const lastScanTimeRef = useRef<number>(0);
const isProcessingRef = useRef(false);

const handleBarcodeScanned = (result) => {
  const now = Date.now();
  const barcode = result.data;

  // Ignorer hvis samme kode skannes for raskt
  if (
    lastScannedRef.current === barcode &&
    now - lastScanTimeRef.current < debounceDelay // 2 sekunder
  ) {
    return; // Ignorer denne scan
  }

  // Oppdater state
  lastScannedRef.current = barcode;
  lastScanTimeRef.current = now;
  isProcessingRef.current = true;

  // Stopp scanning midlertidig
  setScanning(false);

  // Gjør handling (naviger, kall API, etc.)
  router.push({ pathname: '/product', params: { gtin } });

  // Gjenoppta scanning etter delay
  setTimeout(() => {
    isProcessingRef.current = false;
    setScanning(true);
  }, debounceDelay);
};
```

**Eksempel:**
1. Bruker scanner produkt A → navigerer til ProductScreen, stopper scanning i 2 sek
2. Bruker scanner produkt A igjen etter 0.5 sek → ignoreres (samme kode, for raskt)
3. Bruker scanner produkt A igjen etter 2.5 sek → navigerer igjen (nok tid har gått)

---

## Beste Praksis for UX

### 1. Kameratillatelse

**God praksis:**
- Vis tydelig melding hvis tillatelse mangler
- Gi mulighet til å gi tillatelse direkte i appen
- Forklar hvorfor tillatelse er nødvendig

**Kode:**
```typescript
if (!permission.granted) {
  return (
    <View>
      <Text>Kameratillatelse er nødvendig for å skanne strekkoder</Text>
      <TouchableOpacity onPress={handleRequestPermission}>
        <Text>Gi kameratillatelse</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 2. Scan Frame Overlay

**God praksis:**
- Vis tydelig ramme hvor strekkoden skal være
- Gi visuell feedback (f.eks. grønne hjørner)
- Vis instruksjoner ("Hold strekkoden i rammen")

**Kode:**
```typescript
<View style={styles.scanFrame}>
  {/* Grønne hjørner */}
  <View style={styles.corner} />
  {/* ... */}
</View>
<Text>Hold strekkoden i rammen</Text>
```

### 3. Loading States

**God praksis:**
- Vis loading state mens kameratillatelse sjekkes
- Vis loading state mens GTIN valideres
- Ikke blokkér UI mens API-kall gjøres

### 4. Feilhåndtering

**God praksis:**
- Valider GTIN før navigering
- Ignorer ugyldige strekkoder (logg, ikke vis feil til bruker)
- Håndter kamerafeil gracefully

**Kode:**
```typescript
const validation = validateGTIN(barcode);
if (!validation.ok || !validation.normalized) {
  console.warn('Invalid GTIN:', barcode);
  return; // Ignorer, ikke vis feil
}
```

### 5. Debounce Timing

**Anbefalt:**
- **1.5-2 sekunder** for barcode scanner (default)
- Juster basert på testing
- For kort → brukeren kan scanne for raskt
- For lang → frustrerende ventetid

---

## Komplett Eksempel

### Bruk i Screen

```typescript
import { BarcodeScannerSimple } from '@/src/components/BarcodeScannerSimple';

export default function ScanScreen() {
  return (
    <View style={{ flex: 1 }}>
      <BarcodeScannerSimple 
        debounceDelay={2000} // 2 sekunder
        onBarcodeScanned={(gtin) => {
          // Valgfritt: Custom handling
          console.log('Scanned:', gtin);
          router.push({ pathname: '/product', params: { gtin } });
        }}
      />
    </View>
  );
}
```

### Uten Custom Handler (Standard)

```typescript
<BarcodeScannerSimple />
// Automatisk navigerer til /product?gtin=...
```

---

## Testing

### Test Scenarios

1. **Samme kode skannes flere ganger raskt**
   - Forventet: Kun første scan registreres
   - Test: Scan samme produkt 5 ganger på 1 sekund

2. **Forskjellige koder skannes raskt**
   - Forventet: Hver kode registreres (hvis nok tid mellom)
   - Test: Scan produkt A, vent 0.5s, scan produkt B

3. **Ugyldig strekkode**
   - Forventet: Ignoreres (ingen feilmelding)
   - Test: Scan ugyldig kode

4. **Kameratillatelse nektet**
   - Forventet: Vis melding med knapp
   - Test: Nekt tillatelse i innstillinger

---

## Troubleshooting

### Problem: Scanner detekterer samme kode flere ganger

**Løsning:**
- Sjekk at `debounceDelay` er satt (minst 1.5 sekunder)
- Sjekk at `isProcessingRef.current` settes riktig
- Sjekk at `setScanning(false)` kalles

### Problem: Scanner fungerer ikke etter tillatelse gitt

**Løsning:**
- Restart app (tillatelse caches av Expo)
- Sjekk at `permission.granted` er `true`
- Sjekk at CameraView er rendret

### Problem: Ugyldige strekkoder navigerer likevel

**Løsning:**
- Sjekk at `validateGTIN()` kalles
- Sjekk at `validation.ok` sjekkes
- Sjekk at `return` kalles hvis ugyldig

