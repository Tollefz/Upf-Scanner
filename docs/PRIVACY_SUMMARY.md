# Personvernoppsummering - Unknown Product Reports

## 1. Anbefalt Feltliste

### ✅ Behold - Påkrevd
- `gtin` (TEXT, NOT NULL) - Produktkode
- `created_at` (TIMESTAMPTZ, NOT NULL) - Tidsstempel

### ✅ Behold - Valgfritt (Anbefalt)
- `manual_name` (TEXT, NULL) - Produktnavn fra bruker
- `ocr_text` (TEXT, NULL) - Tekst ekstrahert fra bilde
- `image_path` (TEXT, NULL) - Sti til produktbilde
- `note` (TEXT, NULL) - Brukerens notat (⚠️ ADVAR mot persondata)
- `app_version` (TEXT, NULL) - App-versjon (for support)
- `platform` (TEXT, NULL) - ios/android (for support)
- `locale` (TEXT, NULL) - Språkinnstilling (f.eks. "da-DK")
- `device_hash` (TEXT, NULL) - Anonym teknisk identifikator (⚠️ beskriv som anonym)

### ❌ Fjern
- `image_public_url` (TEXT, NULL) - Ikke i bruk, fjern fra schema

### ❌ Ikke Samle
- Navn, e-post, telefon
- GPS-lokasjon
- Bruker-ID eller kontoinformasjon
- IP-adresse

---

## 2. Privacy Notice - I-App (Kort Versjon)

**Anbefalt tekst:**

```
Når du rapporterer et ukjent produkt, sender vi:
• Produktkode (GTIN)
• Produktbilde (hvis du tar bilde)
• Tekstnotat (valgfritt)

Vi bruker en anonym teknisk identifikator for å beskytte mot misbruk. Vi samler ikke navn, e-post eller lokasjon.

Dataene brukes kun til å forbedre produktdatabasen.
```

**Alternativ (ekstra kort):**

```
Vi sender kun produktkode og bilde (hvis valgt). Ingen persondata samles. Se privacy policy for mer info.
```

---

## 3. Privacy Policy - App Store (MVP Versjon)

**Norsk:**

```
Personvernpolicy for [App-navn]

Hvilke data samler vi?
Appen samler følgende data når du rapporterer ukjente produkter:
• Produktkode (GTIN)
• Produktbilde (hvis du velger å ta bilde)
• Valgfritt tekstnotat om produktet

Vi samler IKKE:
• Navn, e-postadresse eller telefonnummer
• GPS-lokasjon eller annen posisjonsinformasjon
• Bruker-ID eller kontoinformasjon

Hvorfor samler vi data?
Dataene brukes utelukkende til å forbedre produktdatabasen, slik at flere brukere kan finne informasjon om matvarer.

Hvordan beskytter vi dataene?
• Bilder lagres i kryptert lagring
• Vi bruker anonyme tekniske identifikatorer for misbrukskontroll
• Data deles ikke med tredjeparter

Dine rettigheter
Du har rett til å be om innsyn, retting eller sletting av dine data. Kontakt oss på [e-post].

Kontakt
For spørsmål om personvern: [e-post]
```

**Engelsk:**

```
Privacy Policy for [App Name]

What data do we collect?
When you report unknown products, we collect:
• Product code (GTIN)
• Product image (if you choose to take a photo)
• Optional text note about the product

We do NOT collect:
• Name, email address, or phone number
• GPS location or other location information
• User ID or account information

Why do we collect data?
Data is used solely to improve the product database so more users can find information about food products.

How do we protect your data?
• Images are stored in encrypted storage
• We use anonymous technical identifiers for abuse prevention
• Data is not shared with third parties

Your rights
You have the right to request access, correction, or deletion of your data. Contact us at [email].

Contact
For privacy questions: [email]
```

---

## Implementasjon

### Filer Opprettet

1. **docs/PRIVACY_ANALYSIS.md** - Detaljert analyse av datamodellen
2. **docs/PRIVACY_NOTICE_APP.md** - Privacy notice tekster for app
3. **docs/PRIVACY_POLICY_APP_STORE.md** - Privacy policy for App Store
4. **docs/PRIVACY_IMPLEMENTATION.md** - Implementasjonsguide
5. **docs/PRIVACY_SUMMARY.md** - Denne oppsummeringen

### Neste Steg

1. **Fjern `image_public_url` fra database:**
   ```sql
   ALTER TABLE unknown_reports DROP COLUMN IF EXISTS image_public_url;
   ```

2. **Implementer privacy notice i app:**
   - Vis ved første rapport (se PRIVACY_IMPLEMENTATION.md)

3. **Legg til advarsel i note-felt:**
   - Placeholder: "Valgfritt notat (ikke skriv persondata)"

4. **Publiser privacy policy:**
   - På nettside eller GitHub Pages
   - Legg inn URL i App Store Connect

5. **Vurder retention policy:**
   - Slett rapporter etter 2 år
   - Anonymiser `created_at` etter 30 dager
   - Roter `device_hash` etter 90 dager

---

## Viktige Poeng

✅ **Minimering:** Samler kun nødvendige data  
✅ **Ingen direkte persondata:** Ingen navn, e-post, telefon, GPS  
✅ **Anonymisering:** device_hash er anonym teknisk identifikator  
✅ **Transparens:** Klar informasjon til brukere  
✅ **Sikkerhet:** Kryptert lagring, private buckets, signed URLs  
✅ **Brukerrettigheter:** GDPR-kompatibel (innsyn, retting, sletting)

