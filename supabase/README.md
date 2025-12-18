# Supabase Setup - Unknown Product Reports

Komplett oppsett for å samle "unknown product reports" fra mobilapp.

## Oppsett

### 1. Installer Supabase CLI

```bash
npm install -g supabase
```

### 2. Login til Supabase

```bash
supabase login
```

### 3. Link til prosjektet

```bash
supabase link --project-ref <your-project-ref>
```

Eller hvis du starter lokalt:

```bash
supabase init
supabase start
```

---

## Database Setup

### 1. Kjør migrasjon

```bash
supabase migration up
```

Eller hvis du kjører lokalt:

```bash
supabase db reset
```

### 2. Verifiser tabell

```sql
-- I Supabase Dashboard > SQL Editor:
SELECT * FROM unknown_reports LIMIT 10;
```

---

## Storage Setup

### 1. Verifiser bucket

Bucket `unknown-product-images` opprettes automatisk via migrasjon.

### 2. Sjekk bucket i dashboard

Gå til Supabase Dashboard > Storage og verifiser at bucketen eksisterer og er private.

---

## Edge Function Setup

### 1. Set secrets

```bash
# Hent service role key fra Supabase Dashboard > Settings > API
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
supabase secrets set SUPABASE_URL=your-supabase-url-here
```

Eller hvis du bruker Supabase Dashboard:
- Gå til Edge Functions > submit-unknown-report > Settings
- Legg til secrets:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_URL` (settes automatisk, men kan settes eksplisitt)

### 2. Deploy function

```bash
supabase functions deploy submit-unknown-report
```

### 3. Test function lokalt (valgfritt)

```bash
supabase functions serve submit-unknown-report --no-verify-jwt
```

Test med curl:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/submit-unknown-report' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "gtin": "3017620422003",
    "manualName": "Test Product",
    "hasImage": false
  }'
```

---

## Mobilapp-integrasjon

### 1. Installer Supabase client

```bash
npm install @supabase/supabase-js
```

### 2. Environment variables

I `.env` eller `app.json`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Eksempel på bruk i React Native

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function submitUnknownReport(data: {
  gtin: string;
  manualName?: string;
  note?: string;
  ocrText?: string;
  hasImage: boolean;
  imageExt?: 'jpg' | 'png';
  imageUri?: string; // Local file URI
}) {
  try {
    // Call Edge Function
    const { data: response, error } = await supabase.functions.invoke(
      'submit-unknown-report',
      {
        body: {
          gtin: data.gtin,
          manualName: data.manualName,
          note: data.note,
          ocrText: data.ocrText,
          appVersion: '1.0.0', // From app config
          platform: Platform.OS, // 'ios' | 'android'
          locale: 'da-DK', // From device
          deviceHash: 'hashed-device-id', // Optional
          hasImage: data.hasImage,
          imageExt: data.imageExt,
        },
      }
    );

    if (error) {
      throw error;
    }

    if (!response.success) {
      throw new Error(response.message);
    }

    // If hasImage and we got an uploadUrl, upload the image
    if (data.hasImage && response.uploadUrl && data.imageUri) {
      const imageResponse = await fetch(data.imageUri);
      const blob = await imageResponse.blob();

      const uploadResponse = await fetch(response.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': blob.type,
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      console.log('Image uploaded successfully');
    }

    return {
      success: true,
      reportId: response.reportId,
    };
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error;
  }
}
```

---

## Sikkerhet

### RLS (Row Level Security)

- ✅ RLS er aktivert på `unknown_reports` tabellen
- ✅ Anon users har INGEN direkte tilgang til tabellen
- ✅ Alle inserts går gjennom Edge Function (service_role)

### Storage

- ✅ Bucket er private
- ✅ Anon users har INGEN direkte tilgang til storage
- ✅ Uploads går via signed URLs med kort TTL (60 sek)
- ✅ Service role kan håndtere filer (via Edge Function)

### Edge Function

- ✅ Bruker service_role key (kun i function, ikke i mobilapp)
- ✅ Validerer GTIN-format
- ✅ Genererer signed upload URLs (kort TTL)

---

## Monitoring

### Se rapporter

```sql
-- I Supabase Dashboard > SQL Editor:
SELECT 
  id,
  created_at,
  gtin,
  manual_name,
  platform,
  app_version,
  CASE WHEN image_path IS NOT NULL THEN 'Yes' ELSE 'No' END as has_image
FROM unknown_reports
ORDER BY created_at DESC
LIMIT 100;
```

### Se bilder

- Gå til Supabase Dashboard > Storage > unknown-product-images
- Bilder ligger i mappe-struktur: `{gtin}/{reportId}.{ext}`

---

## Feilsøking

### Function returnerer 500

- Sjekk at secrets er satt: `supabase secrets list`
- Sjekk function logs: `supabase functions logs submit-unknown-report`

### Image upload feiler

- Verifiser at signed URL er brukt innen 60 sekunder
- Sjekk at image path er korrekt format: `{gtin}/{reportId}.{ext}`
- Verifiser at bucket eksisterer og er private

### RLS blokkerer requests

- Dette skal ikke skje - Edge Function bypasser RLS
- Hvis du ser RLS-feil, sjekk at function bruker service_role key

---

## TODO for fremtidige forbedringer

- [ ] Legg til rate limiting per device_hash
- [ ] Legg til deduplication (samme GTIN fra samme device_hash)
- [ ] Automatisk OCR av bilder (server-side)
- [ ] Notification når produkt blir lagt til i databasen
- [ ] Analytics dashboard for unknown reports

