# Kritisk Gjennomgang - Technical Roadmap

**Dato:** [Dagens dato]  
**Gjennomgang av:** TECHNICAL_ROADMAP.md og TECHNICAL_ROADMAP_REVISED.md  
**Gjennomført av:** Senior teknisk arkitekt

---

## 1. EXECUTIVE SUMMARY

**Vurdering:** Roadmappen er **veldig ambisiøs** og inneholder flere **urealistiske antagelser**. Planen er teoretisk gjennomførbar, men risikerer å ta **2-3x lenger tid** enn estimert dersom ikke prioritering og scope justeres.

**Hovedproblemer:**
1. ⚠️ **API-tilgangstider er undervurdert** (GS1 kan ta 3-6 måneder)
2. ⚠️ **Backend-infrastruktur i Fase 4 er for kompleks** for MVP-behov
3. ⚠️ **Datadekning-estimater er optimistiske** uten validering
4. ⚠️ **Supabase er nevnt men ikke integrert** i planen
5. ⚠️ **Manglende kostnadsestimater** for API-tilgang og infrastruktur

**Realistisk tidsramme:** 12-18 måneder (ikke 6-12 måneder)

---

## 2. KONKRETE FORBEDRINGER

### 2.1 API-tilgangstider - KRITISK

**Problem:** Tidsrammer for API-tilgang er **drastisk undervurdert**.

**Nåværende plan:**
- Salling Group: 1-2 uker
- GS1: 4-12 uker
- REMA 1000/Coop: Ukjent

**Realitet:**
- **Salling Group:** 2-4 uker (realistisk)
- **GS1:** **3-6 måneder** (ikke uker!) - krever:
  - Bedriftsavtale
  - Kredittverdighet
  - Legal review
  - Potensielt betalt abonnement
- **REMA 1000/Coop:** Sannsynligvis **ikke tilgjengelig** for små aktører

**Anbefaling:**
```markdown
### Realistisk API-tilgangstidsplan

#### Måned 3: Start søknad samtidig
- Salling Group: Søk umiddelbart, forvent 2-4 uker
- GS1: Søk umiddelbart, forvent 3-6 måneder
- REMA/Coop: Kontakt, forvent "nei" eller ingen svar

#### Strategi: Parallelle spor
1. **Spor 1 (rask):** Salling Group + OFF (leverer i måned 4)
2. **Spor 2 (lang):** GS1 (leverer i måned 6-9, ikke måned 4-5!)
3. **Spor 3 (usikker):** Produsenter direkte (start tidlig, lave forventninger)

#### Fallback hvis GS1 tar >6 måneder:
- Fokus på Salling Group + OFF optimalisering
- Produsenter direkte for top 100 produkter
- OCR-fallback tidligere (måned 8 i stedet for måned 11)
```

### 2.2 Supabase-integrasjon - FORBEDRING

**Problem:** Supabase er nevnt, men ikke integrert i roadmap-logikk.

**Nåværende:** Backend i Fase 4 (måned 9-10)

**Anbefaling:** Flytt Supabase-tilgang **tidligere** (Fase 1-2):

```markdown
### Fase 1: MVP (Måned 1-2)
- ✅ Supabase for "unknown reports" (allerede implementert)
- ✅ Edge Functions for rate limiting
- ✅ Storage for bilder

### Fase 2: Datadekning (Måned 3-6)
- ✅ Supabase som cache-layer (PostgreSQL + Redis-like caching)
- ✅ Edge Functions som proxy for API-kall (skjuler nøkler)
- ✅ Analytics i Supabase (enkle queries)

### Fase 4: Skalerbarhet
- ❌ IKKE bygg egen backend fra scratch
- ✅ Bruk Supabase som primær backend
- ✅ Bare legg til hvis Supabase ikke er nok (Redis, CDN, etc.)
```

**Fordel:** Sparer 2-3 måneder backend-utvikling, bruk Supabase som den er designet.

### 2.3 Datadekning-estimater - REVISJON

**Problem:** Estimater er basert på antagelser, ikke data.

**Nåværende:**
- Fase 1: 40-50% opplevd treffrate
- Fase 2: 70-80% med 2-3 nye kilder
- Fase 4: 80-85%

**Realitet:** Disse tallene er **spesulative**. Vi vet ikke:
- Hvor mange danske produkter finnes i OFF
- Hvor stor overlap det er mellom Salling og OFF
- Hva GS1 faktisk dekker i Danmark

**Anbefaling:**
```markdown
### Konservativt vs Optimistisk Scenario

#### Fase 1 (MVP)
- **Konservativt:** 25-35% opplevd treffrate
- **Optimistisk:** 40-50% opplevd treffrate
- **Mål:** Minimum 30% for å fortsette

#### Fase 2 (med Salling + GS1)
- **Konservativt:** 50-60% (hvis overlap er stor)
- **Optimistisk:** 70-80% (hvis overlap er liten)
- **Mål:** Minimum 55% for å fortsette

#### Validering:
1. Mål treffrate i første uke (100+ skanninger)
2. Hvis <30%, pivot strategi umiddelbart
3. Logg alle ukjente GTIN-er fra dag 1
4. Analyser mønstre ukentlig
```

### 2.4 Feature Flags og Graduell Aktivering - GOD

**Nåværende plan:** Bra! Feature flags er nevnt.

**Forbedring:** Gjør det mer konkret:

```markdown
### Feature Flag Implementasjon

#### Fase 1: Baseline
```typescript
const FEATURES = {
  PROVIDER_OFF: true,
  PROVIDER_SALLING: false,
  PROVIDER_GS1: false,
  MERGE_STRATEGY: 'simple', // 'simple' | 'intelligent'
};
```

#### Fase 2: Graduell aktivering
1. **Uke 1:** Aktiver Salling for 10% av brukere (A/B test)
2. **Uke 2:** Hvis suksess (treffrate +5%), øk til 50%
3. **Uke 3:** Aktiver for alle
4. **Uke 4:** Aktiver intelligent merge for 10%
5. **Uke 5:** Hvis suksess, aktiver for alle

#### Rollback-plan:
- Hver provider kan deaktiveres umiddelbart (feature flag)
- Monitorer error rate, latency, treffrate
- Alert hvis degradasjon >10%
```

---

## 3. TEKNISK RISIKO

### 3.1 HØY RISIKO ⚠️⚠️⚠️

#### A. API-tilgang ikke innvilges
**Sannsynlighet:** Høy (50-70% for GS1, 30-50% for REMA/Coop)  
**Impact:** Høy (treffrate kan bli 40-50% i stedet for 70-80%)

**Mitigering:**
1. Start søknad **umiddelbart** (ikke vent til måned 3-4)
2. Parallell søknad til flere aktører
3. **Produsenter direkte** som fallback (tidligere i planen)
4. Aksept at 50-60% treffrate kan være realistisk

#### B. Datadekning lavere enn forventet
**Sannsynlighet:** Medium-Høy (40-50%)  
**Impact:** Høy (brukeropplevelse degradert)

**Mitigering:**
1. **Valider tidlig:** Mål treffrate fra dag 1
2. **Manuell beriking:** Top 100 produkter manuelt lagt til
3. **OCR-fallback tidligere:** Ikke måned 11, men måned 6-7
4. **Bruker-rapportering:** "Rapporter produkt" fungerer allerede - bruk den!

#### C. Supabase-kostnader vokser raskt
**Sannsynlighet:** Medium (30-40%)  
**Impact:** Medium (kan bli dyr)

**Mitigering:**
1. **Monitorer kostnader** fra dag 1
2. **Rate limiting** på Edge Functions (allerede implementert)
3. **Cache aggressivt** (24t TTL, LRU eviction)
4. **Vurder alternativ** hvis kostnader >$200/mnd (Vercel, Railway, etc.)

### 3.2 MEDIUM RISIKO ⚠️⚠️

#### D. Backend-infrastruktur blir for kompleks
**Sannsynlighet:** Medium (30-40%)  
**Impact:** Medium (kan ta lenger tid)

**Mitigering:**
1. **Bruk Supabase først** - ikke bygg egen backend
2. **Kun legg til** hvis Supabase ikke holder (Redis, CDN)
3. **Vurder serverless** (Vercel Functions, AWS Lambda) først

#### E. Performance-problemer med flere API-kall
**Sannsynlighet:** Medium (30-40%)  
**Impact:** Medium (dårlig brukeropplevelse)

**Mitigering:**
1. **Parallell API-kall** hvor mulig (Promise.all)
2. **Timeout per provider** (5s, ikke 10s)
3. **Cache aggressivt** (24t TTL)
4. **Graceful degradation** - vis delvis data hvis noen kilder feiler

### 3.3 LAV RISIKO ⚠️

#### F. Beta-brukerrekruttering vanskelig
**Sannsynlighet:** Lav (10-20%)  
**Impact:** Lav (kan utsette testing, men ikke blokkerende)

**Mitigering:**
1. Start rekruttering **tidlig** (uke 1-2, ikke uke 3-4)
2. Bruk flere kanaler (Facebook, Reddit, personlig nettverk)
3. **Incentiver:** Beta-brukere får tidlig tilgang + påvirker produktet

---

## 4. FORENKLINGER FOR RASKERE MVP

### 4.1 IKKE BYGG BACKEND (Fase 4) - SPAR 2-3 MÅNEDER

**Nåværende plan:** Bygg egen backend i Fase 4 (Node.js/Python + Redis + Database)

**Forenkling:** Bruk Supabase som primær backend

**Fordel:**
- ✅ Sparer 2-3 måneder utvikling
- ✅ Supabase håndterer scaling, backups, security
- ✅ Edge Functions for serverless logikk
- ✅ PostgreSQL for data
- ✅ Storage for bilder
- ✅ Real-time subscriptions (hvis nødvendig senere)

**Kun legg til hvis nødvendig:**
- Redis (kun hvis Supabase cache ikke holder)
- CDN (kun hvis bilder er problem)
- Separate API server (kun hvis Edge Functions ikke holder)

### 4.2 SKIP REMA 1000 / COOP INITIELLT - SPAR 1-2 MÅNEDER

**Nåværende plan:** Implementer REMA 1000 / Coop i måned 5-6

**Forenkling:** Skip disse initielt, fokus på:
1. Open Food Facts (allerede klar)
2. Salling Group (sannsynlig API-tilgang)
3. GS1 (høy verdi, men tar tid)

**Fordel:**
- ✅ Sparer 1-2 måneder utvikling
- ✅ Fokus på kilder med høyest ROI
- ✅ Kan legges til senere hvis nødvendig

### 4.3 SIMPLIFISERT MERGE-STRATEGI INITIELLT

**Nåværende plan:** Intelligent merging med kompleks logikk

**Forenkling:** Start med enkel strategi:
```typescript
// Fase 1-2: Enkel merge
function simpleMerge(results) {
  // Returner første resultat fra høyest prioritet
  return results.sort(byPriority)[0];
}

// Fase 3+: Intelligent merge (når nødvendig)
function intelligentMerge(results) {
  // Kompleks logikk med fylling av manglende felter
}
```

**Fordel:**
- ✅ Raskere implementering
- ✅ Enklere testing
- ✅ Kan optimaliseres basert på data

### 4.4 SKIP OCR I FASE 4 - SPAR 1-2 MÅNEDER

**Nåværende plan:** OCR-fallback i måned 11-12

**Forenkling:** Skip OCR initielt, fokus på:
1. GTIN-basert oppslag (høyest kvalitet)
2. Bruker-rapportering (allerede implementert)
3. Manuell beriking (top 100 produkter)

**Fordel:**
- ✅ OCR er kompleks (image processing, fuzzy matching)
- ✅ Lavere datakvalitet
- ✅ Kan legges til senere hvis treffrate er for lav

**Når vurdere OCR:**
- Hvis treffrate er <50% etter 6 måneder
- Hvis brukere ber om det
- Hvis man har ressurser

---

## 5. REALISTISK TIDSRAMME

### Nåværende Plan (6-12 måneder)
```
Måned 1-2: MVP
Måned 3-6: Datadekning
Måned 6-8: UI/UX
Måned 9-12: Skalerbarhet
```

### Realistisk Plan (12-18 måneder) - MED FORENKLINGER

```
Måned 1-2: MVP (✅ realistisk)
  - Open Food Facts
  - Supabase for unknown reports
  - Beta-distribusjon

Måned 3-5: Første datakilde (⚠️ ta hensyn til API-tilgang)
  - Måned 3: Start søknad Salling + GS1
  - Måned 4: Salling API tilgang (hvis heldig)
  - Måned 5: Salling implementert

Måned 6-9: GS1 (⚠️ tar lengre tid)
  - Måned 6: GS1 API-tilgang (hvis heldig, kan ta til måned 9)
  - Måned 7-8: GS1 implementert

Måned 10-12: UI/UX + Optimalisering
  - Design-system
  - Performance
  - Testing

Måned 13-15: Skalerbarhet (hvis nødvendig)
  - Supabase optimalisering
  - CDN for bilder (hvis nødvendig)
  - Monitoring
```

### Realistisk Plan (9-12 måneder) - MED AGGRESSIV FORENKLING

```
Måned 1-2: MVP (✅ realistisk)
Måned 3-4: Salling Group (✅ realistisk hvis API-tilgang)
Måned 5-6: UI/UX polish
Måned 7-9: GS1 (hvis tilgang)
Måned 10-12: Optimalisering og produksjon
```

**Anbefaling:** Gå for aggressiv forenkling først, legg til kompleksitet når nødvendig.

---

## 6. KOSTNADSESTIMATER (MANGENDE I ROADMAP)

### Måned 1-2 (MVP)
- Supabase: $0-25/mnd (Free tier eller Pro)
- TestFlight: $0 (inkludert i Apple Developer)
- Total: **~$25/mnd**

### Måned 3-6 (Datadekning)
- Supabase: $25-100/mnd (avhengig av trafikk)
- API-kostnader: $0-200/mnd (avhengig av Salling/GS1 prising)
- Total: **~$50-300/mnd**

### Måned 7-12 (Skalerbarhet)
- Supabase: $100-500/mnd (høy trafikk)
- API-kostnader: $200-1000/mnd
- CDN (hvis nødvendig): $50-200/mnd
- Monitoring (Sentry): $26-80/mnd
- Total: **~$400-1800/mnd**

**Anbefaling:** Budget for $1000-2000/mnd fra måned 6+, $500/mnd før det.

---

## 7. PRIORITERT HANDLINGSPLAN

### Umiddelbart (Uke 1-2)

1. ✅ **Start API-søknader NÅ**
   - Salling Group: Søk umiddelbart
   - GS1: Søk umiddelbart (kan ta 3-6 måneder)
   - REMA/Coop: Kontakt, lave forventninger

2. ✅ **Valider datadekning**
   - Test med 100+ danske produkter
   - Mål treffrate fra dag 1
   - Logg alle ukjente GTIN-er

3. ✅ **Forenklet MVP-scope**
   - Skip backend (bruk Supabase)
   - Skip REMA/Coop initielt
   - Fokus på OFF + Salling

### Måned 1-2 (MVP)

1. ✅ **Lever MVP**
   - Open Food Facts fungerer
   - Supabase for unknown reports
   - Beta-distribusjon

2. ✅ **Valider treffrate**
   - Mål over 500+ skanninger
   - Hvis <30%, pivot umiddelbart

### Måned 3-6 (Datadekning)

1. ✅ **Salling Group**
   - Implementer når API-tilgang er klar
   - A/B test med feature flags
   - Monitorer treffrate

2. ⏳ **GS1**
   - Vent på API-tilgang (kan ta til måned 6-9)
   - Implementer når klar

### Måned 6-12 (Optimalisering)

1. ✅ **UI/UX polish**
2. ✅ **Performance-optimalisering**
3. ✅ **Monitoring og analytics**

---

## 8. KONKLUSJON

### Er planen realistisk?

**Kort svar:** **Delvis**. Planen er **teoretisk gjennomførbar**, men:
- ⚠️ **API-tilgangstider er undervurdert** (GS1 tar 3-6 måneder, ikke 4-12 uker)
- ⚠️ **Backend-infrastruktur er over-engineered** (bruk Supabase først)
- ⚠️ **Datadekning-estimater er optimistiske** (valider tidlig)
- ⚠️ **Tidsramme er optimistisk** (12-18 måneder er mer realistisk)

### Anbefaling

1. ✅ **Forenklet scope først:**
   - Skip egen backend (bruk Supabase)
   - Skip REMA/Coop initielt
   - Fokus på OFF + Salling + GS1

2. ✅ **Start API-søknader umiddelbart:**
   - Ikke vent til måned 3-4
   - Parallell søknad til flere aktører

3. ✅ **Valider tidlig:**
   - Mål treffrate fra dag 1
   - Pivot hvis <30% etter 2 uker

4. ✅ **Realistisk tidsramme:**
   - MVP: 2 måneder ✅
   - Datadekning: 4-6 måneder (ikke 3-6)
   - UI/UX: 2-3 måneder
   - Total: **10-12 måneder** (med forenklinger)

### Risikofaktorer

- 🔴 **Høy risiko:** API-tilgang ikke innvilges (50-70% for GS1)
- 🟡 **Medium risiko:** Datadekning lavere enn forventet (40-50%)
- 🟢 **Lav risiko:** Beta-rekruttering (10-20%)

### Success Metrics

**Minimum viable:**
- ✅ Treffrate ≥30% (Fase 1)
- ✅ Treffrate ≥50% (Fase 2)
- ✅ <1% crash rate
- ✅ <3s scan latency (P95)

**Mål:**
- 🎯 Treffrate ≥40% (Fase 1)
- 🎯 Treffrate ≥70% (Fase 2)
- 🎯 <0.5% crash rate
- 🎯 <2s scan latency (P95)

---

**Neste steg:** Gjennomgå denne vurderingen, juster roadmap, og start implementering med forenklet scope.

