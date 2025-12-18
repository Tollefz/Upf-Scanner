# Storage Setup - Unknown Product Images

## Oversikt

Bucket `unknown-product-images` er konfigurert som **private** med signed URL upload.

## Sikkerhet

### Bucket Configuration
- **Public:** `false` (private bucket)
- **File size limit:** 5MB
- **Allowed MIME types:** image/jpeg, image/jpg, image/png

### Storage Policies

**1. Anon users:**
- ❌ Ingen direkte tilgang (read/write/delete)
- ❌ Kan ikke lese bilder
- ✅ Kan bruke signed URLs (generert av Edge Function)

**2. Service role:**
- ✅ Full tilgang (brukt av Edge Function)
- ✅ Kan generere signed URLs
- ✅ Kan håndtere filer (cleanup, etc.)

**3. Signed URLs:**
- Bypasser RLS og policies
- Generert server-side (Edge Function) med service_role
- Kan brukes av hvem som helst (inkludert anon) innenfor TTL
- TTL: 120 sekunder (kort for sikkerhet)

## Upload Flow

### 1. Client Request
```typescript
// Appen sender request til Edge Function
POST /functions/v1/submit-unknown-report
{
  "gtin": "3017620422003",
  "hasImage": true,
  "imageExt": "jpg",
  ...
}
```

### 2. Edge Function Response
```json
{
  "success": true,
  "reportId": "uuid-here",
  "uploadUrl": "https://...supabase.co/storage/v1/object/sign/unknown-product-images/3017620422003/uuid.jpg?token=...",
  "imagePath": "3017620422003/uuid.jpg"
}
```

### 3. Client Upload
```typescript
// Appen uploader bildet til signed URL
PUT {uploadUrl}
Content-Type: image/jpeg
Body: <image bytes>
```

### 4. Image Path Structure
```
{gtin}/{reportId}.{ext}

Eksempel:
3017620422003/550e8400-e29b-41d4-a716-446655440000.jpg
```

## Edge Function Implementation

### Signed URL Generation

```typescript
// Generate signed upload URL
const { data: signedUrlData, error } = await supabase
  .storage
  .from('unknown-product-images')
  .createSignedUrl(imagePath, 120); // 120 seconds

if (!error) {
  uploadUrl = signedUrlData.signedUrl;
}
```

**Image Path Format:**
- `{normalizedGTIN}/{reportId}.{ext}`
- Eksempel: `3017620422003/550e8400-e29b-41d4-a716-446655440000.jpg`

### Image Path Update

Edge Function oppdaterer `unknown_reports.image_path` umiddelbart etter å ha generert signed URL:

```typescript
await supabase
  .from('unknown_reports')
  .update({ image_path: imagePath })
  .eq('id', reportId);
```

Dette gjør at vi kan spore hvilke rapporter som forventer bilder, selv hvis upload feiler.

## Client-side Upload

### Eksempel Implementation

```typescript
// Fra unknownReportSender.ts
async function uploadImageToSupabase(
  signedUrl: string,
  localUri: string
): Promise<void> {
  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to Uint8Array
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Determine content type
  const contentType = localUri.toLowerCase().endsWith('.png')
    ? 'image/png'
    : 'image/jpeg';

  // Upload to signed URL using PUT
  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Image upload failed: ${uploadResponse.status}`);
  }
}
```

### Upload Timing

1. Client får `uploadUrl` fra Edge Function
2. Client må upload bildet **innen 120 sekunder**
3. Client sender PUT request med bildet i body
4. Supabase Storage lagrer bildet i bucket

## Reading Images (Senere)

### Signed Download URL

Hvis du senere trenger å hente bilder (f.eks. i admin panel):

```typescript
// I Edge Function eller server-side code
const { data: signedUrlData } = await supabase
  .storage
  .from('unknown-product-images')
  .createSignedUrl(imagePath, 3600); // 1 hour expiry

const downloadUrl = signedUrlData.signedUrl;
```

**Note:** Bruk ikke client-side (anon key) for å generere download URLs - dette krever service_role.

## Secrets

### Viktig: Service Role Key

**⚠️ Service role key skal ALDRI ligge i mobilapp!**

- ✅ **Kun i Edge Function secrets** (server-side)
- ❌ **Ikke i mobilapp kode**
- ❌ **Ikke i environment variables som kan eksponeres**

**Sett secrets:**
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Hente fra Supabase Dashboard:
- Settings > API > Service Role Key (secret)

## Troubleshooting

### Upload fails med 403

- Sjekk at signed URL ikke er utløpt (TTL 120 sek)
- Sjekk at Content-Type header er riktig (image/jpeg eller image/png)
- Verifiser at bucket eksisterer og er private

### Signed URL generation fails

- Sjekk at Edge Function har service_role key
- Verifiser at bucket eksisterer: `SELECT * FROM storage.buckets WHERE id = 'unknown-product-images'`
- Sjekk Edge Function logs: `supabase functions logs submit-unknown-report`

### Image not found after upload

- Verifiser at upload response var 200 OK
- Sjekk at image_path er oppdatert i `unknown_reports` tabellen
- Verifiser at filen faktisk eksisterer i Storage

## Maintenance

### Cleanup old images

```sql
-- Slett bilder for rapporter eldre enn 30 dager
DELETE FROM storage.objects
WHERE bucket_id = 'unknown-product-images'
AND name IN (
  SELECT image_path
  FROM unknown_reports
  WHERE created_at < now() - INTERVAL '30 days'
  AND image_path IS NOT NULL
);
```

### Verify storage usage

```sql
-- Se antall bilder og total størrelse
SELECT 
  COUNT(*) as image_count,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id = 'unknown-product-images';
```

