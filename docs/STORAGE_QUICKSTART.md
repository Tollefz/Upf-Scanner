# Storage Quick Start - Unknown Product Images

## TL;DR

1. **Bucket er private** - ingen direkte tilgang
2. **Edge Function genererer signed URLs** (120 sek TTL)
3. **Appen uploader via PUT** til signed URL
4. **Service role key kun i Edge Function secrets**

## Deploy Steps

### 1. Kjør Migrations

```bash
supabase migration up
```

Dette oppretter:
- `unknown_reports` table
- `unknown-product-images` bucket (private)
- Storage policies (no anon access)

### 2. Sett Service Role Key Secret

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Hvor finner jeg service role key?**
- Supabase Dashboard > Settings > API > Service Role Key (secret)

### 3. Deploy Edge Function

```bash
supabase functions deploy submit-unknown-report
```

### 4. Test

```bash
# Test Edge Function
curl -X POST 'https://your-project.supabase.co/functions/v1/submit-unknown-report' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "gtin": "3017620422003",
    "hasImage": true,
    "imageExt": "jpg",
    "deviceHash": "test-device"
  }'
```

## Files Created

### Migrations
- `supabase/migrations/001_create_unknown_reports.sql` - Table + bucket
- `supabase/migrations/004_storage_policies.sql` - Storage policies

### Edge Function
- `supabase/functions/submit-unknown-report/index.ts` - Signed URL generation

### Client Code
- `src/utils/unknownReportSender.ts` - Upload implementation

### Documentation
- `docs/STORAGE_SETUP.md` - Full dokumentasjon
- `docs/STORAGE_UPLOAD_GUIDE.md` - Detaljert guide

## Security Checklist

- ✅ Bucket er private (`public = false`)
- ✅ Ingen anon write/read policies
- ✅ Service role key kun i Edge Function secrets
- ✅ Signed URLs med kort TTL (120 sek)
- ✅ Image path format: `{gtin}/{reportId}.{ext}`
- ✅ File size limit: 5MB
- ✅ MIME type validation: image/jpeg, image/png

## Troubleshooting

**"Error creating signed upload URL"**
- Sjekk at service role key er satt: `supabase secrets list`
- Verifiser bucket eksisterer: `SELECT * FROM storage.buckets WHERE id = 'unknown-product-images'`

**"403 Forbidden" på upload**
- Sjekk at signed URL ikke er utløpt (< 120 sek)
- Verifiser Content-Type header (image/jpeg eller image/png)

**"Image not found"**
- Sjekk Edge Function logs: `supabase functions logs submit-unknown-report`
- Verifiser at `image_path` er satt i `unknown_reports` table

