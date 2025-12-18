# Eksempel: Rapporter produkt til Supabase

## Oversikt

Dette dokumentet viser hvordan du bruker en enkel "Rapporter produkt"-knapp til å sende data til Supabase Edge Function.

## Installer Dependencies

Først, installer `@supabase/supabase-js` hvis den ikke allerede er installert:

```bash
npm install @supabase/supabase-js
```

## Konfigurer Supabase

Sett opp environment variables i `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://your-project.supabase.co",
      "supabaseAnonKey": "your-anon-key"
    }
  }
}
```

Eller bruk `.env` fil:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Bruk ReportProductButton Komponent

### Enkelt Eksempel

```tsx
import { ReportProductButton } from '@/src/components/ReportProductButton';

export default function ProductScreen() {
  const gtin = '3017620422003';

  return (
    <View>
      <ReportProductButton 
        gtin={gtin}
        comment="Dette produktet mangler i databasen"
        onSuccess={() => {
          console.log('Rapport sendt!');
        }}
        onError={(error) => {
          console.error('Feil:', error);
        }}
      />
    </View>
  );
}
```

### Med Tilpasset Tekst

```tsx
<ReportProductButton 
  gtin={gtin}
  buttonText="Meld fra om manglende produkt"
  onSuccess={() => {
    // Naviger tilbake eller vis bekreftelse
    router.back();
  }}
/>
```

### Med Custom Styling

Du kan wrappe komponenten og style den:

```tsx
<View style={{ padding: 20 }}>
  <ReportProductButton 
    gtin={gtin}
    comment="Produktet finnes ikke i databasen"
  />
</View>
```

## Direkte Bruk av reportProduct Funksjon

Hvis du vil ha mer kontroll over UI, kan du bruke funksjonen direkte:

```tsx
import { reportProduct } from '@/src/utils/reportProduct';
import { useState } from 'react';
import { Alert, Button, ActivityIndicator } from 'react-native';

export default function CustomReportScreen() {
  const [loading, setLoading] = useState(false);
  const gtin = '3017620422003';
  const comment = 'Dette produktet mangler';

  const handleReport = async () => {
    setLoading(true);
    
    try {
      const result = await reportProduct(gtin, comment);
      
      if (result.success) {
        Alert.alert('Takk! 🙏', 'Takk for rapporten 🙏');
        // Do something on success
      } else {
        Alert.alert('Feil', result.message);
      }
    } catch (error) {
      Alert.alert('Feil', 'Noe gikk galt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      title={loading ? 'Sender...' : 'Rapporter produkt'}
      onPress={handleReport}
      disabled={loading}
    />
  );
}
```

## Hva Sendes til Edge Function?

Edge Function `submit-unknown-report` mottar:

```json
{
  "gtin": "3017620422003",
  "note": "Dette produktet mangler i databasen",
  "hasImage": false
}
```

Edge Function returnerer:

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "reportId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Error Handling

Funksjonen håndterer følgende feil:

1. **Rate Limiting (429):**
   - Returnerer: "For mange rapporter. Prøv igjen om X minutter."

2. **Supabase ikke konfigurert:**
   - Returnerer: "Supabase er ikke konfigurert..."

3. **Network errors:**
   - Returnerer: "Kunne ikke sende rapport. Prøv igjen senere."

4. **Edge Function errors:**
   - Returnerer meldingen fra Edge Function

## Security

⚠️ **VIKTIG:**
- Bruk kun `SUPABASE_ANON_KEY` i appen
- **ALDRI** eksponer `SUPABASE_SERVICE_ROLE_KEY` i appen
- Service role key skal kun brukes i Edge Functions (server-side)

## Testing

For å teste:

1. Sett opp Supabase Edge Function `submit-unknown-report`
2. Sett environment variables
3. Bruk komponenten eller funksjonen direkte
4. Sjekk Supabase logs for å verifisere at data mottas

```bash
# Sjekk Edge Function logs
supabase functions logs submit-unknown-report
```

