# Roadmap - Kort oversikt

## Fase 1: MVP/Beta (Måned 1-2)
**Mål:** Få appen ut til beta-brukere

- Strekkode-skanning
- Open Food Facts (fallback)
- Grunnleggende produktvisning
- TestFlight-distribusjon
- **Treffrate:** 40-50%

---

## Fase 2: Datadekning (Måned 3-6)
**Mål:** Øk treffrate til 70-80%

**Måned 3-4:** Salling Group API (+15-20%)  
**Måned 4-5:** GS1 Trade Exact (+10-15%)  
**Måned 5-6:** REMA 1000 / Coop (+5-10% hver)

**Strategi:** Gradvis aktivering med feature flags  
**Fallback:** Open Food Facts som backup hvis API-tilgang ikke innvilges

---

## Fase 3: UI/UX-polish (Måned 6-8)
**Mål:** Forbedre brukeropplevelse

- Produktbilde-visning (GS1 Image)
- Forbedret error-håndtering
- Design-system og konsistens
- Performance-optimalisering
- Tilgjengelighet

**KPI:** App Store rating >4.5, brukerretensjon >40%

---

## Fase 4: Skalerbarhet (Måned 9-12)
**Mål:** Forberede for vekst

- Backend-infrastruktur (caching, rate limiting)
- Monitoring og analytics
- Database-berikelse
- Skalerbarhetsforbedringer

**KPI:** Treffrate 80-85%, uptime >99.5%, kan håndtere 10.000+ brukere/dag

---

## Nøkkeltall

| Metrikk | MVP | Fase 2 | Fase 3 | Fase 4 |
|---------|-----|--------|--------|--------|
| Treffrate | 40-50% | 70-80% | 70-80% | 80-85% |
| Response time | <3s | <2s | <2s | <1s |
| Beta-brukere | 50-100 | 200-500 | 500-1000 | 1000+ |
| Datakilder | 1 | 2-4 | 2-4 | 2-4 |

## Risikoer og fallback

✅ **API-tilgang ikke innvilges:** Fortsett med eksisterende kilder  
✅ **Lav treffrate:** Prioriter mest skannede produkter, manuell beriking  
✅ **Performance-problemer:** Aggressiv caching, backend-migrering  
✅ **Budget:** Prioriter gratis kilder først, gradvis aktivering

