# GS1 Danmark - Dialogforberedelse

**Emne:** Produktdata API-tilgang (GTIN lookup)  
**Mål:** Få tilgang til GS1 Trade Exact / Image API for matvare-skanner-app  
**Kontekst:** Forbrukerrettet mobilapp i beta-fase

---

## Vanlige spørsmål fra GS1 Danmark

### Juridisk enhet / CVR

**Q: Hvilken juridisk enhet søker API-tilgang? Har dere CVR-nummer?**

**A:** 
Vi er [NAVN PÅ SELSKAP/BEDRIFT] med CVR-nummer [CVR-NR]. Vi er registrert i Danmark og opererer i henhold til dansk lovgivning.

*[Hvis du er enkeltperson/sideprosjekt:]* 
Vi er i oppstartfasen og arbeider med å etablere juridisk enhet. Vi planlegger å registrere selskap innen [tidspunkt]. For pilot-fasen kan vi diskutere alternativer, eller vi kan vente med formell tilgang til selskapet er etablert.

---

### Formål med databruken

**Q: Hva er formålet med appen? Hvordan skal GS1-data brukes?**

**A:**
Vi bygger en forbrukerrettet mobilapp som hjelper danske forbrukere med å få tilgang til produktinformasjon ved å skanne strekkoder (GTIN/EAN) på mat- og drikkevarer. 

Appen bruker GS1-data eksklusivt for å:
- Vise produktnavn, merke og beskrivelse
- Vise ingredienslister og allergeninformasjon
- Vise næringsinnhold
- Vise produktbilder (via GS1 Image API)

**Viktig:** Dette er read-only bruk - vi endrer ikke, lagrer ikke eller videreformidler data. Data vises kun til sluttbrukeren som skanner produktet. Vi respekterer alle vilkår og retningslinjer GS1 har for databruk.

---

### Read-only og visning

**Q: Bekreft at dette er read-only bruk og at data ikke lagres eller videreselges?**

**A:**
Ja, dette er 100% read-only bruk. Vi bekrefter at:
- Vi lagrer produktdata kun lokalt i appen (cache) for ytelsesformål, med maksimal lagringstid på 24 timer
- Vi videreselger ikke data til tredjeparter
- Vi bruker data kun for å vise informasjon til sluttbrukeren som skanner produktet
- Vi deler ikke data med andre tjenester eller plattformer
- Vi respekterer alle GS1 vilkår og retningslinjer

Vi er åpne for å signere en databehandleravtale eller tilsvarende dokument som bekrefter dette.

---

### Volum / Skalering

**Q: Hvor mange oppslag (GTIN lookups) forventer dere per dag/måned?**

**A:**
Vi er i beta-fase, så volumet er begrenset i starten:
- **Pilot/beta-fase (måned 1-6):** 500-2000 oppslag per dag (~15k-60k per måned)
- **Vekst-fase (måned 6-12):** 5000-15000 oppslag per dag (~150k-450k per måned)
- **Produksjon (år 1+):** 20000-50000 oppslag per dag (~600k-1.5M per måned), avhengig av adopsjon

Vi implementerer caching (24 timer) som reduserer faktiske API-kall betydelig. Vi estimerer at cache hit rate vil være 50-60%, så faktiske API-kall vil være lavere enn antall oppslag.

Vi forstår at GS1 kan ha rate limits eller volum-begrensninger, og vi er villige til å respektere disse. Vi kan også diskutere gradering av volum over tid.

---

### Backend-sikkerhet

**Q: Hvordan sikrer dere API-nøkler og håndterer backend-sikkerhet?**

**A:**
**Nåværende fase (beta):**
- API-nøkler lagres som miljøvariabler i Expo/React Native (ikke hardkodet)
- Klient-side caching i AsyncStorage (kryptert på iOS/Android)
- HTTPS for alle API-kall
- Ingen backend-infrastruktur enda (klient direkte til GS1 API)

**Fremtidig fase (produksjon, måned 9+):**
- Vi planlegger backend-infrastruktur med sentralisert nøkkel-håndtering
- API-nøkler lagres i secrets manager (AWS Secrets Manager / Azure Key Vault)
- Backend API med autentisering
- Rate limiting og monitoring
- Logging og audit trails

Vi er åpne for å gjennomgå sikkerhetskrav med GS1 og implementere tilleggsforanstaltninger hvis nødvendig.

---

### Image API / Bilder

**Q: Har dere behov for GS1 Image API, eller kun Trade Exact API?**

**A:**
Vi har behov for begge:
- **GS1 Trade Exact API:** For produktdata (navn, ingredienser, allergener, næring)
- **GS1 Image API:** For produktbilder (front-of-pack)

Bilder er viktig for brukeropplevelse, men Trade Exact API har høyest prioritet. Hvis det er begrensninger på Image API-tilgang, kan vi starte med Trade Exact API og legge til Image API senere.

Vi bruker bilder kun for visning i appen, ikke for lagring eller videresalg.

---

### Kommersiell vs Pilot-fase

**Q: Er dette en pilot/proof-of-concept, eller kommersiell produksjon?**

**A:**
Vi er i **beta/pilot-fase** akkurat nå (måned 1-6):
- Appen er i TestFlight/beta med begrenset antall brukere (50-500)
- Vi validerer konseptet og samler feedback
- Ingen kommersiell inntekt ennå

**Planlagt overgang til produksjon:**
- Måned 9-12: Forberedelse for offentlig lansering
- Måned 12+: Offentlig lansering med potensielt kommersiell modell

Vi er interessert i å diskutere:
- Pilot-avtale for beta-fasen
- Overgang til produksjonsavtale når vi nærmer oss lansering
- Eventuelle forskjeller i vilkår/kostnader mellom pilot og produksjon

Vi er åpne for å justere avtale basert på fase og volum.

---

### Teknisk integrasjon

**Q: Hvilken teknologi bruker dere? Hvordan integrerer dere med GS1 API?**

**A:**
**Teknologi:**
- React Native / Expo (mobilapp iOS/Android)
- TypeScript
- Native fetch API for HTTP-kall

**Integrasjon:**
- Direkte API-kall fra klient (i beta-fase)
- Planlagt backend-proxy (i produksjon)
- Feature flags for å aktivere/deaktivere GS1 provider
- Robust error handling og retry-logikk
- Respekterer rate limits

Vi kan dele teknisk dokumentasjon eller demo-kode hvis det hjelper GS1 med å forstå integrasjonen.

---

### Datakvalitet og fallback

**Q: Hva gjør dere hvis GS1 ikke har data for en GTIN?**

**A:**
Vi bruker flere datakilder i prioritert rekkefølge:
1. GS1 Trade Exact (høyest prioritet)
2. Salling Group API
3. Open Food Facts (fallback)

Hvis GS1 ikke har produktet, faller vi automatisk tilbake til andre kilder. Dette sikrer at brukerne får resultat uansett, men vi prioriterer GS1-data fordi det er mest autoritativt og pålitelig.

Vi kan også loggføre GTIN-er som mangler i GS1 (hvis GS1 ønsker dette for datakvalitetsforbedring).

---

### Business case og fremtid

**Q: Hva er forretningsmodellen? Hvordan skal dere tjene penger?**

**A:**
Vi er i valideringsfasen og tester ulike forretningsmodeller:
- **Muligheter:** Premium features, abonnement, eller forbrukerrettet reklame
- **Fremtidig:** Potensielt partnerskap med matvarekjeder eller helseorganisasjoner

**Viktig:** Vi forplikter oss til at GS1-data aldri vil bli brukt til å generere inntekt direkte (f.eks. ved å selge data). Appen genererer verdi gjennom brukeropplevelsen, ikke ved videresalg av data.

Vi kan diskutere eventuelle begrensninger GS1 har på kommersiell bruk, og vi respekterer disse fullt ut.

---

### Vilkår og avtaler

**Q: Har dere lest GS1 vilkår og API-dokumentasjon?**

**A:**
Ja, vi har gjennomgått:
- GS1 Trade Exact API-dokumentasjon
- GS1 Image API-dokumentasjon
- GS1 vilkår og retningslinjer for databruk

Vi er villige til å:
- Signere databehandleravtale
- Akseptere GS1 vilkår
- Implementere eventuelle tekniske krav
- Gjennomgå sikkerhetskrav

Vi er åpne for dialog om spesifikke vilkår eller krav vi må oppfylle.

---

### Tidslinje og neste steg

**Q: Når trenger dere tilgang? Hva er tidslinjen?**

**A:**
**Ønsket tidslinje:**
- **Måned 3-4:** Start implementering av GS1-klient
- **Måned 5-6:** Test med beta-brukere
- **Måned 6+:** Full aktivering i beta

Vi forstår at GS1 kan ha egen tidslinje for behandling av søknader (typisk 4-12 uker). Vi er fleksible og kan justere planene våre basert på GS1 sin kapasitet.

**Neste steg vi ser for oss:**
1. Initial dialog og forståelse av krav
2. Formell søknad (hvis nødvendig)
3. Gjennomgang av vilkår og avtaler
4. Teknisk onboarding og nøkkel-utlevering
5. Test-fase med begrenset volum

---

## Tips for dialogen

### DO's ✅
- Vær ærlig om fase og volum
- Vær åpen for kompromisser (f.eks. start med Trade Exact, legg til Image senere)
- Vis forståelse for GS1 sine prosesser og krav
- Foreslå pilot-avtale først, produksjon senere
- Vær tydelig på read-only bruk og respekt for data

### DON'Ts ❌
- Ikke overdriv volum eller ambisjoner
- Ikke lov noe du ikke kan levere (f.eks. "kommer til å være stort selskap")
- Ikke minimer sikkerhetskrav eller viktigheten av databehandling
- Ikke press på tid - GS1 har sine prosesser
- Ikke snakk nedsettende om konkurrenter eller andre datakilder

---

## Spørsmål å stille til GS1

### For å forstå prosessen:
1. "Hva er prosessen for å få API-tilgang? Er det noen søknadsskjema?"
2. "Hvor lang tid tar det typisk fra søknad til tilgang?"
3. "Er det forskjellige typer tilgang (pilot vs produksjon)?"
4. "Hva er rate limits eller volum-begrensninger?"

### For å forstå kostnader:
1. "Er det kostnader knyttet til API-tilgang? Pilot vs produksjon?"
2. "Er det noen minimumsforpliktelser eller bindingstid?"

### For å forstå tekniske krav:
1. "Er det spesielle sikkerhetskrav vi må oppfylle?"
2. "Kreves det backend eller kan vi kalle direkte fra klient?"
3. "Hva er dokumentasjonen og støtte-ressurser tilgjengelig?"

### For å forstå vilkår:
1. "Kan vi cache data lokalt i appen (24 timer) for ytelsesformål?"
2. "Er det begrensninger på hvordan data kan vises til brukere?"
3. "Må vi ha databehandleravtale eller lignende?"

---

## Forberedelser før møtet

### Dokumenter å ha klare:
- [ ] CVR-nummer (hvis selskap er registrert)
- [ ] Kort pitch om appen (1-2 minutter)
- [ ] Demo av appen (hvis mulig)
- [ ] Teknisk oversikt (hvilke teknologier, hvordan integrasjon vil se ut)

### Informasjon å ha klare:
- [ ] Estimert volum (realistisk, ikke overdriv)
- [ ] Tidslinje for beta og produksjon
- [ ] Hvilke API-er du trenger (Trade Exact, Image, eller begge)

### Spørsmål å ha klare:
- [ ] Liste over spørsmål til GS1 (se over)
- [ ] Alternativer hvis API-tilgang ikke går gjennom

---

## Eksempel på opening pitch

**"Hei, vi utvikler en forbrukerrettet mobilapp som hjelper danske forbrukere med å få tilgang til produktinformasjon ved å skanne strekkoder på matvarer. Vi er i beta-fase akkurat nå med 50-500 brukere, og vi søker API-tilgang til GS1 Trade Exact og Image API for å kunne tilby autoritativ produktdata. Vi bruker data read-only, kun for visning til sluttbrukeren, og vi respekterer alle GS1 vilkår. Vi er åpne for å starte med en pilot-avtale og diskutere overgang til produksjon senere. Kan vi gå gjennom prosessen og krav for å få tilgang?"**

Denne åpningen er:
- Tydelig på hva du gjør
- Ærlig om fase
- Respektfull for GS1 prosesser
- Åpen for dialog

