# API-tilgangssøknad - Kort versjon

**Om appen:** Forbrukerrettet mobilapp som lar brukere skanne strekkoder på matvarer for å få tilgang til nærings- og allergeninformasjon, ingredienslister og produktopplysninger.

**Behov for API-tilgang:** Vi trenger tilgang til autoritative produktdata for å tilby korrekt, oppdatert og trygg produktinformasjon til forbrukere. Ved å kombinere flere datakilder (GS1, kjede-APIer, Open Food Facts) maksimaliserer vi treffraten og sikrer høy datakvalitet gjennom validering fra flere kilder.

**Bruk:** Read-only tilgang kun til produktinformasjon (navn, ingredienser, allergener, næringsinnhold, bilder). Vi bruker ikke API-ene til scraping, prishenting, skriving eller markedsføring. Fokuset er utelukkende på å gi forbrukere korrekt og trygg produktinformasjon for informerte kjøp.

**Prioritering:** Vi prioriterer autoritative kilder (GS1, kjede-APIer) over community-drevne kilder, slik at forbrukere får mest pålitelig informasjon først – noe som er særlig viktig for allergener og næringsinnhold.

**Teknisk:** Vi respekterer rate limits, bruker feature flags for gradvis aktivering, har robust feilhåndtering og cache for å redusere API-kall.

