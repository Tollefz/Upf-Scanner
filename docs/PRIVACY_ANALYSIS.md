# Personvernanalyse - Unknown Product Reports

## Datamodell Oversikt

### Nåværende Felt

| Felt | Type | Personvern-vurdering | Anbefaling |
|------|------|---------------------|------------|
| `id` | UUID | ⚪ Teknisk ID | ✅ Behold |
| `created_at` | TIMESTAMPTZ | 🟡 Tidspunkt kan brukes til sporing | ✅ Behold (nødvendig for funksjonalitet) |
| `gtin` | TEXT | ⚪ Produktkode | ✅ Behold |
| `manual_name` | TEXT | ⚪ Produktnavn | ✅ Behold (optional) |
| `note` | TEXT | 🟡 Bruker input, kan inneholde persondata | ✅ Behold (optional, men advar) |
| `ocr_text` | TEXT | ⚪ Tekst fra bilde | ✅ Behold (optional) |
| `image_path` | TEXT | ⚪ Filsti | ✅ Behold |
| `image_public_url` | TEXT | ⚪ Ikke brukt (private bucket) | ❌ Fjern (ikke i bruk) |
| `app_version` | TEXT | ⚪ Teknisk info | ✅ Behold (optional) |
| `platform` | TEXT | ⚪ ios/android | ✅ Behold (optional) |
| `locale` | TEXT | 🟡 Språkinnstilling (kan indikere region) | ✅ Behold (optional, generell info) |
| `device_hash` | TEXT | 🟡 Kan brukes til sporing | ✅ Behold, men beskriv som anonym |

## Personvern-anbefalinger

### ✅ Behold (Minimum Data)

**Påkrevd:**
- `gtin` - Produktkode (nødvendig for funksjonalitet)
- `created_at` - Tidsstempel (nødvendig for funksjonalitet)

**Anbefalt (Optional):**
- `manual_name` - Produktnavn (brukerens hjelp, ikke persondata)
- `ocr_text` - Tekst fra bilde (forbedrer produktdata)
- `image_path` - For å lagre produktbilde
- `note` - Brukerens valgfrie notat (ADVAR mot persondata)

**Teknisk (Optional, men nyttig):**
- `app_version` - For debugging og support
- `platform` - For debugging og support
- `locale` - For å forstå språkbruk (generell info, ikke GPS)
- `device_hash` - For misbrukskontroll (MÅ beskrives som anonym)

### ❌ Fjern/Ikke Samle

- `image_public_url` - Ikke i bruk, fjern fra schema
- GPS-lokasjon - Ikke samle
- Bruker-ID - Ikke samle
- E-post/telefon - Ikke samle
- Navn - Ikke samle (kun produktnavn)
- IP-adresse - Ikke logge (bruk signed URLs som ikke logger IP)

### ⚠️ Spesielle Vurderinger

**device_hash:**
- Beskriv som "anonym teknisk identifikator"
- Bruk kun for misbrukskontroll (rate limiting)
- Ikke knytt til brukerkonto eller annen persondata
- Ikke bruk til reklame eller profilering
- Vurder å rotere/anonimisere etter tid

**created_at:**
- Nødvendig for funksjonalitet
- Kan anonymiseres etter X dager (f.eks. beholde kun måned/år etter 30 dager)

**locale:**
- Generell språkinnstilling (f.eks. "da-DK")
- Ikke spesifikk GPS-lokasjon
- Kan være nyttig for produktdata-berikelse
- OK å beholde

**note:**
- Valgfritt felt fra bruker
- Kan potensielt inneholde persondata hvis bruker skriver det
- Advarsel i UI: "Ikke skriv persondata"
- Vurder å sjekke/sanitere innhold

## GDPR Compliance Checklist

### ✅ Minimering av Persondata
- ✅ Samler kun nødvendige data
- ✅ Ingen direkte persondata (navn, e-post, telefon)
- ✅ Ingen GPS-lokasjon
- ✅ Ingen bruker-ID

### ✅ Lovlig Grunnlag
- **Artikkel 6(1)(f):** Berettiget interesse (forbedre produktdatabase)
- Bruker samtykker implisitt ved å sende rapport

### ✅ Informasjon til Bruker
- ✅ Privacy notice i app
- ✅ Privacy policy for App Store

### ✅ Retningslinjer for Oppbevaring
- Anbefalt: Slett rapporter etter 1-2 år (når produktdata er beriket)
- Anbefalt: Anonymiser `created_at` etter 30 dager
- Anbefalt: Roter/anonimiser `device_hash` etter 90 dager

### ✅ Brukerrettigheter
- Bruker kan be om sletting (via support)
- Bruker kan be om innsyn (via support)

## Anbefalte Endringer

### 1. Database Schema

```sql
-- Fjern image_public_url (ikke i bruk)
ALTER TABLE unknown_reports DROP COLUMN IF EXISTS image_public_url;

-- Vurder å legge til retention policy
-- (Slett rapporter eldre enn 2 år)
```

### 2. Edge Function

- Ikke logg IP-adresser
- Ikke samle ytterligere metadata
- Valider at note ikke inneholder åpenbare persondata

### 3. Client-side

- Vis privacy notice før første rapport
- Advarsel i note-felt: "Ikke skriv persondata"
- Tillat bruker å slette rapporter lokalt

