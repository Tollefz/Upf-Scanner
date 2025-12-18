# Storage Upload Guide - Komplett Oppsett

## Oversikt

Bucket `unknown-product-images` er konfigurert som **private** med signed URL upload fra mobilapp.

## Security Model

### Bucket Configuration
- ✅ **Private bucket** (`public = false`)
- ✅ **Ingen direkte write** fra mobilapp
- ✅ **Kun signed URLs** for upload (generert server-side)
- ✅ **Kort TTL** (120 sekunder) på signed URLs

### Storage Policies Summary

| Actor | Read | Write | Delete |
|-------|------|-------|--------|
| Anon | ❌ | ❌ | ❌ |
| Authenticated | ❌ | ❌ | ❌ |
| Service Role | ✅ | ✅ | ✅ |
| Signed URLs | ✅* | ✅* | ❌ |

*Signed URLs bypasse policies, men har TTL

## SQL Setup

### Bucket Creation (i migration 001)

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'unknown-product-images',
  'unknown-product-images',
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
);
```

### Policies (i migration 004)

```sql
-- Deny all anon access
CREATE POLICY "Deny all anon access to images"
ON storage.objects
FOR ALL
TO anon
USING (bucket_id = 'unknown-product-images')
WITH CHECK (bucket_id = 'unknown-product-images');

-- Service role full access
CREATE POLICY "Service role full access to images"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'unknown-product-images')
WITH CHECK (bucket_id = 'unknown-product-images');
```

## Edge Function Implementation

### Signed URL Generation

```typescript
// Når hasImage=true, generer signed URL
if (body.hasImage === true) {
  const imageExt = body.imageExt || 'jpg';
  const imagePath = `${normalizedGTIN}/${reportId}.${imageExt}`;
  
  // Generate signed URL (120 seconds TTL)
  const { data: signedUrlData, error } = await supabase
    .storage
    .from('unknown-product-images')
    .createSignedUrl(imagePath, 120);
  
  if (!error) {
    uploadUrl = signedUrlData.signedUrl;
    
    // Update report with image_path
    await supabase
      .from('unknown_reports')
      .update({ image_path: imagePath })
      .eq('id', reportId);
  }
}
```

### Image Path Format

```
{gtin}/{reportId}.{ext}

Eksempel:
3017620422003/550e8400-e29b-41d4-a716-446655440000.jpg
```

**Fordeler:**
- Organisert per GTIN
- Unik filnavn (reportId)
- Enkelt å finne bilder per rapport

## Client-side Upload (React Native/Expo)

### Eksempel Implementation

Fra `src/utils/unknownReportSender.ts`:

```typescript
async function uploadImageToSupabase(
  signedUrl: string,
  localUri: string
): Promise<void> {
  // 1. Read local file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 2. Convert base64 to Uint8Array
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 3. Determine content type
  const contentType = localUri.toLowerCase().endsWith('.png')
    ? 'image/png'
    : 'image/jpeg';

  // 4. Upload via PUT to signed URL
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

### Upload Flow

```
1. App: submitReport({ gtin, photoUri, ... })
   ↓
2. unknownReportSender.submitReport()
   ↓
3. Edge Function: submit-unknown-report
   ↓
4. Edge Function generates signed URL
   ↓
5. Edge Function returns: { uploadUrl, imagePath, reportId }
   ↓
6. App: uploadImageToSupabase(uploadUrl, photoUri)
   ↓
7. PUT request to signed URL with image bytes
   ↓
8. Image stored in bucket at imagePath
```

## Important Notes

### Service Role Key

**⚠️ KRITISK:** Service role key skal ALDRI ligge i mobilapp!

- ✅ **Kun i Edge Function secrets** (server-side)
- ✅ **Sett via:** `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`
- ❌ **IKKE i mobilapp kode**
- ❌ **IKKE i EXPO_PUBLIC_* environment variables**
- ❌ **IKKE commitet til git**

**Hvorfor:**
- Service role key bypasse RLS og har full tilgang
- Hvis eksponert, kan noen manipulere data direkte
- Signed URLs gir kontrollert tilgang uten å eksponere key

### Signed URL TTL

- **120 sekunder** (2 minutter)
- Appen må upload bildet umiddelbart
- Hvis TTL utløper, må appen be om ny signed URL

### Image Path Update

Edge Function oppdaterer `image_path` **før** upload:
- Dette gjør at vi kan spore hvilke rapporter som forventer bilder
- Hvis upload feiler, kan vi retry senere
- Admin kan se at rapport forventer bilde

## Error Handling

### Upload Fails

Hvis image upload feiler:

1. Report er allerede lagret i database
2. `image_path` er satt, men bildet mangler
3. Client kan retry upload senere (men signed URL er utløpt)
4. Alternativ: Client kan rapportere upload-failure og be om ny signed URL

### Signed URL Expired

Hvis signed URL utløper før upload:

1. Client får 403/401 fra Storage
2. Client kan ikke retry med samme URL
3. Client må be Edge Function om ny signed URL
4. Alternativ: Edge Function kan ha en "renew-upload-url" endpoint

## Future Improvements

### Optional: Renew Upload URL Endpoint

```typescript
// Edge Function: renew-upload-url
POST /functions/v1/renew-upload-url
{
  "reportId": "uuid-here"
}

// Returns new signed URL for existing report
```

### Optional: Image Validation

- Sjekk filstørrelse
- Valider image format (magic bytes)
- Verifiser at upload faktisk skjedde

### Optional: Image Processing

- Resize bilder (hvis for store)
- Optimize (komprimering)
- Generate thumbnails

