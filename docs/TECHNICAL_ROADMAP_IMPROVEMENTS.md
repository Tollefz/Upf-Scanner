# Roadmap-forbedringer - Kritisk gjennomgang

## Hovedforbedringer

### 1. Definition of Done (DoD) mangler per fase
**Problem:** Umulig å vite når en fase faktisk er "ferdig".

**Forslag:** Legg til DoD-seksjon per fase med konkrete krav:

```markdown
### Definition of Done - Fase 1: MVP/Beta
✅ Alle core features implementert og testet
✅ TestFlight-distribusjon fungerer
✅ Minimum 50 beta-brukere rekruttert og aktive
✅ Treffrate ≥40% målt over 500+ skanninger
✅ Scan-latency <3s i 95. persentil
✅ Crash rate <1% (målt over 7 dager)
✅ Strukturert feedback samlet fra minst 30 brukere
✅ Dokumentasjon oppdatert
✅ Kode review fullført
✅ Tekniske gjeld logget og prioritert
```

### 2. Global dekning vs opplevd dekning ikke skilt
**Problem:** "40% treffrate" kan bety to ting:
- Global: 40% av alle mulige danske produkter
- Opplevd: 40% av produkter brukere faktisk scanner

**Forslag:** Splitt metrics i to kategorier:

```markdown
### Datadekning Metrics

#### Global dekning
- **Mål:** % av alle danske GTIN-er som finnes i våre kilder
- **Måling:** (Antall unike GTIN-er i kilder) / (Estimert totale danske GTIN-er)
- **Fase 1:** 25-30% global dekning
- **Fase 2:** 40-50% global dekning

#### Opplevd dekning (cache-adjusted)
- **Mål:** % av brukerskanninger som gir treff
- **Måling:** (Successful lookups) / (Total scans)
- **Fase 1:** 40-50% opplevd dekning
- **Fase 2:** 70-80% opplevd dekning
- **Notat:** Med 24t cache kan opplevd dekning være høyere enn global pga. populasjonsskjevhet

#### Cache hit rate
- **Mål:** % av lookups som er cache hits
- **Fase 1:** 30-40% (ny app, få gjentatte skanninger)
- **Fase 2:** 50-60% (mer bruk, flere gjentatte produkter)
```

### 3. Risiko- og fallback-seksjonen er for generell
**Problem:** Mangler konkrete tiltak for API-feil, rate limits, manglende data.

**Forslag:** Utvid med konkrete scenarioer:

```markdown
## Risikostyring og fallback-strategier

### API-feil (5xx, timeout, network)

#### Scenario: Open Food Facts API nede
- **Deteksjon:** 3 påfølgende 5xx eller timeout >30s
- **Fallback:** 
  1. Vis cached data (hvis <24t gammel)
  2. Hvis ingen cache: "Prøv igjen" med retry-knapp
  3. Disable OFF provider i 5 min, prøv igjen
- **Monitoring:** Alert hvis OFF uptime <95% over 1 time

#### Scenario: Rate limit nådd (429)
- **Deteksjon:** HTTP 429 response fra API
- **Fallback:**
  1. Implementer exponential backoff (2s, 4s, 8s)
  2. Prioritér cached data
  3. Degrader til "lower quality" mode (færre API-kall)
- **Prevention:** 
  - Respekter rate limits (OFF: ~1000 req/min per IP)
  - Implementer request queue
  - Cache aggressivt

#### Scenario: Provider returnerer manglende data
- **Deteksjon:** API returnerer 200 men mangler kritiske felter (ingredienser, allergener)
- **Fallback:**
  1. Merge med data fra backup-kilde
  2. Vis "Delvis informasjon" badge
  3. Logg for kvalitetsanalyse
- **Action:** Review provider data quality, eskalér til provider hvis systematisk

### Datadekning-risikoer

#### Scenario: Treffrate lavere enn forventet (<35% i Fase 1)
- **Mål innen 2 uker:** Logg top 100 ukjente GTIN-er
- **Action:** 
  1. Manuelt legge til top 20 mest skannede
  2. Kontakt produsenter direkte for top 5
  3. Vurdere OCR-fallback tidligere
- **Decision point:** Hvis fortsatt <35% etter 4 uker, vurder alternativ datakilde

#### Scenario: Cache hit rate lavere enn forventet
- **Root cause:** For få gjentatte skanninger (for ny app) eller cache TTL for kort
- **Action:** 
  1. Øk cache TTL fra 24t til 48t (test)
  2. Pre-cache populære produkter basert på historikk
  3. Implementer predictive caching

### Infrastruktur-risikoer

#### Scenario: Backend nede (Fase 4)
- **Deteksjon:** Backend health check feiler 3x på rad
- **Fallback:** Degrader til klient-direkte API-kall (feature flag)
- **Monitoring:** Alert hvis backend uptime <99% over 15 min
- **SLA:** 99.5% uptime target, maks 4 timer downtime/måned
```

### 4. Observability-metrics mangler
**Problem:** Ingen konkret plan for hva som skal logges og måles.

**Forslag:** Legg til observability-seksjon:

```markdown
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
- Backend uptime (alert <99% over 15min)
- Client error rate (alert >2% av requests)

**Ytelse:**
- P95 latency per provider (alert >5s)
- P95 scan-to-result latency (alert >3s)
- Cache hit rate (alert <30%)

**Datadekning:**
- Global treffrate (daily)
- Opplevd treffrate (daily, cache-adjusted)
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
```

### 5. Urealistiske antagelser

**Problem 1:** "50-100 beta-brukere første måned" uten plan for rekruttering
**Forslag:**
```markdown
### Beta-brukerrekruttering
- **Kanaler:**
  1. Personlig nettverk: 20-30 brukere
  2. Facebook-grupper (mat/allergi): 30-50 brukere
  3. Reddit (r/denmark): 10-20 brukere
  4. Slack/Discord-communities: 10-20 brukere
- **Incentiv:** Tilstgang til beta + mulighet til å påvirke produktet
- **Track:** Conversion rate per kanal, aktivitetsnivå
```

**Problem 2:** "API-tilgang kan ta 1-3 uker" - GS1 kan ta mye lenger
**Forslag:**
```markdown
### Realistiske tidsrammer for API-tilgang
- **Salling Group:** 1-2 uker (har developer portal)
- **GS1:** 4-12 uker (kan kreve bedriftsavtale, kredittverdighet)
- **REMA 1000/Coop:** Ukjent (kan være helt utilgjengelig)
- **Fallback-plan:** Hvis GS1 tar >8 uker, start med Salling Group + OFF, legg til GS1 når klar
```

**Problem 3:** "Treffrate 70-80%" uten å definere hva dette faktisk betyr
**Forslag:** Se punkt 2 (global vs opplevd dekning)

**Problem 4:** "Klar for offentlig lansering" uten definisjon
**Forslag:**
```markdown
### Definition of Done - Produksjonsklar (Fase 4)
✅ Backend-infrastruktur i produksjon (99.5% uptime over 30 dager)
✅ Treffrate 80-85% (opplevd, målt over 10.000+ skanninger)
✅ P95 latency <1s (inkludert cache misses)
✅ Crash rate <0.5% (målt over 30 dager)
✅ Monitoring og alerting fungerer
✅ Disaster recovery plan dokumentert og testet
✅ App Store review godkjent (iOS + Android)
✅ Privacy policy og terms of service publisert
✅ GDPR-compliance verifisert
✅ Marketing-materiell klar
✅ Support-kanal etablert (email/chat)
```

### 6. Manglende tekniske detaljer

**Problem:** Cache-strategi nevnt men ikke detaljert nok.

**Forslag:** Utvid cache-seksjonen:

```markdown
#### Cache-strategi (detaljert)

**Client-side (AsyncStorage):**
- TTL: 24 timer (konfigurerbart)
- Max entries: 1000 produkter
- Eviction: LRU (Least Recently Used)
- Sync: AsyncStorage → backend (Fase 4) for analytics

**Backend (Redis, Fase 4):**
- TTL: 24 timer (synkronisert med client)
- Max entries: 100.000 produkter
- Eviction: LRU
- Replication: Master-slave for redundancy

**Pre-caching-strategi:**
- Top 100 mest skannede produkter (daglig oppdatering)
- Pre-cache ved app-start (background job)
- Pre-cache ved produktvisning (naboer i kategori)

**Cache invalidation:**
- Manuell: Admin panel for å invalidere spesifikke GTIN-er
- Automatisk: Hvis provider data endres signifikant (>10% forskjell)
```

### 7. Testing-strategi mangler

**Problem:** Ingen plan for testing før produksjon.

**Forslag:** Legg til testing-seksjon per fase:

```markdown
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
```

## Konkrete omskrivinger

### Eksempel 1: Fase 1 - Datadekning (forbedret)

**Før:**
```markdown
#### Datadekning
- **Mål:** ~40-50% treffrate i Danmark
- **Kilde:** Kun Open Food Facts (community-drevet)
- **Prioritet:** Få noe som fungerer, ikke perfekt
```

**Etter:**
```markdown
#### Datadekning

**Global dekning:**
- **Mål:** 25-30% av estimerte danske GTIN-er finnes i Open Food Facts
- **Kilde:** Kun Open Food Facts (community-drevet)
- **Måling:** (Unike GTIN-er i OFF for DK) / (Estimert totale DK GTIN-er: ~500k)

**Opplevd dekning:**
- **Mål:** 40-50% av brukerskanninger gir treff
- **Forklaring:** Med 24t cache og populasjonsskjevhet (folk scanner populære produkter) kan opplevd dekning være høyere enn global
- **Måling:** (Successful lookups) / (Total scans) over 500+ skanninger

**Cache hit rate:**
- **Mål:** 30-40% av lookups er cache hits
- **Forventning:** Lavere i starten (ny app), øker over tid med flere gjentatte skanninger
```

### Eksempel 2: Risiko-seksjon (forbedret)

**Før:**
```markdown
#### Risikoer og fallback
- **Hvis Open Food Facts er nede:** Vis cached data eller "Prøv igjen"-melding
- **Hvis treffrate er lavere enn 40%:** Prioriter produkter med høyest skanningsfrekvens
```

**Etter:**
```markdown
#### Risikoer og fallback-strategier

**API-tilgjengelighet:**
- **Scenario:** Open Food Facts API nede (>3 påfølgende 5xx eller timeout >30s)
- **Deteksjon:** Health check endpoint eller monitoring alert
- **Fallback:** 
  1. Vis cached data hvis <24t gammel
  2. Hvis ingen cache: "Prøv igjen" med retry-knapp (exponential backoff)
  3. Disable provider i 5 min, prøv igjen
- **Monitoring:** Alert hvis uptime <95% over 1 time
- **SLA:** OFF har typisk >99% uptime, men planlegg for 5% downtime

**Datadekning under forventet:**
- **Scenario:** Opplevd treffrate <35% etter 2 uker beta
- **Action plan:**
  1. Uke 1: Logg top 100 ukjente GTIN-er, analyser mønstre
  2. Uke 2: Manuelt legge til top 20 mest skannede
  3. Uke 3: Kontakt produsenter direkte for top 5
  4. Uke 4: Vurder alternativ datakilde eller OCR-fallback
- **Decision point:** Hvis fortsatt <35% etter 4 uker, pivot strategi

**Rate limiting:**
- **Scenario:** HTTP 429 fra Open Food Facts (de facto limit: ~1000 req/min per IP)
- **Prevention:** 
  - Implementer request queue
  - Respekter rate limits (maks 800 req/min for safety margin)
  - Cache aggressivt
- **Fallback:** Exponential backoff (2s, 4s, 8s), prioritér cached data
```

## Oppsummering av forbedringer

1. ✅ **Definition of Done** per fase med konkrete, målbare krav
2. ✅ **Global vs opplevd dekning** tydelig skilt med separate metrics
3. ✅ **Risiko- og fallback-seksjon** utvidet med konkrete scenarioer og action plans
4. ✅ **Observability-metrics** definert med logging-strategi og dashboard
5. ✅ **Urealistiske antagelser** identifisert og justert (API-tilgang, beta-rekruttering)
6. ✅ **Tekniske detaljer** utvidet (cache-strategi, testing)
7. ✅ **Konkrete eksempler** på omskrevet tekst for viktige seksjoner

## Prioritering av forbedringer

**Høy prioritet (implementer først):**
1. Definition of Done per fase
2. Global vs opplevd dekning
3. Risiko-scenarioer med action plans

**Medium prioritet:**
4. Observability-metrics
5. Testing-strategi
6. Tekniske detaljer (cache)

**Lav prioritet (men viktig):**
7. Urealistiske antagelser (juster ved behov)
8. Eksempler og dokumentasjon

