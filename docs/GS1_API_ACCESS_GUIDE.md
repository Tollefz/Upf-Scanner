# GS1 API-tilgang - Rådgivning

## Typiske Spørsmål fra GS1

### 1. "Hva er formålet med appen?"
**Hvorfor de spør:** De vil sikre at data brukes på riktig måte.

**Anbefalt svar:**
> "Vi utvikler en forbrukerrettet mobilapp som hjelper danske forbrukere med å få informasjon om matvarer ved å skanne strekkoder. Appen viser ingredienser, allergener og næringsinnhold for å hjelpe forbrukere med å ta informerte valg om mat."

### 2. "Er dette kommersiell bruk?"
**Hvorfor de spør:** Kommersiell bruk kan kreve betalt abonnement.

**Anbefalt svar:**
> "Appen er gratis for forbrukere og ikke-kommersiell i startfasen. Vi har ingen inntekter fra appen, og formålet er å gjøre produktinformasjon tilgjengelig for forbrukere. Hvis vi senere skulle introdusere inntektsgenerering, vil vi oppdatere GS1 om dette og følge relevante retningslinjer."

### 3. "Hvor mange brukere forventer dere?"
**Hvorfor de spør:** De trenger å vurdere volum og kapasitet.

**Anbefalt svar:**
> "Vi starter med en lukket beta (50-200 brukere) for å teste og forbedre appen. Over tid håper vi å nå flere tusen brukere, men vi starter smått og skalerer gradvis basert på feedback."

### 4. "Hvilke data trenger dere?"
**Hvorfor de spør:** De vil sikre at dere kun får data dere trenger.

**Anbefalt svar:**
> "Vi trenger produktinformasjon som:
> - Produktnavn og beskrivelse
> - Merke
> - Ingrediensliste
> - Allergener
> - Næringsinnhold
> - Produktbilde (hvis tilgjengelig)
> 
> Vi trenger IKKE priser, lagerstatus eller kommersielle data."

### 5. "Hvordan sikrer dere datakvalitet?"
**Hvorfor de spør:** De vil sikre at dataene deres presenteres korrekt.

**Anbefalt svar:**
> "Vi presenterer GS1-data som den autoritative kilden og prioriterer GS1-data over andre kilder. Vi viser også en kilde-indikator slik at brukere vet hvor dataene kommer fra. Vi implementerer cache-strategier for å redusere API-kall og sikre ytelse."

### 6. "Har dere tilgang til andre datakilder?"
**Hvorfor de spør:** De vil forstå hele datasettet deres.

**Anbefalt svar:**
> "Ja, vi bruker også Open Food Facts som fallback-kilde. Vi prioriterer GS1-data når det er tilgjengelig, og bruker Open Food Facts kun når GS1 ikke har produktet. Dette sikrer best mulig datadekning for brukerne våre."

---

## Bekymringer GS1 Har

### 1. **Misbruk av data**
- **Bekymring:** Data brukes til prissammenligning eller konkurranse
- **Mitigering:** Klargjør at appen er forbrukerrettet og ikke-kommersiell
- **Forslag:** Vurder å signere en avtale om ikke-kommersiell bruk

### 2. **Datakvalitet**
- **Bekymring:** Data presenteres feil eller utdatert
- **Mitigering:** Vis kilde-indikator, prioriter GS1-data, implementer cache-strategier
- **Forslag:** Tilby å vise hvordan dataene presenteres før lansering

### 3. **Skalering og kostnader**
- **Bekymring:** Høy trafikk kan påvirke deres systemer
- **Mitigering:** Implementer aggressiv caching, respekter rate limits
- **Forslag:** Vurder betalt abonnement hvis trafikken blir høy

### 4. **Kommersialisering**
- **Bekymring:** Appen blir kommersiell senere
- **Mitigering:** Vær ærlig om fremtidige planer
- **Forslag:** Vurder å signere en avtale om varsling ved kommersialisering

---

## API vs Excel-uttrekk vs Image/Exact

### GS1 Trade Exact (API)
**Hva det er:**
- REST API for produktdata
- Real-time oppslag via GTIN
- Støtter både tekst og bilder

**Fordeler:**
- Real-time data
- Automatisk oppdateringer
- Støtter bilder
- Skalerbart

**Ulemper:**
- Krever API-tilgang (kan ta 3-6 måneder)
- Kan kreve betalt abonnement
- Krever teknisk integrasjon

**Beste for:** Produksjonsapplikasjoner som trenger real-time data

### Excel-uttrekk
**Hva det er:**
- Eksport av produktdata til Excel/CSV
- Punkt-in-time snapshot
- Manuelt oppdatert

**Fordeler:**
- Enkelt å få tilgang
- Kan være gratis
- Enkelt å bruke

**Ulemper:**
- Ikke real-time
- Må oppdateres manuelt
- Ingen bilder
- Større filer

**Beste for:** Enkle analyser eller testing

### GS1 Image
**Hva det er:**
- API for produktbilder
- Kan brukes sammen med Trade Exact eller separat
- Støtter bilder i høy oppløsning

**Fordeler:**
- Høy kvalitet bilder
- Standardisert format
- Støtter flere bilder per produkt

**Ulemper:**
- Krever API-tilgang
- Kan kreve betalt abonnement
- Krever teknisk integrasjon

**Beste for:** Applikasjoner som trenger produktbilder

---

## Posisjonering for Å Få Ja

### 1. **Vær ærlig om formål**
- Ikke prøv å skjule at dette er en forbrukerapp
- Vær tydelig på at det ikke er kommersielt i startfasen
- Forklar hvordan dette gagner forbrukere

### 2. **Vis respekt for datakvalitet**
- Vis at dere prioriterer GS1-data
- Forklar hvordan dere presenterer dataene
- Tilby å vise demo før lansering

### 3. **Start smått**
- Start med beta (50-200 brukere)
- Vær realistisk om volum
- Vurder å begrense antall API-kall per dag

### 4. **Vær fleksibel**
- Vær åpen for betalt abonnement hvis nødvendig
- Vær åpen for begrensninger (rate limits, volum)
- Vær åpen for revisjon av bruk

### 5. **Vær proaktiv**
- Ta initiativ til å vise hvordan dataene brukes
- Vær åpen for feedback
- Vær åpen for revisjoner

---

## Anbefalt Tilnærming

### Fase 1: Første Kontakt
1. Send e-post med kort beskrivelse av prosjektet
2. Be om møte eller telefonsamtale
3. Vær klar på formål og omfang

### Fase 2: Søknad
1. Fyll ut offisiell søknad (hvis tilgjengelig)
2. Inkluder:
   - Beskrivelse av prosjektet
   - Formål og målgruppe
   - Estimert volum
   - Teknisk dokumentasjon
3. Vær klar på at dette er forbrukerrettet og ikke-kommersiell

### Fase 3: Dialog
1. Vær åpen for spørsmål
2. Vær ærlig om bekymringer
3. Vær fleksibel på løsninger

### Fase 4: Avtale
1. Les nøye gjennom avtalen
2. Vær klar på begrensninger (rate limits, volum)
3. Vær klar på revisjoner

---

## Realistisk Tidsramme

- **Første kontakt:** 1-2 uker
- **Søknad:** 2-4 uker
- **Dialog:** 2-4 uker
- **Avtale:** 2-4 uker
- **Teknisk integrasjon:** 1-2 uker

**Total: 3-6 måneder** (ikke uker!)

---

## Checkliste

- [ ] Klar beskrivelse av prosjektet
- [ ] Tydelig formål (forbrukerrettet, ikke-kommersiell)
- [ ] Realistisk volum-estimat
- [ ] Teknisk dokumentasjon
- [ ] Demo eller prototype (hvis mulig)
- [ ] Være åpen for betalt abonnement
- [ ] Være åpen for begrensninger
- [ ] Være åpen for revisjoner

