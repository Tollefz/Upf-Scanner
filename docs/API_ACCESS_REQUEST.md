# API-tilgangssøknad: Forbrukerrettet matvare-skanneapp

## Om appen

Vår mobilapp er en forbrukerrettet produktinformasjonsapp for mat og drikkevarer i Danmark. Appen lar brukere skanne strekkoder (GTIN/EAN) på produkter for å få tilgang til nærings- og allergeninformasjon, ingredienslister og produktopplysninger som hjelper dem til å ta informerte valg om matvarer.

## Formål med API-tilgang

Appen trenger tilgang til produktdata fra autoritative kilder for å:

- **Tilby korrekt produktinformasjon**: Autoritative kilder som GS1 og dagligvarekjeder har oppdatert, verifisert produktdata direkte fra produsenter
- **Maksimere treffrate**: Ved å kombinere flere datakilder kan vi sikre at flest mulig produkter finnes i systemet
- **Sikre datakvalitet**: Å slå opp i flere kilder lar oss validere og komplettere produktinformasjon for å gi brukerne mest mulig pålitelig data
- **Prioritere autoritative kilder**: Vi prioriterer data fra GS1 og offisielle kjede-APIer over community-drevne kilder, slik at brukerne får den mest pålitelige informasjonen først

## Bruksområder

Appen bruker API-ene **kun til lesing av produktinformasjon**:

- ✅ Henting av produktnavn, merke og beskrivelse
- ✅ Henting av næringsinnhold og ingredienslister
- ✅ Henting av allergeninformasjon (inkludert spor)
- ✅ Henting av produktbilder
- ✅ Validering av GTIN/EAN-koder

Appen bruker **ikke** API-ene til:
- ❌ Scraping av nettsider eller uautoriserte endepunkter
- ❌ Henting av priser eller markedsføringsinformasjon
- ❌ Skriving eller endring av data
- ❌ Konkurrentanalyse eller prissammenligning

## Datakilder og prioritering

Appen samler data fra flere kilder i en prioritert rekkefølge:

1. **GS1 Trade Exact / Image API** (høyest prioritet)
   - Autoritativ kilde med direkte data fra produsenter
   - Høyeste kvalitet og pålitelighet

2. **Offisielle kjede-APIer** (Salling Group, REMA 1000, Coop/365discount)
   - Verifiserte produktdata fra kjeder
   - Aktuelle produkter for danske forbrukere

3. **Open Food Facts** (fallback)
   - Community-drevet database
   - Brukes kun når autoritative kilder ikke har produktet

## Fokus på trygghet og korrekthet

Forbrukerne er avhengige av korrekt produktinformasjon, spesielt:
- **Allergener**: Livsviktig informasjon for allergikere
- **Næringsinnhold**: Viktig for helse- og kostholdshensyn
- **Ingredienslister**: Essensielt for informerte kjøp

Ved å bruke autoritative kilder sikrer vi at informasjonen er:
- **Oppdatert**: Direkte fra produsenter og kjeders systemer
- **Korrekt**: Verifisert og kvalitetssikret
- **Pålitelig**: Fra betrodde kilder med ansvar for datakvalitet

## Teknisk implementasjon

- Read-only API-tilgang (kun GET-forespørsler)
- Respekterer rate limits og API-vilkår
- Feature flags for å aktivere/deaktivere kilder gradvis
- Robust feilhåndtering og fallback-mekanismer
- Cache for å redusere API-kall (24 timer)

## Forbrukervennlighet

Appen er designet for å hjelpe forbrukere med å:
- Raskt få oversikt over produktets innhold
- Identifisere allergener og spor
- Lese ingredienslister
- Forstå næringsinnhold

Appen fokuserer på informasjon, ikke priser eller markedsføring, og respekterer brukerens valg basert på faktiske produktopplysninger.

## Konklusjon

Ved å gi oss tilgang til API-ene bidrar dere til en forbrukerrettet app som:
- Hjelper danske forbrukere med å ta informerte valg om matvarer
- Prioriterer korrekt, trygg og oppdatert produktinformasjon
- Respekterer API-vilkår og bruker kun lesetilgang
- Støtter forbrukere med allergier og spesielle kosthold

Vi setter stor pris på muligheten til å samarbeide med dere for å tilby brukerne våre den beste mulige produktopplevelsen.

