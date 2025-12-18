# Privacy Implementation Guide

## Implementasjon i App

### 1. Privacy Notice (I-App)

**Plassering:** `UnknownProductScreen.tsx`

**Vis ved:**
- Første gang bruker ser skjermen (one-time)
- Eller som info-knapp ved behov

**Kode-eksempel:**

```typescript
// State for å spore om notice er vist
const [privacyNoticeShown, setPrivacyNoticeShown] = useState(false);

// Vis notice første gang
useEffect(() => {
  checkAndShowPrivacyNotice();
}, []);

async function checkAndShowPrivacyNotice() {
  const hasShown = await AsyncStorage.getItem('privacy_notice_shown');
  if (!hasShown) {
    // Vis modal med privacy notice
    Alert.alert(
      'Personvern',
      'Når du rapporterer et ukjent produkt, sender vi:\n\n' +
      '• Produktkode (GTIN)\n' +
      '• Produktbilde (hvis du tar bilde)\n' +
      '• Tekstnotat (valgfritt)\n\n' +
      'Vi samler ikke navn, e-post eller lokasjon. Dataene brukes kun til å forbedre produktdatabasen.',
      [
        { text: 'Lukk', onPress: () => {
          AsyncStorage.setItem('privacy_notice_shown', 'true');
        }}
      ]
    );
  }
}
```

### 2. Advarsel i Note-felt

**Plassering:** `UnknownProductScreen.tsx` - note TextInput

**Kode-eksempel:**

```typescript
<TextInput
  placeholder="Valgfritt notat (ikke skriv persondata)"
  value={note}
  onChangeText={setNote}
  multiline
  style={styles.noteInput}
/>
```

### 3. Fjern image_public_url fra Schema

**SQL Migration:**

```sql
-- Migration: Remove unused image_public_url column
ALTER TABLE unknown_reports 
DROP COLUMN IF EXISTS image_public_url;
```

### 4. Oppdater TypeScript Types

**Fil:** `src/utils/unknownProducts.ts` og Edge Function

Fjern `image_public_url` fra interfaces hvis den finnes.

## Privacy Policy URL

**For App Store Connect:**

1. Publiser privacy policy på nettside (f.eks. `https://yourapp.com/privacy`)
2. Eller bruk enkel markdown/html side på GitHub Pages
3. Lim inn URL i App Store Connect under "Privacy Policy URL"

## Testing

**Sjekkliste:**
- [ ] Privacy notice vises første gang
- [ ] Notice kan lukkes og vises ikke igjen
- [ ] Advarsel vises i note-felt
- [ ] Ingen persondata sendes til server
- [ ] `image_public_url` er fjernet fra schema
- [ ] Privacy policy URL fungerer

## Vedlikehold

**Regelmessig:**
- Vurder å anonymisere `created_at` etter 30 dager
- Vurder å rotere `device_hash` etter 90 dager
- Slett gamle rapporter etter 2 år
- Oppdater privacy policy ved endringer

