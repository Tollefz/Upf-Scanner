# Supabase Deploy Instructions

## Quick Start

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login

```bash
supabase login
```

### 3. Link Project

```bash
# Get project ref from Supabase Dashboard > Settings > General
supabase link --project-ref your-project-ref
```

---

## Database Setup

### Run Migration

```bash
supabase migration up
```

Eller via Supabase Dashboard:
1. Gå til SQL Editor
2. Kopier innholdet fra `supabase/migrations/001_create_unknown_reports.sql`
3. Kjør SQL

---

## Storage Setup

Storage bucket opprettes automatisk via migrasjon.

Verifiser i Dashboard:
- Storage > unknown-product-images
- Skal være **Private**

---

## Edge Function Setup

### 1. Set Secrets

```bash
# Get these from Supabase Dashboard > Settings > API
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
```

**Alternativt via Dashboard:**
1. Edge Functions > submit-unknown-report > Settings
2. Legg til secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_URL`

### 2. Deploy Function

```bash
supabase functions deploy submit-unknown-report
```

### 3. Test Function

```bash
curl -i --location --request POST \
  'https://your-project.supabase.co/functions/v1/submit-unknown-report' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "gtin": "3017620422003",
    "manualName": "Test Product",
    "hasImage": false
  }'
```

Forventet respons:
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "reportId": "uuid-here"
}
```

---

## Mobilapp Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Environment Variables

I `.env` eller `app.json`:

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

### 3. Update unknownProducts.ts

Legg til funksjon som kaller Supabase client:

```typescript
import { submitUnknownReportToSupabase } from './unknownProductsClient';

// I handleSave i UnknownProductScreen:
const result = await submitUnknownReportToSupabase({
  gtin,
  manualName,
  note,
  photoUri,
  imageExt: photoUri?.endsWith('.png') ? 'png' : 'jpg',
});

if (result.success) {
  // Report submitted successfully
}
```

---

## Troubleshooting

### Function returns 500

**Check secrets:**
```bash
supabase secrets list
```

**Check logs:**
```bash
supabase functions logs submit-unknown-report
```

### Image upload fails

- Verifiser at signed URL brukes innen 120 sekunder
- Sjekk at content-type er riktig (image/jpeg eller image/png)
- Verifiser at bucket eksisterer og er private

### RLS errors

- Edge Function bypasser RLS (bruker service_role)
- Hvis du ser RLS-feil, sjekk at function har service_role key

### CORS errors

- Function har CORS-headers i koden
- Verifiser at anon key er riktig i request header

---

## Security Checklist

✅ RLS aktivert på `unknown_reports` tabellen  
✅ Anon users har ingen direkte tilgang  
✅ Edge Function bruker service_role key (kun i function)  
✅ Storage bucket er private  
✅ Signed URLs har kort TTL (120 sek)  
✅ GTIN valideres før lagring  
