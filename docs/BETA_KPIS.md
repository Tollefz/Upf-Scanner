# Beta KPI-er - Produktleder Oversikt

## KPI Kategorier

### 1. Produktkvalitet
### 2. Datadekning
### 3. Brukeratferd

---

## KPI Tabell

| # | KPI | Kategori | Hvorfor viktig | Målverdi | Avgjør lansering? |
|---|-----|----------|----------------|----------|-------------------|
| 1 | **Crash rate** | Produktkvalitet | Høy crash rate = dårlig brukeropplevelse | <1% | ✅ Ja |
| 2 | **Scan latency (P95)** | Produktkvalitet | Trege scanninger frustrerer brukere | <3 sekunder | ✅ Ja |
| 3 | **Treffrate** | Datadekning | Lavere enn 30% = appen er ikke nyttig | ≥40% | ✅ Ja |
| 4 | **Cache hit rate** | Datadekning | Indikerer om caching fungerer | ≥30% | 🟡 Delvis |
| 5 | **Daglige aktive brukere (DAU)** | Brukeratferd | Brukerengasjement | ≥50% av beta-brukere | ✅ Ja |
| 6 | **7-dagers retensjon** | Brukeratferd | Hvis brukere kommer tilbake | ≥30% | ✅ Ja |
| 7 | **Scans per bruker (daglig)** | Brukeratferd | Hvor ofte brukeren scanner | ≥2 | 🟡 Delvis |
| 8 | **Rapport-konverteringsrate** | Brukeratferd | Hvor mange rapporterer ukjente produkter | ≥20% | 🟡 Delvis |
| 9 | **App Store rating** | Produktkvalitet | Brukertegnskap | ≥4.0 stjerner | ✅ Ja |
| 10 | **Error rate (API-kall)** | Produktkvalitet | Systemstabilitet | <5% | ✅ Ja |
| 11 | **Session duration** | Brukeratferd | Hvor lenge brukere er engasjert | ≥1 minutt | 🟡 Delvis |
| 12 | **Feedback response rate** | Brukeratferd | Brukeroppfatning | ≥40% | 🟡 Delvis |

---

## Detaljerte Forklaringer

### Produktkvalitet

#### 1. Crash Rate
**Hvorfor:** Høy crash rate betyr appen er ustabil og frustrerende å bruke.
**Måling:** (Antall crashes) / (Antall sessions) × 100
**Målverdi:** <1% (mindre enn 1 crash per 100 sessions)
**Avgjør lansering:** ✅ **Ja** - Hvis >2%, ikke klar for lansering

#### 2. Scan Latency (P95)
**Hvorfor:** Brukere forventer rask respons. Trege scanninger frustrerer.
**Måling:** 95. persentil av tiden fra scan til produktvisning
**Målverdi:** <3 sekunder (95% av scanninger skal være raskere)
**Avgjør lansering:** ✅ **Ja** - Hvis P95 >5s, ikke klar for lansering

#### 9. App Store Rating
**Hvorfor:** Indikerer generell brukeroppfatning.
**Måling:** Gjennomsnittlig rating i TestFlight/Google Play
**Målverdi:** ≥4.0 stjerner (av 5)
**Avgjør lansering:** ✅ **Ja** - Hvis <3.5, ikke klar for lansering

#### 10. Error Rate (API-kall)
**Hvorfor:** Systemstabilitet påvirker brukeropplevelse.
**Måling:** (Antall feilede API-kall) / (Totale API-kall) × 100
**Målverdi:** <5% (mindre enn 5% feil)
**Avgjør lansering:** ✅ **Ja** - Hvis >10%, ikke klar for lansering

---

### Datadekning

#### 3. Treffrate
**Hvorfor:** Lavere enn 30% betyr appen ikke fungerer godt nok.
**Måling:** (Successful lookups) / (Total scans) × 100
**Målverdi:** ≥40% (minst 40% av scanninger gir treff)
**Avgjør lansering:** ✅ **Ja** - Hvis <35%, ikke klar for lansering

#### 4. Cache Hit Rate
**Hvorfor:** Indikerer om caching fungerer og reduserer API-kall.
**Måling:** (Cache hits) / (Total lookups) × 100
**Målverdi:** ≥30% (minst 30% av lookups er cache hits)
**Avgjør lansering:** 🟡 **Delvis** - Ikke blokkerende, men viktig for ytelse

---

### Brukeratferd

#### 5. Daglige aktive brukere (DAU)
**Hvorfor:** Indikerer om brukere faktisk bruker appen.
**Måling:** (Antall unike brukere som bruker appen daglig) / (Totale beta-brukere) × 100
**Målverdi:** ≥50% (minst halvparten bruker appen daglig)
**Avgjør lansering:** ✅ **Ja** - Hvis <30%, ikke klar for lansering

#### 6. 7-dagers retensjon
**Hvorfor:** Hvis brukere ikke kommer tilbake, er appen ikke nyttig nok.
**Måling:** (Antall brukere som bruker appen 7 dager etter installasjon) / (Totale installasjoner) × 100
**Målverdi:** ≥30% (minst 30% kommer tilbake etter 7 dager)
**Avgjør lansering:** ✅ **Ja** - Hvis <20%, ikke klar for lansering

#### 7. Scans per bruker (daglig)
**Hvorfor:** Indikerer hvor engasjert brukeren er.
**Måling:** (Totale scans) / (DAU)
**Målverdi:** ≥2 (minst 2 scanninger per bruker per dag)
**Avgjør lansering:** 🟡 **Delvis** - Ikke blokkerende, men viktig for engagement

#### 8. Rapport-konverteringsrate
**Hvorfor:** Indikerer om brukere hjelper til med å forbedre databasen.
**Måling:** (Antall rapporter) / (Antall "not found" scanninger) × 100
**Målverdi:** ≥20% (minst 20% av "not found" scanninger blir rapportert)
**Avgjør lansering:** 🟡 **Delvis** - Ikke blokkerende, men viktig for datadekning

#### 11. Session Duration
**Hvorfor:** Indikerer hvor engasjert brukeren er.
**Måling:** Gjennomsnittlig tid brukeren er i appen per session
**Målverdi:** ≥1 minutt (minst 1 minutt per session)
**Avgjør lansering:** 🟡 **Delvis** - Ikke blokkerende, men viktig for engagement

#### 12. Feedback Response Rate
**Hvorfor:** Indikerer om brukere er engasjert og gir tilbakemelding.
**Måling:** (Antall brukere som gir feedback) / (Totale beta-brukere) × 100
**Målverdi:** ≥40% (minst 40% gir feedback)
**Avgjør lansering:** 🟡 **Delvis** - Ikke blokkerende, men viktig for forbedringer

---

## Kritiske KPI-er for Lansering

**MÅ oppfylle alle disse for å gå videre:**

1. ✅ Crash rate <1%
2. ✅ Scan latency (P95) <3s
3. ✅ Treffrate ≥40%
4. ✅ DAU ≥50%
5. ✅ 7-dagers retensjon ≥30%
6. ✅ App Store rating ≥4.0
7. ✅ Error rate <5%

**Anbefalte, men ikke blokkerende:**
- Cache hit rate ≥30%
- Scans per bruker ≥2
- Rapport-konverteringsrate ≥20%
- Session duration ≥1 minutt
- Feedback response rate ≥40%

---

## Måling og Rapportering

**Frekvens:**
- Daglig: Crash rate, DAU, scans per bruker
- Ukentlig: Treffrate, retensjon, error rate
- Månedlig: App Store rating, feedback response rate

**Dashboard:**
- Vis alle kritiske KPI-er på ett sted
- Alert ved avvik fra målverdier
- Trendlinjer over tid
