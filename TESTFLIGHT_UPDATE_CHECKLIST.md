# TestFlight Update Checklist - v1

## ✅ Pre-Build Checks

### 1. Kode Status
- [x] Ingen linter errors
- [x] Alle v1 features implementert
- [x] Feature flags satt korrekt (OCR/manual entry skjult)

### 2. Versjon & Build Number

**Nåværende:**
- Version: `1.0.0` (i app.json)
- Build: Auto-increment via EAS (production)

**Anbefaling:**
- Oppdater versjon til `0.9.5` eller `1.0.1` (avhengig av hva som er i TestFlight nå)
- Build number økes automatisk av EAS

### 3. Backend URL

**Viktig:** Sjekk at `BACKEND_URL` er satt i `utils/product-reporting.ts`

```typescript
const BACKEND_URL = __DEV__ 
  ? 'https://your-backend-dev.com/v1/reports/missing-product'
  : 'https://your-backend.com/v1/reports/missing-product';
```

## 🚀 Build Steps

### Step 1: Oppdater Versjon (Hvis nødvendig)

Hvis du vil manuelt sette versjon, rediger `app.json`:

```json
{
  "expo": {
    "version": "0.9.5",  // Oppdater fra 1.0.0
    "ios": {
      "buildNumber": "46"  // Hvis du vil manuelt sette build number
    }
  }
}
```

**Eller:** La EAS håndtere auto-increment (anbefalt).

### Step 2: Bygg for TestFlight

```bash
# Installer EAS CLI hvis du ikke har det
npm install -g eas-cli

# Logg inn
eas login

# Bygg for iOS (production)
eas build --platform ios --profile production
```

**Alternativt:** Hvis du allerede har EAS konfigurert:

```bash
eas build --platform ios
```

### Step 3: Submit til TestFlight

Etter build er ferdig:

```bash
# Automatisk submit (hvis konfigurert)
eas submit --platform ios

# Eller manuelt:
# 1. Last ned .ipa fra EAS dashboard
# 2. Upload til App Store Connect via Transporter eller Xcode
```

## 📋 Post-Build

### 1. TestFlight Notes

Legg inn "What to Test" notes i TestFlight:

```
Test scanning of Danish food products in real stores.

If a product is not found:
- Check the scanned barcode shown in the app
- Tap "Rapportér produkt" (one tap)

Please scan many different products, especially private labels.

See TESTFLIGHT_WHAT_TO_TEST.md for full guide.
```

### 2. Verificer Build

- [ ] Installer build på egen iPhone
- [ ] Test at NOT_FOUND rapportering virker
- [ ] Test at barcode vises korrekt
- [ ] Test at multi-frame validation virker
- [ ] Test at toast vises ved rapportering

### 3. Backend Verificering

- [ ] Backend endpoint er klar (`/v1/reports/missing-product`)
- [ ] SQL schema er kørt
- [ ] Test at rapporter kommer inn i databasen

## ⚠️ Viktig Før Danmark-testen

### Backend Må Være Klar

Før testere begynner, sjekk:

1. **Backend URL er riktig:**
   ```typescript
   // utils/product-reporting.ts
   const BACKEND_URL = 'https://your-backend.com/v1/reports/missing-product';
   ```

2. **Backend er deployet:**
   - SQL schema kørt
   - Endpoint `/v1/reports/missing-product` fungerer
   - Export endpoint `/v1/reports/missing-product/export.csv` fungerer

3. **Test backend:**
   ```bash
   curl -X POST https://your-backend.com/v1/reports/missing-product \
     -H "Content-Type: application/json" \
     -H "X-App-Token: your-token" \
     -d '{"country":"DK","barcode":"5701234567890","issue_type":"NOT_FOUND","client":{"app_version":"0.9.5","build_number":"46","platform":"iOS","os_version":"17.6","device_model":"iPhone14,5","locale":"da-DK"},"context":{"scanned_at":"2025-12-16T18:00:00Z","session_id":"test"}}'
   ```

## 📝 Quick Commands

```bash
# 1. Sjekk at du er i riktig mappe
cd "C:\Users\robto\OneDrive\Documents\Projects\upf-scanner-app"

# 2. Sjekk at alt er commitet (valgfritt)
git status

# 3. Bygg for TestFlight
eas build --platform ios --profile production

# 4. Submit til TestFlight (hvis automatisk)
eas submit --platform ios
```

## ✅ Done Kriterier

- [x] Kode er ferdig og testet lokalt
- [ ] Versjon er oppdatert (hvis nødvendig)
- [ ] Build er ferdig og lastet opp
- [ ] TestFlight notes er lagt inn
- [ ] Backend er klar og testet
- [ ] Selv testet build på iPhone

## 🎯 Neste Skridt

1. **I dag:** Bygg og upload til TestFlight
2. **I morgen:** Test selv + legg inn notes
3. **Før fredag:** Sanity test + backend verificering
4. **Etter Danmark:** Analyser data via CSV export

---

**Status:** Klar til build! 🚀

