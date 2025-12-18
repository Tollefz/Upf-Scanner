# Ship Plan - upf-scanner-app

## 🚢 Build v1 - Ship Nå

### ✅ Implementeret og Klar

#### 1. Tydelige States + Rigtig Feilhåndtering
- ✅ Eksplisitte states: `found`, `not_found`, `network_error`, `scan_error`
- ✅ 404 ≠ network error (kritisk skillelinje)
- ✅ Timeout ≠ not found
- ✅ Aldri "silent failure" - altid tydelig state

#### 2. Vis "Skannet: <barcode>" i UI
- ✅ Barcode vises før lookup
- ✅ Barcode type vises (EAN13, EAN8, UPC, etc.)
- ✅ Umiddelbar debugging for testere

#### 3. Multi-frame "Stable Barcode" før Lookup
- ✅ Samler barcodes over 1.5 sekunder
- ✅ Kræver 3+ læsninger af samme barcode
- ✅ Mest hyppige skal være ≥60% af alle læsninger
- ✅ Reducerer misreads dramatisk

#### 4. Rapportér Produkt (kun NOT_FOUND i v1)
- ✅ 1 tryk → sender barcode + metadata til backend
- ✅ Dedupe per dag (via backend)
- ✅ Bygger datagrunnlag raskt i DK

#### 5. Basic Logging
- ✅ State, barcode, source, http_status, latency
- ✅ Lokalt logging (AsyncStorage)
- ✅ Backend logging (via reports)

### 📊 Metrics til Måling (v1)

Følgende metrics skal måles i TestFlight:

1. **Andel scans som ender i:**
   - `found` - Produkt fundet med data
   - `not_found` - 404/status=0
   - `network_error` - Timeout/5xx/offline
   - `scan_error` - Barcode ikke læst stabilt
   - `missing_data` - (skal være 0% i v1, da vi ikke håndterer det endnu)

2. **Top 20 mest rapporterede EAN-koder (DK)**
   - Via backend export endpoint
   - Sorteret efter `occurrence_count`

3. **Median latency på lookup**
   - Fra `latency_ms` i logs
   - Mål: < 2 sekunder

### 🔧 Konfiguration for v1

**Deaktiver i v1:**
- ❌ OCR funktionalitet (skjul knapper)
- ❌ Manual entry (skjul knapper)
- ❌ MISSING_DATA rapportering (kun NOT_FOUND)

**Aktiver i v1:**
- ✅ NOT_FOUND rapportering
- ✅ NETWORK_ERROR rapportering (valgfri)
- ✅ Multi-frame validation
- ✅ Barcode visning
- ✅ Basic logging

## 🚀 Build v2 - Næste Release

### Planlagt

1. **MISSING_DATA state + "Rapportér manglende info"**
   - Når produkt findes men ingredienser mangler
   - Rapportér det også til backend
   - Issue type: `MISSING_INGREDIENTS`

2. **Caching af positive hits**
   - Cache 7-30 dage for fundne produkter
   - Cache 12-24 timer for negative hits
   - Raskere UX, mindre nettavhengighed

### Metrics til Måling (v2)

- Andel `missing_data` vs `found`
- Cache hit rate
- Gennemsnitlig lookup tid (med cache)

## 🎯 Build v3 - Fremtidig Release

### Planlagt

1. **OCR fallback for manglende ingredienser**
   - Kun i MISSING_DATA state
   - "Tag billede af ingrediensliste" knap
   - Merk resultat: "Baseret på foto/OCR"
   - Beregn UPF-score baseret på OCR

### Metrics til Måling (v3)

- OCR success rate
- Andel produkter med OCR-data
- OCR accuracy (via backend validation)

## 📋 TestFlight Checklist (v1)

### Pre-release
- [ ] Opdater `BACKEND_URL` i `utils/product-reporting.ts`
- [ ] Backend endpoint implementeret og testet
- [ ] SQL schema kørt på produktion database
- [ ] Deaktiver OCR/manual entry UI (hvis ikke allerede)

### Test Scenarier
- [ ] Scan stabil barcode → Skal gå til `found` eller `not_found`
- [ ] Scan ustabil barcode → Skal vise `scan_error`
- [ ] Test offline → Skal vise `network_error`, IKKE `not_found`
- [ ] Test 404 → Skal vise `not_found`, IKKE `network_error`
- [ ] Test timeout → Skal vise `network_error`, IKKE `not_found`
- [ ] Test rapportering → Skal sende til backend med dedupe

### Post-release Monitoring
- [ ] Se "Top 20 DK barcodes" via export endpoint
- [ ] Analyser state distribution
- [ ] Mål median latency
- [ ] Identificer mest rapporterede produkter

## 🎯 Success Criteria for v1

**Minimum:**
- 90%+ af scans ender i tydelig state
- <5% `scan_error` (multi-frame validation virker)
- <10% `network_error` (god netværkshåndtering)
- Top 20 barcodes identificeret via rapporter

**Mål:**
- 95%+ af scans ender i tydelig state
- <2% `scan_error`
- <5% `network_error`
- 50+ unikke barcodes rapporteret i første uge

## 📝 Noter

- OCR og manual entry er implementeret i koden, men kan deaktiveres via feature flags hvis nødvendigt
- Backend må være klar før v1 release
- Export endpoint skal være tilgængelig for at se "Top 20 DK barcodes"

