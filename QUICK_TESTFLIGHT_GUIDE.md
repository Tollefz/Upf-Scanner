# Quick TestFlight Update Guide

## ✅ Status Check

**Kode:**
- ✅ Ingen linter errors
- ✅ Alle v1 features implementert
- ✅ Feature flags satt korrekt

**Konfigurasjon:**
- ✅ EAS er konfigurert med `autoIncrement: true`
- ✅ Versjon: `1.0.0` (kan oppdateres hvis nødvendig)

## 🚀 Build for TestFlight

### 1. Sjekk at du er i riktig mappe

```powershell
cd "C:\Users\robto\OneDrive\Documents\Projects\upf-scanner-app"
```

### 2. Bygg med EAS

```powershell
# Hvis du ikke har EAS CLI installert
npm install -g eas-cli

# Logg inn (hvis ikke allerede)
eas login

# Bygg for iOS (production)
eas build --platform ios --profile production
```

**Dette vil:**
- Automatisk øke build number
- Bygge iOS app
- Vise download link når ferdig

### 3. Submit til TestFlight

Etter build er ferdig, kan du enten:

**Automatisk (hvis konfigurert):**
```powershell
eas submit --platform ios
```

**Eller manuelt:**
1. Last ned .ipa fra EAS dashboard
2. Upload til App Store Connect via Transporter eller Xcode

## ⚠️ VIKTIG: Backend URL

**Sjekk at backend URL er satt i `utils/product-reporting.ts`:**

```typescript
const BACKEND_URL = __DEV__ 
  ? 'https://your-backend-dev.com/v1/reports/missing-product'  // ← OPPDATER DETTE
  : 'https://your-backend.com/v1/reports/missing-product';      // ← OPPDATER DETTE
```

**Hvis backend ikke er klar ennå:**
- Appen vil fortsatt fungere
- Rapporter lagres lokalt og sendes når backend er klar
- Du kan teste appen uten backend

## 📝 TestFlight Notes

Etter build er opplastet, legg inn disse notes i TestFlight:

```
Test scanning of Danish food products in real stores.

If a product is not found:
- Check the scanned barcode shown in the app
- Tap "Rapportér produkt" (one tap)

Please scan many different products, especially private labels.
```

## ✅ Post-Build Checklist

- [ ] Build er ferdig og lastet opp
- [ ] TestFlight notes er lagt inn
- [ ] Installer build på egen iPhone og test
- [ ] Verificer at NOT_FOUND rapportering virker
- [ ] Backend URL er satt (hvis backend er klar)

## 🎯 Alt Klar?

**Ja! Du kan bygge nå:**

```powershell
eas build --platform ios --profile production
```

**EAS vil håndtere:**
- ✅ Build number auto-increment
- ✅ Versjon håndtering
- ✅ Code signing
- ✅ Upload til EAS servers

**Du trenger bare:**
- ✅ Være logget inn på EAS
- ✅ Ha riktig Apple Developer account knyttet

---

**Klar til build!** 🚀

