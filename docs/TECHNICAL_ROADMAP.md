# Teknisk Roadmap - Matvare-skanner-app

**Produkt:** Forbrukerrettet mobilapp for mat- og drikkevarer i Danmark  
**Periode:** 6-12 måneder  
**Status:** Tidlig stage / Pre-MVP

---

## Fase 1: MVP / Beta (Måned 1-2)

### Mål
Få appen i hendene på beta-brukere for å validere core-funksjonalitet og samle feedback.

### Funksjonalitet

#### Core Features
- ✅ Strekkode-skanning (EAN-8, EAN-13, UPC-A)
- ✅ Produktoppslag fra Open Food Facts (fallback)
- ✅ Visning av produktnavn, merke, ingredienser
- ✅ Allergen-deteksjon
- ✅ UPF-scoring (ultraprosesserte produkter)
- ✅ Historie og favoritter (lokal lagring)

#### Teknisk Stack
- React Native / Expo
- AsyncStorage for lokal lagring
- Open Food Facts API (ingen autentisering nødvendig)
- Basic error handling og offline-støtte

#### Datadekning
- **Mål:** ~40-50% treffrate i Danmark
- **Kilde:** Kun Open Food Facts (community-drevet)
- **Prioritet:** Få noe som fungerer, ikke perfekt

#### Beta-distribusjon
- **TestFlight (iOS)** - opptil 10.000 testere
- **Internal Testing (Android)** - Google Play
- **Beta-brukere:** 50-100 aktive brukere første måned

#### KPIer
- Treffrate (minst 40%)
- Scan-latency (under 3 sekunder)
- App-crashes (under 1%)
- Brukerfeedback (samle inn strukturert)

#### Risikoer og fallback
- **Hvis Open Food Facts er nede:** Vis cached data eller "Prøv igjen"-melding
- **Hvis treffrate er lavere enn 40%:** Prioriter produkter med høyest skanningsfrekvens

---

## Fase 2: Datadekning (Måned 3-6)

### Mål
Øke treffrate fra 40% til 70-80% gjennom flere datakilder.

### Strategi: Gradvis aktivering av kilder

#### 2.1 Salling Group API (Måned 3-4)
**Hvorfor først:**
- Stor markedsandel i Danmark
- Relativt enkle API-er
- God forbrukerkjennskap (Føtex, Netto, Bilka)

**Implementasjon:**
1. Søk om API-tilgang (uke 1-2)
2. Implementer klient med feature flag (uke 3)
3. Test med beta-brukere (uke 4)
4. Aktiver for alle hvis suksessfullt (uke 5-6)

**Forventet økning:** +15-20% treffrate

**Fallback:** Hvis API-tilgang ikke innvilges, gå videre til neste kilde.

#### 2.2 GS1 Trade Exact API (Måned 4-5)
**Hvorfor:**
- Autoritativ kilde med høyest datakvalitet
- God dekning av danske produkter
- Støtter både produktdata og bilder

**Implementasjon:**
1. Søk om API-tilgang (uke 1-3, kan ta tid)
2. Implementer klient (uke 4)
3. Prioriter GS1-data i merge-logikk (uke 5)
4. Test og valider kvalitet (uke 6)

**Forventet økning:** +10-15% treffrate, betydelig kvalitetsforbedring

**Fallback:** Bruk fortsatt Open Food Facts + Salling Group som backup.

#### 2.3 REMA 1000 / Coop APIer (Måned 5-6)
**Hvorfor:**
- Ytterligare markedsdekning
- Komplementerer Salling Group

**Implementasjon:**
1. Kontakt begge samtidig (uke 1)
2. Implementer den som svarer først (uke 2-3)
3. Aktiver med feature flag (uke 4)

**Forventet økning:** +5-10% treffrate per kilde

**Fallback:** Ikke kritisk - fortsett med eksisterende kilder.

### Datakvalitetsforbedringer

#### Intelligent merging (Måned 4-6)
- Slå sammen data fra flere kilder intelligent
- Prioriter autoritative kilder (GS1 > Kjeder > Open Food Facts)
- Fyll manglende felter fra lavere prioritetskilder
- Validere konsistens mellom kilder

#### Cache-strategi
- Cache-resultater i 24 timer
- Pre-cache populære produkter
- Cache-opprydding (7 dager)

#### Ukjente GTIN-er
- Logg alle ukjente GTIN-er
- Prioritér produkter med høyest skanningsfrekvens
- Manuell beriking basert på data

### KPIer Fase 2
- Treffrate: 70-80% (fra 40-50%)
- Datakvalitet: Source confidence >80% for 60% av produkter
- Response time: <2 sekunder (med caching)

---

## Fase 3: UI/UX-polish (Måned 6-8)

### Mål
Forbedre brukeropplevelse basert på beta-feedback.

### Prioriterte forbedringer

#### 3.1 Produktbilde-visning (Måned 6)
- Integrer GS1 Image API
- Fallback til Open Food Facts-bilder
- Lazy loading og caching
- Placeholder-design

#### 3.2 Forbedret error-håndtering (Måned 6-7)
- Tydelige feilmeldinger
- "Prøv igjen"-funksjonalitet
- Offline-støtte (vis cached data)
- Retry-logikk med exponential backoff

#### 3.3 Design-system (Måned 7)
- Konsistent fargepalett
- Typografi-system
- Komponentbibliotek
- Dark mode-støtte (valgfritt)

#### 3.4 Performance-optimalisering (Måned 7-8)
- Bildelazy loading
- Liste-virtualisering for historikk
- Reduser initial bundle size
- Optimaliser API-kall (batch hvor mulig)

#### 3.5 Tilgjengelighet (Måned 8)
- Screen reader-støtte
- Høy kontrast-modus
- Font-skalering
- Tastaturnavigasjon

### Beta-feedback loop
- Ukentlig feedback-samling
- Quick wins hver 2. uke
- Større forbedringer hver måned

### KPIer Fase 3
- App Store rating: >4.5 stjerner
- Brukerretensjon: >40% (7 dager)
- Load time: <2 sekunder
- Crash rate: <0.5%

---

## Fase 4: Skalerbarhet (Måned 9-12)

### Mål
Forberede appen for vekst og produksjonsbruk.

### Tekniske forbedringer

#### 4.1 Backend-infrastruktur (Måned 9-10)
**Hvorfor:**
- Reduser API-kall fra klient
- Sentralisert caching
- Analytics og logging
- Rate limit-håndtering

**Implementasjon:**
- Backend API (Node.js/Python)
- Redis-cache
- Database for analytics
- API-gateway for rate limiting

**Migrasjon:**
- Gradvis migrering (feature flag)
- Keep klient direkte som fallback
- Monitorer ytelse under migrering

#### 4.2 Monitoring og analytics (Måned 10)
- Error tracking (Sentry)
- Performance monitoring
- Anonymisert brukeranalytics
- API usage tracking
- Datadekning-metrics

#### 4.3 Database-berikelse (Måned 10-11)
- Egen database for produktdata
- Aggregerte data fra alle kilder
- Automatisk beriking av ukjente GTIN-er
- Produkt-update pipeline

#### 4.4 Skalerbarhetsforbedringer (Måned 11-12)
- CDN for bilder
- Database-optimalisering
- API-rate limit management
- Auto-scaling infrastructure

### Datadekning-forbedringer

#### OCR-fallback (Måned 11-12, valgfritt)
- Hvis GTIN ikke finnes, prøv OCR av produktnavn
- Fuzzy matching mot database
- Lavere konfidens, men bedre treffrate

#### Community-bidrag (Måned 12, valgfritt)
- La brukere rapportere manglende produkter
- Manuell verifisering og tillegg
- Prioritér basert på skanningsfrekvens

### KPIer Fase 4
- Treffrate: 80-85%
- Uptime: >99.5%
- Response time: <1 sekund (med backend)
- Kan håndtere 10.000+ daglige brukere

---

## Risikostyring og fallback-strategier

### API-tilgang ikke innvilges
- **Fallback:** Fortsett med Open Food Facts + andre kilder
- **Alternativ:** Kontakt produsenter direkte for data
- **Prioritet:** Fokuser på kilder som er tilgjengelige

### Treffrate lavere enn forventet
- **Analyse:** Logg ukjente GTIN-er og prioriter høyest frekvens
- **Manuell beriking:** Legg til mest skannede produkter manuelt
- **OCR:** Implementer OCR-fallback tidligere

### Performance-problemer
- **Caching:** Aggressiv caching på alle lag
- **Backend:** Migrer til backend tidligere hvis nødvendig
- **Optimalisering:** Prioriter performance-optimaliseringer

### Budget-begrensninger
- **Prioritering:** Fokus på datadekning først (fase 2)
- **Gratis alternativer:** Bruk Open Food Facts så lenge som mulig
- **Graduell aktivering:** Aktiver betalte APIer kun når nødvendig

---

## Milepæler og leveranser

### Måned 2: MVP klar
- ✅ Funksjonell app med Open Food Facts
- ✅ TestFlight-distribusjon
- ✅ 50-100 beta-brukere

### Måned 4: Første datakilde
- ✅ Salling Group API integrert
- ✅ Treffrate 55-60%
- ✅ 200+ beta-brukere

### Måned 6: GS1 integrert
- ✅ GS1 Trade Exact + Image API
- ✅ Treffrate 70-75%
- ✅ Høy datakvalitet
- ✅ 500+ beta-brukere

### Måned 8: UI/UX-polish
- ✅ Forbedret design og UX
- ✅ App Store rating >4.5
- ✅ 1000+ aktive brukere

### Måned 12: Produksjonsklar
- ✅ Backend-infrastruktur
- ✅ Treffrate 80-85%
- ✅ Skalerbar til 10.000+ brukere
- ✅ Klar for offentlig lansering

---

## Ressursbehov

### Måned 1-2 (MVP)
- 1 fullstack-utvikler
- Design-review (delvis)
- Beta-testing-koordinering

### Måned 3-6 (Datadekning)
- 1 fullstack-utvikler
- API-integrasjoner (fokusert arbeid)
- Testing og QA

### Måned 6-8 (UI/UX)
- 1 fullstack-utvikler
- Designer (delvis)
- Beta-testing og feedback

### Måned 9-12 (Skalerbarhet)
- 1 fullstack-utvikler
- DevOps-support (delvis)
- Monitoring og optimalisering

---

## Success Metrics

### Teknisk
- Treffrate: 40% → 80%
- Response time: <3s → <1s
- Uptime: >99%
- Crash rate: <0.5%

### Produkt
- App Store rating: >4.5
- Brukerretensjon: >40% (7 dager)
- Daglige aktive brukere: 1000+
- Datakvalitet: 60%+ produkter med høyt source confidence

---

## Notater

- **Fleksibilitet:** Roadmap kan justeres basert på feedback og ressurser
- **Prioritering:** Datadekning er kritisk for brukerværdi
- **Iterativt:** Små, hyppige releaser er bedre enn store, sjeldne
- **Målrettet:** Fokus på danske produkter og forbrukere

