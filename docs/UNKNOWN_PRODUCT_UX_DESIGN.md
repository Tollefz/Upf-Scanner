# Unknown Product UX Design - Lav Friksjon

## Design Prinsipper

1. **Ett trykk** - Ingen tekstinput, ingen valg
2. **Tydelig beskjed** - Brukeren forstår hva som skjedde
3. **Hyggelig bekreftelse** - "Takk for rapporten ❤️"
4. **Automatisk navigering** - Går tilbake til scan etter suksess

---

## UX Flow

### Skjerm 1: "Fant ikke produktet"
```
┌─────────────────────────────┐
│                             │
│          🔍                 │
│                             │
│   Fant ikke produktet       │
│                             │
│   Vi fant ikke dette        │
│   produktet i databasen.    │
│                             │
│   Strekkode:                │
│   3017620422003             │
│                             │
│   ┌─────────────────────┐   │
│   │  Rapporter produkt  │   │
│   └─────────────────────┘   │
│                             │
│   (Hopp over)               │
│                             │
└─────────────────────────────┘
```

**States:**
- Default: Vis skjerm 1
- Loading: Knapp viser "Sender..." med spinner
- Success: Naviger automatisk til skjerm 2
- Error: Vis feilmelding inline

### Skjerm 2: "Takk for rapporten ❤️"
```
┌─────────────────────────────┐
│                             │
│                             │
│          ❤️                 │
│                             │
│   Takk for rapporten!       │
│                             │
│   (Navigerer automatisk     │
│    tilbake til scanner)     │
│                             │
│                             │
└─────────────────────────────┘
```

**Duration:** 1.5 sekunder, deretter automatisk navigering

---

## Tekst og Knapper

### Skjerm 1: Unknown Product

**Header:**
- Ikon: 🔍 (stort, 64px)
- Tittel: "Fant ikke produktet"
- Undertekst: "Vi fant ikke dette produktet i databasen."

**GTIN Display:**
- Label: "Strekkode"
- Verdi: Monospace font, tydelig

**Action:**
- Primærknapp: "Rapporter produkt" (grønn)
  - Loading state: "Sender..." med spinner
  - Success: Naviger til skjerm 2
- Sekundærknapp: "Hopp over" (transparent, liten)
  - Naviger tilbake til scanner

### Skjerm 2: Success

**Content:**
- Ikon: ❤️ (stort, 64px)
- Tittel: "Takk for rapporten!"
- Undertekst: (ingen, eller "Sendes automatisk")

---

## States

### 1. Default State
- Vis skjerm 1
- "Rapporter produkt" knapp aktiv
- "Hopp over" knapp synlig

### 2. Loading State
- "Rapporter produkt" knapp disabled
- Viser "Sender..." med ActivityIndicator
- "Hopp over" knapp disabled

### 3. Success State
- Vis skjerm 2
- Automatisk navigering etter 1.5s
- Hvis offline: Vis "Lagret – sendes automatisk når du er på nett"

### 4. Error State
- Vis feilmelding inline under knappen
- "Rapporter produkt" knapp aktiv igjen
- Mulighet til å prøve igjen

---

## Komponenter

### UnknownProductScreen
- Enkel, ren layout
- Fokus på primæraksjon (rapporter)
- Ingen skjulte valg eller kompliserte interaksjoner

### ReportButton
- Stor, tydelig knapp
- Grønn farge (#4CAF50)
- Loading state med spinner
- Disabled state når loading

### SuccessState
- Fullscreen overlay eller egen skjerm
- Stor ikon (❤️)
- Tydelig takk-melding
- Automatisk navigering

