# Rate Limiting - Dokumentasjon

## Oversikt

Edge Function `submit-unknown-report` har rate limiting implementert for å forhindre misbruk.

## Regler

- **Maks 5 requests** per `deviceHash` per 10 minutter
- **Maks 2 requests** for `deviceHash="unknown"` (hvis deviceHash mangler)
- Tidsvindu: 10 minutter (aligned til 10:00, 10:10, 10:20, etc.)

## Implementasjon

### Database

**Tabell:** `rate_limits`
- `device_hash` (TEXT) - Device identifier
- `window_start` (TIMESTAMPTZ) - Start of time window
- `count` (INTEGER) - Number of requests in this window
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Unik constraint:** (device_hash, window_start) - En rad per device per tidsvindu

**Automatic cleanup:** Gamle vinduer (>1 time) kan ryddes opp med `cleanup_old_rate_limits()` funksjon

### Edge Function Logikk

1. **Hent current window start** (10-minutter aligned)
2. **Sjekk eksisterende counter** for (deviceHash, windowStart)
3. **Hvis count >= limit:**
   - Returner HTTP 429 med `retryAfterSec`
   - Ikke increment counter
4. **Hvis count < limit:**
   - Increment counter atomisk (upsert)
   - Fortsett med request

### Atomic Operations

Bruker PostgreSQL UPSERT med `ON CONFLICT` for atomisk increment:
```sql
UPSERT ... ON CONFLICT (device_hash, window_start) 
DO UPDATE SET count = count + 1
```

Dette sikrer at samtidige requests håndteres korrekt.

## Error Response

Når rate limit er nådd:

```json
{
  "success": false,
  "code": "RATE_LIMITED",
  "message": "For mange forespørsler. Prøv igjen om X minutter.",
  "retryAfterSec": 300
}
```

HTTP Status: **429 Too Many Requests**

## Client-side Håndtering

### I UnknownProductScreen / unknownReportSender.ts

```typescript
try {
  const result = await submitReportToSupabase(report);
  
  if (!result.success && result.code === 'RATE_LIMITED') {
    // Vis melding til bruker
    const minutes = Math.ceil((result.retryAfterSec || 60) / 60);
    return {
      success: false,
      message: `For mange rapporter. Prøv igjen om ${minutes} minutter.`,
      rateLimited: true,
    };
  }
  
  // ... normal handling
} catch (error) {
  // ... error handling
}
```

### UI-melding

Vis vennlig melding til bruker:
- "Du har sendt for mange rapporter. Vent litt og prøv igjen."
- Vis estimert ventetid basert på `retryAfterSec`
- Ikke vis teknisk error-melding

### Automatisk Retry

**Ikke retry automatisk** ved rate limiting (429):
- Rate limiting er intensjonell
- Automatisk retry vil bare gjøre det verre
- La brukeren vente til neste window

## Testing

### Test Rate Limiting

```bash
# Send 5 requests raskt (skal fungere)
for i in {1..5}; do
  curl -X POST 'https://your-project.supabase.co/functions/v1/submit-unknown-report' \
    -H 'Authorization: Bearer YOUR_ANON_KEY' \
    -H 'Content-Type: application/json' \
    -d '{"gtin":"3017620422003","deviceHash":"test-device","hasImage":false}'
done

# 6. request skal returnere 429
```

### Test med unknown deviceHash

```bash
# Send request uten deviceHash (skal bruke "unknown")
curl -X POST 'https://your-project.supabase.co/functions/v1/submit-unknown-report' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"gtin":"3017620422003","hasImage":false}'

# Kun 2 requests tillatt per 10 minutter for "unknown"
```

## Monitoring

### Se rate limit status

```sql
-- Se aktive rate limits
SELECT 
  device_hash,
  window_start,
  count,
  updated_at
FROM rate_limits
WHERE window_start >= (now() - INTERVAL '20 minutes')
ORDER BY window_start DESC, device_hash;
```

### Cleanup gamle records

```sql
-- Rydd opp vinduer eldre enn 1 time
SELECT cleanup_old_rate_limits();
```

### Optional: Scheduled Cleanup

Hvis du vil ha automatisk cleanup, sett opp cron job:

```sql
-- I Supabase Dashboard > Database > Cron Jobs
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *', -- Hver time
  'SELECT cleanup_old_rate_limits();'
);
```

## Tuning

Hvis du trenger å justere limits:

1. **Endre konstanter i Edge Function:**
   - `RATE_LIMIT_WINDOW_MINUTES` (default: 10)
   - `RATE_LIMIT_MAX_REQUESTS` (default: 5)
   - `RATE_LIMIT_MAX_REQUESTS_UNKNOWN` (default: 2)

2. **Redeploy function:**
   ```bash
   supabase functions deploy submit-unknown-report
   ```

## Feilsikkerhet

- **Fail open:** Ved database errors, tillater vi request (better availability)
- **Atomic operations:** Bruker UPSERT for å unngå race conditions
- **Automatic cleanup:** Gamle records ryddes automatisk (via cron eller manual)

## Notater

- Rate limiting er per `deviceHash`, ikke per IP
- Dette gir bedre beskyttelse mot misbruk (hash er vanskeligere å manipulere)
- Legitimate brukere vil typisk ikke nå limit (5 requests per 10 min er høyt)
- Unknown deviceHash har strengere limit (2) for å redusere spam

