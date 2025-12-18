# MVP-flyt - Forbedringsforslag

## Oversikt
Flyt: ScanScreen → ProductScreen → Scan på nytt (via "Scan nytt produkt")

## Identifiserte forbedringer

### 1. ScanScreen - Loading state
**Nåværende:** Enkel tekst "Ber om kameratillatelse..."

**Forbedring:**
- Legg til ActivityIndicator for visuell feedback
- Mer tydelig at appen jobber med noe

### 2. ScanScreen - Permission denied state
**Nåværende:** God, men kan være mer forståelig

**Forbedring:**
- Forklar hva som skjer hvis de ikke gir tillatelse
- Mer eksplisitt om at appen ikke kan fungere uten

### 3. ScanScreen - Invalid GTIN handling
**Nåværende:** Logges til console, ingen bruker-feedback

**Forbedring:**
- Vis kort toast/banner når ugyldig GTIN skannes
- Eller: Ignorer stille (som nå), men vurder om dette er forvirrende

### 4. ProductScreen - Loading state
**Nåværende:** "Henter produkt..." med ActivityIndicator

**Forbedring:**
- Potensielt legge til estimert tid eller hva som skjer
- Men kan være overkill for MVP

### 5. ProductScreen - Empty states
**Nåværende:** Viser "Navn ikke tilgjengelig" hvis title mangler

**Forbedring:**
- Vurder å ikke vise header i det hele tatt hvis data mangler
- Eller: Vis kun det som finnes

### 6. ProductScreen - Bottom button
**Nåværende:** "Scan nytt produkt" er tydelig og god plassert

**Forbedring:**
- Ingen forbedring nødvendig - dette er bra

### 7. Språk og tone
**Nåværende:** Generelt bra, men noen små justeringer mulig

**Forbedringer:**
- "Navn ikke tilgjengelig" → "Ingen navn" eller bare ikke vis
- "Henter produkt..." → "Henter produktinformasjon..." (mer spesifikt)

---

## Konkrete kodeendringer

### ScanScreen.tsx

1. **Forbedre loading state:**
   - Legg til ActivityIndicator
   - Bedre visuell feedback

2. **Forbedre permission text:**
   - Mer eksplisitt om konsekvenser
   - Vennligere språk

3. **Invalid GTIN feedback (valgfritt):**
   - Vurder kort toast, men kan også la være stille

### ProductScreen.tsx

1. **Fjern/forbedre empty states:**
   - Ikke vis "Navn ikke tilgjengelig"
   - Vis kun felter som har data

2. **Forbedre loading text:**
   - "Henter produktinformasjon..." (mer spesifikt)

---

## UI-justeringer (små)

1. **ScanScreen:**
   - Legg til ActivityIndicator i loading state
   - Bedre spacing i permission container

2. **ProductScreen:**
   - Skjul title hvis den er "Navn ikke tilgjengelig"
   - Forbedret spacing mellom elementer

3. **Generelt:**
   - Konsistent spacing (bruk theme.ts)
   - Tydeligere primærhandling (allerede bra)

---

## States som er håndtert

✅ **ScanScreen:**
- Loading permission: Håndtert (kan forbedres med ActivityIndicator)
- Permission denied: Håndtert godt
- Scanning: Håndtert med scan frame overlay
- Invalid GTIN: Håndtert stille (kan forbedres)

✅ **ProductScreen:**
- Loading: Håndtert med ActivityIndicator
- Success: Håndtert med produktvisning
- Not found: Håndtert ved navigasjon til UnknownProductScreen
- Error: Håndtert ved navigasjon til UnknownProductScreen

---

## Ikke-MVP elementer (skal fjernes)

Ingen funnet - ProductScreen er allerede MVP-fokusert.

