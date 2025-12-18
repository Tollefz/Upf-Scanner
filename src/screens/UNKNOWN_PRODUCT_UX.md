# Unknown Product - UX-beskrivelse

## Flyt

### 1. Trigger
- Bruker scanner GTIN/EAN
- `lookupProduct(gtin)` returnerer `status: "not_found"`
- ProductScreen navigerer automatisk til UnknownProductScreen

### 2. UnknownProductScreen vises

**Header:**
- Stor ikon: 🔍
- Tittel: "Fant ikke produktet"
- Forklaring: "Hjelp oss å legge det til – tar under 10 sek"

**Hovedinnhold:**

**Bilde-seksjon:**
- Viser placeholder hvis ingen bilde
- To knapper:
  1. "📷 Ta bilde" (primær, grønn)
  2. "🖼️ Velg fra galleri" (sekundær, hvit)

**Manuell input (valgfritt):**
- Start: Skjult, vises som "+ Skriv navn manuelt (valgfritt)"
- Når klikket: Viser tekstfelt for produktnavn
- Placeholder: "F.eks. Nutella 400g"

**Action-knapper:**
- Hvis bilde eller navn er fylt ut:
  - Primær: "Lagre" (grønn)
  - Sekundær: "Hopp over" (hvit)
- Hvis ingenting er fylt ut:
  - Primær: "Hopp over" (grønn)

**Info-tekst nederst:**
- "Vi lagrer bildet og informasjonen lokalt. Når vi har backend klar, laster vi det opp automatisk."

### 3. Når bruker trykker "Lagre"
- Lagrer i AsyncStorage via `saveUnknownProduct()`
- Navigerer tilbake til ScanScreen
- Ingen bekreftelse (rask flyt)

### 4. Når bruker trykker "Hopp over"
- Navigerer tilbake til ScanScreen
- Lagrer ingenting

## Design-prinsipper

### Hyggelig, ikke feil
- ✅ "Fant ikke produktet" (ikke "Error" eller "Failed")
- ✅ "Hjelp oss å legge det til" (samarbeid, ikke feil)
- ✅ "tar under 10 sek" (setter forventning om rask flyt)

### Rask og enkel
- Minimum friction: Alt er valgfritt
- Enkel bilde-taking (1 klikk)
- Ingen kompleks validering
- Hopp over er alltid mulig

### Visuelt
- Stor, vennlig ikon
- Myke runde kort
- Klare CTA-knapper
- Ikke overfylt

## Data som lagres

```typescript
{
  gtin: "3017620422003",
  timestamp: "2024-01-15T10:30:00.000Z", // ISO 8601
  imageUri: "file:///path/to/image.jpg", // Local URI
  ocrText: undefined, // Kan legges til senere med OCR
  userNote: "Nutella 400g" // Valgfritt brukernotat
}
```

## Teknisk implementasjon

### Lagring
- AsyncStorage key: `unknown_products`
- Array av `UnknownProduct` objekter
- JSON serialisert

### Navigasjon
- ProductScreen → UnknownProductScreen (automatisk ved not_found)
- UnknownProductScreen → ScanScreen (når lagret/hoppet over)

### TODO for backend
- Funksjon for å upload alle ukjente produkter
- Automatisk sync når backend er klar
- Eventuelt slette lokalt etter vellykket upload

## Edge cases

### Ingen kameratillatelse
- Vis alert med forklaring
- Bruker kan fortsatt velge fra galleri

### Ingen bilde eller navn
- Bruker kan hoppe over
- Knapp vises som "Hopp over" i stedet for "Lagre"

### Feil ved lagring
- Vis alert
- Bruker kan prøve igjen
- Tilgang til "Hopp over" beholdes

