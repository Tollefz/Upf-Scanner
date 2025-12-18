# Teknisk Roadmap - Matvare-skanner-app (Revidert)

**Produkt:** Forbrukerrettet mobilapp for mat- og drikkevarer i Danmark  
**Periode:** 6-12 måneder  
**Status:** Tidlig stage / Pre-MVP

---

## Fase 1: MVP / Beta (Måned 1-2)

### Mål
Få appen i hendene på beta-brukere for å validere core-funksjonalitet og samle feedback.

### Funksjonalitet

#### Core Features
- ✅ Strekkode-skanning (EAN-8, EAN-13, UPC-A, GTIN-14)
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

**Global dekning:**
- **Mål:** 25-30% av estimerte danske GTIN-er finnes i Open Food Facts
- **Kilde:** Kun Open Food Facts (community-drevet)
- **Måling:** (Unike GTIN-er i OFF for DK) / (Estimert totale DK GTIN-er: ~500k)
- **Notat:** Global dekning er lavere enn opplevd dekning pga. populasjonsskjevhet

**Opplevd dekning (cache-adjusted):**
- **Mål:** 40-50% av brukerskanninger gir treff
- **Forklaring:** Med 24t cache og populasjonsskjevhet (folk scanner populære produkter) kan opplevd dekning være høyere enn global
- **Måling:** (Successful lookups) / (Total scans) over minimum 500 skanninger

**Cache hit rate:**
- **Mål:** 30-40% av lookups er cache hits
- **Forventning:** Lavere i starten (ny app), øker over tid med flere gjentatte skanninger

#### Beta-distribusjon
- **TestFlight (iOS)** - opptil 10.000 testere
- **Internal Testing (Android)** - Google Play
- **Beta-brukerrekruttering:**
  - Personlig nettverk: 20-30 brukere
  - Facebook-grupper (mat/allergi): 30-50 brukere
  - Reddit (r/denmark): 10-20 brukere
  - Slack/Discord-communities: 10-20 brukere
  - **Total mål:** 50-100 aktive brukere første måned

#### KPIer
- **Opplevd treffrate:** ≥40% (målt over 500+ skanninger)
- **Scan-latency:** P95 <3 sekunder
- **Cache hit rate:** 30-40%
- **App-crashes:** <1% (målt over 7 dager)
- **Brukerfeedback:** Strukturert feedback fra minst 30 brukere

#### Definition of Done - Fase 1
✅ Alle core features implementert og testet  
✅ TestFlight-distribusjon fungerer  
✅ Minimum 50 beta-brukere rekruttert og aktive  
✅ Opplevd treffrate ≥40% målt over 500+ skanninger  
✅ Scan-latency P95 <3s  
✅ Crash rate <1% (målt over 7 dager)  
✅ Strukturert feedback samlet fra minst 30 brukere  
✅ Unit tests for core utilities (GTIN validation, cache)  
✅ Dokumentasjon oppdatert  
✅ Kode review fullført  

#### Risikoer og fallback-strategier

**API-tilgjengelighet:**
- **Scenario:** Open Food Facts API nede (>3 påfølgende 5xx eller timeout >30s)
- **Deteksjon:** Health check endpoint eller client-side error tracking
- **Fallback:** 
  1. Vis cached data hvis <24t gammel
  2. Hvis ingen cache: "Prøv igjen" med retry-knapp (exponential backoff: 2s, 4s, 8s)
  3. Disable provider i 5 min, prøv igjen automatisk
- **Monitoring:** Alert hvis uptime <95% over 1 time
- **SLA:** OFF har typisk >99% uptime, men planlegg for 5% downtime

**Datadekning under forventet:**
- **Scenario:** Opplevd treffrate <35% etter 2 uker beta
- **Action plan:**
  1. Uke 1: Logg top 100 ukjente GTIN-er, analyser mønstre
  2. Uke 2: Manuelt legge til top 20 mest skannede produkter
  3. Uke 3: Kontakt produsenter direkte for top 5 produkter
  4. Uke 4: Vurder alternativ datakilde eller OCR-fallback tidligere
- **Decision point:** Hvis fortsatt <35% etter 4 uker, pivot strategi

**Rate limiting:**
- **Scenario:** HTTP 429 fra Open Food Facts (de facto limit: ~1000 req/min per IP)
- **Prevention:** 
  - Implementer request queue
  - Respekter rate limits (maks 800 req/min for safety margin)
  - Cache aggressivt (24t TTL)
- **Fallback:** Exponential backoff (2s, 4s, 8s), prioritér cached data

**Beta-brukerrekruttering:**
- **Fallback:** Hvis <30 aktive brukere etter 2 uker:
  1. Øk marketing-effort i Facebook-grupper
  2. Kontakt influencere/bloggere innen mat/allergi
  3. Vurder betalt reklame (Facebook Ads) med lite budsjett

---

## Fase 2: Datadekning (Måned 3-6)

### Mål
Øke opplevd treffrate fra 40% til 70-80% gjennom flere datakilder.

### Strategi: Gradvis aktivering av kilder

#### 2.1 Salling Group API (Måned 3-4)
**Hvorfor først:**
- Stor markedsandel i Danmark
- Relativt enkle API-er
- God forbrukerkjennskap (Føtex, Netto, Bilka)
- **Realistisk API-tilgang:** 1-2 uker (har developer portal)

**Implementasjon:**
1. Søk om API-tilgang (uke 1-2)
2. Implementer klient med feature flag (uke 3)
3. Test med beta-brukere (uke 4)
4. Aktiver for alle hvis suksessfullt (uke 5-6)

**Forventet økning:** +15-20% opplevd treffrate

**Fallback:** Hvis API-tilgang ikke innvilges innen 3 uker, gå videre til neste kilde.

#### 2.2 GS1 Trade Exact API (Måned 4-5)
**Hvorfor:**
- Autoritativ kilde med høyest datakvalitet
- God dekning av danske produkter
- Støtter både produktdata og bilder
- **Realistisk API-tilgang:** 4-12 uker (kan kreve bedriftsavtale, kredittverdighet)

**Implementasjon:**
1. Søk om API-tilgang (uke 1, forvent 4-12 uker svar)
2. Implementer klient med feature flag (parallelt med venting, uke 2-3)
3. Prioriter GS1-data i merge-logikk (uke 4-5)
4. Test og valider kvalitet (uke 6)

**Forventet økning:** +10-15% opplevd treffrate, betydelig kvalitetsforbedring

**Fallback:** Hvis API-tilgang tar >8 uker, start med Salling Group + OFF, legg til GS1 når klar.

#### 2.3 REMA 1000 / Coop APIer (Måned 5-6)
**Hvorfor:**
- Ytterligare markedsdekning
- Komplementerer Salling Group
- **Realistisk API-tilgang:** Ukjent (kan være helt utilgjengelig)

**Implementasjon:**
1. Kontakt begge samtidig (uke 1)
2. Implementer den som svarer først (uke 2-3)
3. Aktiver med feature flag (uke 4)

**Forventet økning:** +5-10% opplevd treffrate per kilde

**Fallback:** Ikke kritisk - fortsett med eksisterende kilder. Hvis ingen svar innen 4 uker, skip.

### Datakvalitetsforbedringer

#### Intelligent merging (Måned 4-6)
- Slå sammen data fra flere kilder intelligent
- Prioriter autoritative kilder (GS1 > Kjeder > Open Food Facts)
- Fyll manglende felter fra lavere prioritetskilder
- Validere konsistens mellom kilder

#### Cache-strategi (detaljert)
- **Client-side (AsyncStorage):**
  - TTL: 24 timer (konfigurerbart)
  - Max entries: 1000 produkter
  - Eviction: LRU (Least Recently Used)
- **Backend (Redis, Fase 4):**
  - TTL: 24 timer (synkronisert med client)
  - Max entries: 100.000 produkter
  - Eviction: LRU
- **Pre-caching-strategi:**
  - Top 100 mest skannede produkter (daglig oppdatering)
  - Pre-cache ved app-start (background job)
- **Cache invalidation:**
  - Manuell: Admin panel for å invalidere spesifikke GTIN-er
  - Automatisk: Hvis provider data endres signifikant (>10% forskjell)

#### Ukjente GTIN-er
- Logg alle ukjente GTIN-er med skanningsfrekvens
- Prioritér produkter med høyest skanningsfrekvens
- Manuell beriking basert på data (top 20 per uke)

### KPIer Fase 2
- **Opplevd treffrate:** 70-80% (fra 40-50%)
- **Global dekning:** 40-50% (fra 25-30%)
- **Cache hit rate:** 50-60% (fra 30-40%)
- **Datakvalitet:** Source confidence >80% for 60% av produkter
- **Response time:** P95 <2 sekunder (med caching)

### Definition of Done - Fase 2
✅ Minimum 2 nye datakilder integrert og aktivert  
✅ Opplevd treffrate 70-80% (målt over 2000+ skanninger)  
✅ Cache hit rate ≥50%  
✅ Intelligent merging implementert og testet  
✅ Provider hit rate metrics implementert  
✅ A/B testing av merge-strategier fullført  
✅ Dokumentasjon for nye providers oppdatert  

---

## Observability og Metrics

### Logging-strategi

#### Client-side logging (React Native)
```typescript
// Hva skal logges:
- Scan events: { gtin, timestamp, result, latency, source, cacheHit }
- API calls: { provider, gtin, status, latency, error }
- User actions: { action, screen, timestamp }
- Errors: { error, stack, context }
- Performance: { screen_load_time, image_load_time }
```

#### Backend logging (Fase 4)
- Request logs med correlation IDs
- Provider API calls med timing
- Cache hit/miss rates per provider
- Error rates per endpoint

### Key Metrics Dashboard

#### Produksjonsmetrikker (alert ved avvik)

**Tilgjengelighet:**
- API uptime per provider (alert <95% over 1t)
- Backend uptime (alert <99% over 15min, Fase 4)
- Client error rate (alert >2% av requests)

**Ytelse:**
- P95 latency per provider (alert >5s)
- P95 scan-to-result latency (alert >3s)
- Cache hit rate (alert <30%)

**Datadekning:**
- Global treffrate (daily)
- Opplevd treffrate (daily, cache-adjusted)
- Provider hit rate (hvilke kilder gir treff per GTIN)
- Top 20 ukjente GTIN-er (daily)

**Brukerengasjement:**
- Daglige aktive brukere (DAU)
- Scans per bruker (daily)
- Session duration
- Retensjon (7d, 30d)

#### Business Metrics
- Treffrate per kilde (hvilke kilder gir mest verdi)
- Kostnad per lookup (API-kostnader / successful lookups)
- Cache efficiency (cache hits / total lookups)
- Provider ROI (treffrate / API-kostnad)

### Monitoring Tools

**Fase 1-2 (Pre-backend):**
- Sentry for error tracking
- Analytics (Firebase/Amplitude) for brukermetrics
- Custom logging til AsyncStorage (sync til backend senere)

**Fase 3-4 (Med backend):**
- Sentry (error tracking)
- DataDog / New Relic (APM)
- Grafana (metrics visualization)
- PagerDuty (alerting)

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
- Load time: P95 <2 sekunder
- Crash rate: <0.5%

### Definition of Done - Fase 3
✅ Alle UI/UX-forbedringer implementert og testet  
✅ Usability testing med 10-15 brukere fullført  
✅ App Store rating ≥4.5 stjerner  
✅ 7-dagers retensjon ≥40%  
✅ Load time P95 <2s  
✅ Crash rate <0.5% (målt over 30 dager)  
✅ Accessibility testing fullført  

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

**Fallback:** Hvis backend nede, degrader til klient-direkte API-kall (feature flag)

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
- **Opplevd treffrate:** 80-85%
- **Global dekning:** 50-60%
- **Uptime:** >99.5%
- **Response time:** P95 <1 sekund (med backend)
- **Kan håndtere:** 10.000+ daglige brukere

### Definition of Done - Produksjonsklar (Fase 4)
✅ Backend-infrastruktur i produksjon (99.5% uptime over 30 dager)  
✅ Opplevd treffrate 80-85% (målt over 10.000+ skanninger)  
✅ P95 latency <1s (inkludert cache misses)  
✅ Crash rate <0.5% (målt over 30 dager)  
✅ Monitoring og alerting fungerer  
✅ Disaster recovery plan dokumentert og testet  
✅ App Store review godkjent (iOS + Android)  
✅ Privacy policy og terms of service publisert  
✅ GDPR-compliance verifisert  
✅ Marketing-materiell klar  
✅ Support-kanal etablert (email/chat)  

---

## Testing-strategi

### Fase 1: MVP/Beta
- **Unit tests:** Core utilities (GTIN validation, cache, merge logic)
- **Integration tests:** API clients (mock responses)
- **E2E tests:** Critical flows (scan → lookup → display)
- **Beta testing:** 50-100 brukere, strukturert feedback

### Fase 2: Datadekning
- **Provider tests:** Hver ny provider testes isolert med feature flag
- **A/B testing:** Test merge-strategier på subset av brukere
- **Load testing:** Simuler 1000+ samtidige lookups

### Fase 3: UI/UX
- **Usability testing:** 10-15 brukere per større endring
- **Performance testing:** Screen load times, image loading
- **Accessibility testing:** Screen reader, kontrast, font scaling

### Fase 4: Skalerbarhet
- **Stress testing:** Backend håndterer 10.000+ requests/min
- **Chaos engineering:** Test failure scenarios (API nede, cache miss)
- **Load testing:** Simuler produksjonslast (10.000+ DAU)

---

## Milepæler og leveranser

### Måned 2: MVP klar
- ✅ Funksjonell app med Open Food Facts
- ✅ TestFlight-distribusjon
- ✅ 50-100 beta-brukere
- ✅ Opplevd treffrate ≥40%

### Måned 4: Første datakilde
- ✅ Salling Group API integrert
- ✅ Opplevd treffrate 55-60%
- ✅ 200+ beta-brukere

### Måned 6: GS1 integrert
- ✅ GS1 Trade Exact + Image API
- ✅ Opplevd treffrate 70-75%
- ✅ Høy datakvalitet
- ✅ 500+ beta-brukere

### Måned 8: UI/UX-polish
- ✅ Forbedret design og UX
- ✅ App Store rating >4.5
- ✅ 1000+ aktive brukere

### Måned 12: Produksjonsklar
- ✅ Backend-infrastruktur
- ✅ Opplevd treffrate 80-85%
- ✅ Skalerbar til 10.000+ brukere
- ✅ Klar for offentlig lansering

---

## Notater

- **Fleksibilitet:** Roadmap kan justeres basert på feedback og ressurser
- **Prioritering:** Datadekning er kritisk for brukerværdi
- **Iterativt:** Små, hyppige releaser er bedre enn store, sjeldne
- **Målrettet:** Fokus på danske produkter og forbrukere

