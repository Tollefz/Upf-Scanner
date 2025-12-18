# TestFlight Beta-plan - Matvare-skanner-app

**Periode:** [Måned 1-2]  
**Antall brukere:** 30-50  
**Plattform:** iOS (TestFlight)  
**Status:** MVP / Beta

---

## Mål med betaen

### Hva vil vi lære?

1. **Funktionalitet**
   - Fungerer skanningen på ekte produkter?
   - Hva er faktisk treffrate på danske produkter?
   - Hvor mange ukjente produkter finner vi?

2. **Brukeropplevelse**
   - Er flyten intuitiv?
   - Hva er vanligste forvirringer?
   - Hvor lang tid tar det å scanne et produkt?

3. **Teknisk stabilitet**
   - Crashes eller kritiske bugs?
   - Ytelsesproblemer?
   - Kompatibilitet med ulike enheter?

4. **Verdi**
   - Gir appen faktisk verdi til brukerne?
   - Hva brukes den til?
   - Er det noe som mangler?

---

## Antall brukere

**Mål:** 30-50 aktive brukere

**Rekruttering:**
- Personlig nettverk: 15-20
- Facebook-grupper (mat/allergi): 10-15
- Reddit (r/denmark): 5-10
- Slack/Discord communities: 5-10

**Kriterier:**
- Danske brukere med interesse for mat/allergi/helse
- iPhone-eiere (iOS)
- Villige til å gi tilbakemelding

---

## Varighet

**Planlagt:** 4-6 uker

**Fase 1 (uke 1-2):** Initial testing
- 30-40 brukere
- Fokus på kritiske bugs og større problemer

**Fase 2 (uke 3-4):** Stabilitet og brukeropplevelse
- Fortsett med samme brukere + evt. nye (opp til 50)
- Fokus på forbedringer basert på feedback

**Fase 3 (uke 5-6):** Finale og evaluering
- Samle inn siste feedback
- Analysere data
- Bestemme neste steg

**Utvidelse:** Hvis vi trenger mer data, kan vi utvide med 2-4 uker.

---

## Brukeroppgaver (konkrete)

### Oppgave 1: Skanning (uke 1)
"Skann 10-15 forskjellige produkter du har hjemme. Noter ned:
- Fungerte skanningen?
- Fikk du produktinformasjon?
- Hva manglet?"

### Oppgave 2: Ukjente produkter (uke 1-2)
"Hvis du finner et produkt som ikke ble funnet, ta bilde og legg det til (via unknown product-flyten).
Hvor ofte skjer dette?"

### Oppgave 3: Daglig bruk (uke 2-4)
"Bruk appen når du handler matvarer. 
- Hvor ofte bruker du den?
- Hvilke produkter scanner du oftest?
- Hva er hovedgrunnen for bruk (allergier, næring, ingredienser)?"

### Oppgave 4: Feedback (uke 3-4)
"Fyll ut kort feedback-skjema om:
- Hva fungerer bra?
- Hva kan forbedres?
- Ville du anbefalt appen til andre? (ja/nei og hvorfor)"

### Oppgave 5: Edge cases (uke 4-5)
"Prøv å skanne:
- Et produkt i dårlig lys
- Et produkt med skadet strekkode
- Et produkt med meget lang ingrediensliste
Rapporter hva som skjer."

---

## Data som logges

### Automatisk logging

**Scan events:**
- GTIN skannet
- Tidspunkt
- Resultat (success/not_found/invalid)
- Hvilken kilde ga treff (hvis success)
- Latency (tid fra scan til resultat)

**Unknown products:**
- GTIN
- Har bilde? (ja/nei)
- Har brukernotat? (ja/nei)
- Antall ganger samme GTIN skannes

**Crashes:**
- Når skjedde crash?
- Hva gjorde brukeren (scan, vis produkt, annet)?
- Stack trace
- Device info (iOS version, modell)

**Ytelse:**
- Scan-to-result latency (P50, P95)
- Image load time
- App startup time

**Bruk:**
- Antall scans per bruker
- Sessions per dag
- Tidsbruk per session

### Beregnede metrics

- **Treffrate:** (Successful scans) / (Total scans)
- **Cache hit rate:** (Cache hits) / (Total lookups)
- **Crash rate:** (Crashes) / (Total sessions)
- **Retensjon:** Brukere som returnerer etter 7 dager

---

## Tilbakemeldinger

### Metode 1: Strukturert skjema (uke 3-4)
**Via Google Forms / Typeform:**
- 10-15 spørsmål
- Mest kritiske funksjoner
- Overall rating (1-5 stjerner)
- Hovedproblemer (multiple choice)
- Frie tekstfelt for detaljer

### Metode 2: TestFlight feedback (kontinuerlig)
- Bruk TestFlight's innebygde feedback-funksjon
- Spesielt for bugs og kritiske problemer
- Rask og enkel for brukerne

### Metode 3: Direkte kontakt (valgfritt)
- 5-10 aktive brukere får tilgang til Slack/email
- For dypere innsikt og follow-up-spørsmål
- Ikke for alle (kun de som ønsker)

### Metode 4: In-app feedback (valgfritt)
- Enkel "Gi feedback"-knapp i appen
- 1-click rating (1-5 stjerner)
- Valgfritt tekstfelt

### Hva vi spør om

1. **Funktionalitet**
   - Fungerte skanningen som forventet?
   - Var produktinformasjonen korrekt?
   - Hva manglet oftest?

2. **Brukeropplevelse**
   - Var appen lett å bruke?
   - Hva var mest forvirrende?
   - Hva var best/mest nyttig?

3. **Verdi**
   - Ville du bruke appen regelmessig?
   - Hva var hovedgrunnen for å bruke den?
   - Hva mangler for at du skal anbefale den?

4. **Tekniske problemer**
   - Opplevde du crashes?
   - Var appen treg?
   - Andre tekniske problemer?

---

## Success criteria (når er betaen vellykket?)

### Minimum (må oppnås for å fortsette)

1. **Stabilitet**
   - Crash rate <2%
   - Ingen kritiske bugs som blokkerer funksjonalitet

2. **Treffrate**
   - Opplevd treffrate ≥35% (over minimum 500 scans)
   - Minimum 20 brukere har scannet ≥10 produkter

3. **Feedback**
   - Minimum 30 svar på feedback-skjema
   - Minimum 50% sier de ville brukt appen igjen

### Mål (ideelt)

1. **Treffrate**
   - Opplevd treffrate ≥40%

2. **Stabilitet**
   - Crash rate <1%
   - P95 latency <3s

3. **Engasjement**
   - Minimum 50% 7-dagers retensjon
   - Gjennomsnittlig ≥5 scans per bruker

4. **Feedback**
   - Overall rating ≥3.5/5
   - Minimum 60% ville anbefale appen

### Bonus (ikke nødvendig, men bra)

- Noen brukere bruker appen daglig
- Positive anmeldelser/referanser
- Brukere foreslår forbedringer som gir mening

---

## Timeline

### Uke 1: Launch
- [ ] Inviter 30-40 brukere til TestFlight
- [ ] Send velkomst-email med instruksjoner
- [ ] Monitor crashes og kritiske bugs
- [ ] Quick fixes for blokkerende problemer

### Uke 2: Stabilisering
- [ ] Følg opp med brukere som ikke har scannet noe
- [ ] Analysere første data (treffrate, crashes)
- [ ] Implementer quick wins (små forbedringer)

### Uke 3: Feedback
- [ ] Send ut feedback-skjema
- [ ] Samle inn strukturert feedback
- [ ] Identifisere hovedtrekk i feedback

### Uke 4: Forbedringer
- [ ] Implementer største forbedringer basert på feedback
- [ ] Release update til beta-brukere
- [ ] Følg opp med brukere om forbedringer

### Uke 5-6: Evaluering
- [ ] Analysere alle data
- [ ] Vurdere success criteria
- [ ] Bestemme neste steg (fortsett beta, lansering, pivot)

---

## Neste steg etter beta

### Hvis vellykket (oppnår minimum criteria):
- Fortsett til fase 2 (flere datakilder, forbedringer)
- Utvid beta til Android
- Begynn forberedelse til offentlig lansering

### Hvis delvis vellykket:
- Fokuser på største problemområder
- Utvid beta med 2-4 uker
- Iterere på forbedringer

### Hvis ikke vellykket:
- Pivot strategi
- Fokuser på å løse kritiske problemer først
- Vurder om konseptet trenger endring

---

## Ressurser og verktøy

### TestFlight
- Distribusjon av beta-builds
- Innebygget feedback
- Crash reports

### Analytics (valgfritt)
- Firebase Analytics / Amplitude
- For brukerengasjement
- Screen flow analytics

### Error tracking
- Sentry (allerede i bruk)
- Automatisk crash reporting

### Feedback
- Google Forms / Typeform
- TestFlight feedback
- Email for direkte kontakt

---

## Notater

- **Ikke perfeksjon:** Beta er for å lære, ikke for perfekt produkt
- **Iterativt:** Små, hyppige updates basert på feedback
- **Åpen kommunikasjon:** Hold brukerne informert om hva som skjer
- **Realistisk:** Ikke overdriv ambisjoner eller love for mye
- **Fokus:** Hold fokus på MVP - ikke legg til nye features i beta-fasen

