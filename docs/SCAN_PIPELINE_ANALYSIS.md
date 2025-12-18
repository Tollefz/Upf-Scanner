# Scan Pipeline - Root Cause Analysis

## Identifiserte Problemer

### 1. **State Lock Race Conditions**
- `lockRef.current` resettes før navigasjon, men navigasjon er async
- Hvis ny scan starter mens forrige lookup fortsatt pågår, kan begge navigere
- Lock resettes i error cases, men ikke alltid ved suksess

### 2. **Ingen In-Flight Request Cancellation**
- `fetchOffProduct` har AbortController, men den brukes ikke for å avbryte forrige request
- Nye scans kan starte mens forrige lookup fortsatt pågår
- Resultatet kan komme tilbake etter at ny scan er startet

### 3. **ProductScreen Reloader Data**
- `useEffect` i ProductScreen kjører hver gang `params.gtin` endres
- Dette skjer hver gang komponenten re-renders
- Produktdata kan "forsvinne" og lastes på nytt

### 4. **Debounce Ikke Robust Nok**
- Debounce sjekkes i `handleBarcodeDetected`, men ikke i `handleBarcodeScan`
- Multi-frame validation kan omgå debounce
- Ingen cooldown periode etter navigasjon

### 5. **Focus/Unfocus Håndtering**
- `useFocusEffect` resetter state, men ikke i-flight requests
- Når brukeren kommer tilbake fra ProductScreen, kan gamle state være der

### 6. **Ytelse Problemer**
- Cache brukes, men ikke optimalt
- `handleBarcodeScan` opprettes på nytt hver render (pga router dependency)
- Tunge re-renders i ScannerScreen

## Løsning: Robust Scan Pipeline

### State Machine
```
IDLE → SCANNING → LOOKUP_PENDING → NAVIGATING → COOLDOWN → IDLE
```

### Key Improvements
1. **In-flight request cancellation**: Lagre AbortController ref og avbryt ved ny scan
2. **Robust debounce**: Sjekk både i detection og scan handler
3. **Cooldown periode**: 500ms etter navigasjon før ny scan kan starte
4. **Navigation guard**: Sjekk om allerede navigert før navigasjon
5. **ProductScreen cache**: Lagre produktdata lokalt for å unngå re-last
6. **Perf logs**: Logg alle viktige timestamps for debugging

