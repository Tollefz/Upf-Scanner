# Future Roadmap - UPF Scanner App

## 🎯 Overordnet visjon

Bygge videre på dagens robuste arkitektur (`useScannerController`) med fokus på brukeropplevelse og funksjonalitet.

---

## 📅 Milepæl 1: Scan-historikk (2-3 uker)

### Mål
Brukere kan se tidligere scannede produkter og søke i historikken.

### Teknisk implementasjon

#### 1.1 Lokal lagring
- **Teknologi**: `@react-native-async-storage/async-storage` (allerede installert)
- **Struktur**:
  ```typescript
  interface HistoryItem {
    barcode: string;
    productName: string;
    scannedAt: number;
    upfLevel: 'Grønn' | 'Gul' | 'Rød';
    allergens: string[];
  }
  ```
- **Implementasjon**:
  - Lag `utils/history.ts` med CRUD-operasjoner
  - Integrer med `useScannerController` - lagre automatisk ved successful scan
  - Maks 1000 items (FIFO)

#### 1.2 UI-komponenter
- **Historikk-skjerm**: Liste med søk og filtrering
- **Historikk-item**: Kort med produktnavn, UPF-nivå, dato
- **Søk**: Real-time søk i produktnavn og barcode

#### 1.3 Integrasjon
- **useScannerController**: Legg til `onScanSuccess` callback
- **Automatisk lagring**: Når scan er successful, lagre til historikk
- **Dedupe**: Ikke lagre samme barcode innen 1 time

### Akseptansekriterier
- [ ] Historikk vises i egen tab
- [ ] Søk fungerer i real-time
- [ ] Maks 1000 items (FIFO)
- [ ] Automatisk lagring ved successful scan
- [ ] Dedupe fungerer

---

## 📅 Milepæl 2: Favoritter (1-2 uker)

### Mål
Brukere kan markere produkter som favoritter og filtrere på dem.

### Teknisk implementasjon

#### 2.1 Lagring
- **Teknologi**: AsyncStorage (samme som historikk)
- **Struktur**:
  ```typescript
  interface FavoriteItem {
    barcode: string;
    productName: string;
    addedAt: number;
    upfLevel: 'Grønn' | 'Gul' | 'Rød';
  }
  ```
- **Implementasjon**:
  - Lag `utils/favorites.ts` med CRUD-operasjoner
  - Integrer med produktvisning - "Legg til favoritter" knapp

#### 2.2 UI-komponenter
- **Favoritter-skjerm**: Liste med favoritter
- **Favoritt-indikator**: Hjerte-ikon i produktvisning
- **Filtrering**: Filtrer historikk på favoritter

#### 2.3 Integrasjon
- **Produktvisning**: Legg til favoritt-knapp
- **Historikk**: Vis favoritt-indikator
- **Filtrering**: Toggle for "Kun favoritter"

### Akseptansekriterier
- [ ] Favoritter vises i egen tab
- [ ] Legg til/fjern favoritt fungerer
- [ ] Filtrering fungerer
- [ ] Favoritt-indikator vises i historikk

---

## 📅 Milepæl 3: Retry og Offline-cache (2-3 uker)

### Mål
Brukere kan prøve igjen ved feil, og appen fungerer offline med cache.

### Teknisk implementasjon

#### 3.1 Retry-logikk
- **useScannerController**: Allerede har `retryLastScan()` ✅
- **UI**: Legg til "Prøv igjen" knapp ved feil
- **Smart retry**: Eksponentiell backoff (1s, 2s, 4s)

#### 3.2 Offline-cache
- **Teknologi**: AsyncStorage + in-memory cache
- **Struktur**:
  ```typescript
  interface CachedProduct {
    barcode: string;
    product: OffProduct;
    cachedAt: number;
    expiresAt: number; // 7 dager
  }
  ```
- **Implementasjon**:
  - Lag `utils/product-cache.ts`
  - Cache ved successful lookup
  - Sjekk cache før API-kall
  - Vis "Offline" indikator når cache brukes

#### 3.3 Network detection
- **Teknologi**: `@react-native-community/netinfo` (må installeres)
- **Implementasjon**:
  - Detekter når nettverk er tilbake
  - Auto-retry ved network recovery
  - Vis network status i UI

### Akseptansekriterier
- [ ] Retry fungerer ved feil
- [ ] Cache fungerer offline
- [ ] Network detection fungerer
- [ ] Auto-retry ved network recovery
- [ ] "Offline" indikator vises

---

## 📅 Milepæl 4: Batch Scan (3-4 uker)

### Mål
Brukere kan scanne flere produkter på rad og se en oversikt.

### Teknisk implementasjon

#### 4.1 Queue-basert UX
- **Arkitektur**: Queue + dedupe + concurrency control
- **Struktur**:
  ```typescript
  interface ScanQueue {
    items: Array<{
      barcode: string;
      status: 'pending' | 'processing' | 'completed' | 'error';
      result?: OffProduct;
      error?: ScannerError;
    }>;
  }
  ```
- **Implementasjon**:
  - Lag `hooks/useBatchScanner.ts`
  - Queue-basert: Legg til i queue, prosesser sekvensielt
  - Dedupe: Ignorer samme barcode i queue
  - Concurrency: Maks 1 lookup om gangen (bruk `useScannerController`)

#### 4.2 UI-komponenter
- **Batch-mode toggle**: Aktiver/deaktiver batch-mode
- **Queue-visning**: Liste med pending/completed items
- **Progress indicator**: Vis hvor mange som er ferdig
- **Export**: Eksporter batch-resultat (CSV/JSON)

#### 4.3 Anbefalt UX
1. **Aktiver batch-mode**: Toggle i settings
2. **Scan produkter**: Normal scanning, men legges til i queue
3. **Vis queue**: Bottom sheet med alle scannede produkter
4. **Prosesser**: Automatisk prosessering i bakgrunnen
5. **Oversikt**: Se alle resultater i en liste
6. **Export**: Eksporter til CSV/JSON

### Akseptansekriterier
- [ ] Batch-mode kan aktiveres/deaktiveres
- [ ] Queue vises i UI
- [ ] Dedupe fungerer
- [ ] Concurrency control fungerer (maks 1 om gangen)
- [ ] Export fungerer

---

## 📅 Milepæl 5: Konto og Sync (Valgfritt, 4-6 uker)

### Mål
Brukere kan synkronisere data mellom enheter.

### Teknisk implementasjon

#### 5.1 Autentisering
- **Teknologi**: Supabase Auth (allerede installert)
- **Implementasjon**:
  - Lag `utils/auth.ts` med login/logout
  - Integrer med Supabase
  - Lagre auth state i AsyncStorage

#### 5.2 Sync
- **Teknologi**: Supabase Database (allerede installert)
- **Struktur**:
  ```sql
  CREATE TABLE user_scans (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    barcode TEXT,
    product_data JSONB,
    scanned_at TIMESTAMP,
    created_at TIMESTAMP
  );
  ```
- **Implementasjon**:
  - Lag `utils/sync.ts` med sync-logikk
  - Sync historikk og favoritter
  - Conflict resolution: Last write wins
  - Background sync: Sync når app åpnes

#### 5.3 UI-komponenter
- **Login-skjerm**: Email/password login
- **Sync-status**: Vis sync-status i settings
- **Manual sync**: "Sync nå" knapp

### Akseptansekriterier
- [ ] Login/logout fungerer
- [ ] Sync fungerer automatisk
- [ ] Manual sync fungerer
- [ ] Conflict resolution fungerer
- [ ] Sync-status vises

---

## 🏗️ Teknisk arkitektur (gjennomgående)

### Eksisterende arkitektur
- ✅ `useScannerController` - Robust scanning hook
- ✅ `@react-native-async-storage/async-storage` - Lokal lagring
- ✅ `@supabase/supabase-js` - Backend/sync
- ✅ Expo Router - Navigering
- ✅ TypeScript - Type safety

### Nye avhengigheter (ved behov)
- `@react-native-community/netinfo` - Network detection (Milepæl 3)
- `expo-file-system` - Export funksjonalitet (Milepæl 4)

### Design-prinsipper
1. **Bygg videre på eksisterende**: Ikke omskriv, utvid
2. **Hook-basert**: All logikk i hooks (`useScannerController`, `useBatchScanner`, etc.)
3. **Type-safe**: Full TypeScript support
4. **Testbar**: Ren funksjonell logikk
5. **Produksjonsklar**: Error handling, logging, cleanup

---

## 📊 Prioritering

### Høy prioritet (MVP+)
1. ✅ Scan-historikk (Milepæl 1)
2. ✅ Favoritter (Milepæl 2)
3. ✅ Retry og offline-cache (Milepæl 3)

### Medium prioritet
4. Batch scan (Milepæl 4)

### Lav prioritet (Valgfritt)
5. Konto og sync (Milepæl 5)

---

## 🎯 Realistisk tidslinje (litt team)

- **Milepæl 1**: 2-3 uker
- **Milepæl 2**: 1-2 uker
- **Milepæl 3**: 2-3 uker
- **Milepæl 4**: 3-4 uker
- **Milepæl 5**: 4-6 uker (valgfritt)

**Total**: ~10-15 uker for MVP+ (Milepæl 1-3)

---

## ✅ Akseptansekriterier (gjennomgående)

- [ ] Bygger videre på dagens arkitektur
- [ ] Ingen breaking changes til `useScannerController`
- [ ] Type-safe TypeScript
- [ ] Testbar kode
- [ ] Produksjonsklar (error handling, logging)
- [ ] Dokumentert API

