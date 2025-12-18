# TestFlight Setup Guide

## 📋 Forberedelser

### 1. Sjekk app.json / app.config.ts

Din nåværende `app.json` ser bra ut, men her er anbefalinger:

```json
{
  "expo": {
    "name": "upf-scanner-app",
    "slug": "upf-scanner-app",
    "version": "1.0.0",  // ✅ OK
    "ios": {
      "bundleIdentifier": "com.tollefz.upfscannerapp",  // ✅ OK
      "infoPlist": {
        "NSCameraUsageDescription": "Denne appen trenger kamera for å skanne strekkoder"  // ✅ OK
      }
    }
  }
}
```

**Anbefalinger:**
- ✅ Bundle identifier er korrekt
- ✅ Kamera-permission tekst er satt
- ⚠️ Vurder å legge til `buildNumber` for bedre versjonshåndtering

### 2. Sjekk eas.json

Din nåværende `eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal"  // ✅ Perfekt for TestFlight
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

**Anbefaling:**
- Bruk `preview` profil for TestFlight (internal distribution)
- `production` profil for App Store release

## 🚀 Build og Submit

### Steg 1: Installer EAS CLI (hvis ikke allerede)

```bash
npm install -g eas-cli
```

### Steg 2: Logg inn

```bash
eas login
```

### Steg 3: Konfigurer prosjektet (hvis første gang)

```bash
eas build:configure
```

### Steg 4: Bygg for iOS (Preview/TestFlight)

```bash
# For TestFlight (preview profil)
eas build --platform ios --profile preview

# Eller for production (App Store)
eas build --platform ios --profile production
```

### Steg 5: Submit til TestFlight

```bash
# Automatisk submit etter build
eas build --platform ios --profile preview --auto-submit

# Eller manuelt submit
eas submit --platform ios
```

## 📱 Anbefalte Build-profiler

### Preview (TestFlight)
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "buildConfiguration": "Release"
      }
    }
  }
}
```

### Production (App Store)
```json
{
  "build": {
    "production": {
      "distribution": "store",
      "ios": {
        "buildConfiguration": "Release"
      },
      "autoIncrement": true
    }
  }
}
```

## ✅ Checklist før TestFlight

- [ ] Bundle identifier er korrekt (`com.tollefz.upfscannerapp`)
- [ ] Kamera-permission tekst er satt
- [ ] Versjonnummer er oppdatert
- [ ] App-navn og ikon er korrekt
- [ ] EAS CLI er installert og logget inn
- [ ] Prosjekt er konfigurert (`eas build:configure`)
- [ ] Build fungerer lokalt (`eas build --platform ios --profile preview --local`)

## 🔧 Troubleshooting

### "No Apple Team found"
```bash
eas credentials
# Følg instruksjonene for å sette opp Apple Developer credentials
```

### "Build failed"
- Sjekk at du er logget inn: `eas whoami`
- Sjekk at prosjektet er konfigurert: `eas build:configure`
- Prøv lokal build først: `eas build --platform ios --profile preview --local`

### "Submit failed"
- Sjekk at build er ferdig: `eas build:list`
- Sjekk at du har riktig tilgang i App Store Connect

## 📝 Eksakte kommandoer (Copy-paste)

```bash
# 1. Installer EAS CLI
npm install -g eas-cli

# 2. Logg inn
eas login

# 3. Konfigurer (første gang)
eas build:configure

# 4. Bygg for TestFlight
eas build --platform ios --profile preview

# 5. Submit til TestFlight (automatisk)
eas build --platform ios --profile preview --auto-submit

# ELLER submit manuelt
eas submit --platform ios
```

## 🎯 Neste steg etter TestFlight

1. Vent på at build er ferdig (5-15 minutter)
2. Sjekk status: `eas build:list`
3. Når build er ferdig, lastes den automatisk opp til TestFlight
4. Gå til App Store Connect for å behandle build
5. Legg til testgrupper og send ut invitasjoner

