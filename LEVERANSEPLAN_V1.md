# Leveranseplan - v1 Build (Danmark Test)

## 🎯 Mål

**Når du står i butikk:**
- ✅ Appen feiler sjeldnere
- ✅ Når den feiler → du vet hvorfor
- ✅ Hver feil blir nyttig data, ikke frustrasjon

## ✅ ABSOLUTT MUST (må være med i neste build)

Dette er ikke forhandling, dette er minimum for en god testtur.

### 1️⃣ Tydelige States (30–60 min arbeid)

**Implementeret:**
- ✅ `FOUND` - Produkt fundet med data
- ✅ `NOT_FOUND` - 404/status=0 (produkt finnes ikke)
- ✅ `NETWORK_ERROR` - Timeout/5xx/offline
- ✅ `SCAN_ERROR` - Barcode ikke lest stabilt
- ⏸️ `MISSING_DATA` - Kan vente (vis kun basic info i v1)

**Status:** ✅ Komplet implementeret

### 2️⃣ Vis Strekkoden som Ble Lest

**UI:**
```
Skannet: 5701234567890
```

**Status:** ✅ Implementeret - vises i alle states

### 3️⃣ Multi-frame Barcode Validation

**Krav:**
- 3 treff på samme kode før lookup
- 1–2 sek vindu

**Status:** ✅ Implementeret - 1.5 sek vindu, 3+ læsninger, ≥60% dominance

### 4️⃣ Rapportér Produkt (kun NOT_FOUND)

**Krav:**
- 1 knapp
- Sender: barcode, tidspunkt, app-build, device
- Dedupe per dag

**Status:** ✅ Implementeret - kun NOT_FOUND i v1

### 5️⃣ "What to Test" i TestFlight

**Status:** ✅ Dokumenteret i `TESTFLIGHT_WHAT_TO_TEST.md`

## ⛔ IKKE gjør før fredag

Disse kan ødelegge fokus / gi bugs:

- ❌ OCR - Skjult via feature flag
- ❌ Avansert caching - Ikke implementeret
- ❌ Nye datakilder - Ikke implementeret
- ❌ UI-polish - Minimal i v1

**Du trenger signal, ikke features.**

## 📦 Leveranseplan (helt konkret)

### ✅ I DAG (Færdig)

- [x] Implementér punkt 1–4
- [x] Feature flags sat korrekt (OCR/manual entry skjult)
- [x] Test lokalt med flymodus + dårlig lys
- [x] "What to Test" guide skrevet

### 📅 I MORGEN

- [ ] Upload ny TestFlight build
- [ ] Legg inn "What to Test" i TestFlight notes (kopier fra `TESTFLIGHT_WHAT_TO_TEST.md`)
- [ ] Installer selv og test én runde
- [ ] Verificer at NOT_FOUND rapportering virker
- [ ] Verificer at barcode vises korrekt
- [ ] Verificer at multi-frame validation virker

### 📅 FØR FREDAG

- [ ] Én siste sanity-test
- [ ] Verificer backend endpoint er klar
- [ ] Verificer SQL schema er kørt
- [ ] Test export endpoint for "Top 20 DK barcodes"
- [ ] **Ikke ship flere builds** - fokus på testen

## 🧪 Hvordan DU bør teste i Danmark (felt-strategi)

### Ta 30–45 min i hver butikk

**Scan:**
- Billige hverdagsvarer
- Egne merkevarer
- Importvarer

**Notér mentalt:**
- Finner den produktet?
- Hvis ikke: er det NOT_FOUND eller NETWORK_ERROR?
- Matcher barcode på skjermen pakken?

**Alt annet samles automatisk via rapportene.**

## 🔥 Etter Danmark-turen

### Da gjør dere:

1. **Sorter topp 20 rapporterte EAN-koder**
   ```sql
   SELECT barcode, occurrence_count 
   FROM missing_product_reports 
   WHERE country = 'DK' AND issue_type = 'NOT_FOUND'
   ORDER BY occurrence_count DESC 
   LIMIT 20;
   ```

2. **Se mønstre:**
   - Samme butikker?
   - Samme merke?
   - Samme produkttype?

3. **Bestem:**
   - Datakildeforbedring (v2)
   - OCR (v3)
   - Manuelt seed-data (v2)

## ✅ Pre-Flight Checklist

### Kode
- [x] Feature flags sat korrekt
- [x] OCR/manual entry skjult
- [x] NOT_FOUND rapportering aktiv
- [x] Barcode visning aktiv
- [x] Multi-frame validation aktiv
- [x] States tydelige og korrekte

### Backend
- [ ] SQL schema kørt på produktion
- [ ] Endpoint `/v1/reports/missing-product` implementeret
- [ ] Export endpoint `/v1/reports/missing-product/export` implementeret
- [ ] `BACKEND_URL` opdateret i `utils/product-reporting.ts`

### TestFlight
- [ ] Build uploadet
- [ ] "What to Test" notes tilføjet
- [ ] Testere inviteret
- [ ] Selv testet én runde

### Dokumentation
- [x] `SHIP_PLAN.md` - Komplet ship plan
- [x] `TESTFLIGHT_WHAT_TO_TEST.md` - Test guide
- [x] `TESTFLIGHT_METRICS.md` - Metrics guide
- [x] `LEVERANSEPLAN_V1.md` - Denne fil

## 🎯 Success Kriterier for v1

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

## 📊 Metrics til Måling

Se `TESTFLIGHT_METRICS.md` for detaljer.

**Hovedmetrics:**
1. State distribution (found/not_found/network_error/scan_error)
2. Top 20 mest rapporterede EAN-koder
3. Median latency på lookup

## 🚀 Næste Skridt

1. **I morgen:** Upload build + test selv
2. **Før fredag:** Sanity test + backend verificering
3. **Efter test:** Analyser data + planlæg v2

**Fokus:** Signal, ikke features. Du lærer mest af fejlene! 🎯

