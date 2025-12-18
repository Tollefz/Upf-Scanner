# Backend Setup - Produktrapportering (Dansk)

## Oversigt

Appen sender automatisk produktrapporter til backend når brugere rapporterer manglende eller fejlende produkter. Dette dokument beskriver hvordan du sætter backend op til at modtage disse rapporter.

## API Endpoint

**URL**: `POST /v1/reports/missing-product`

**Content-Type**: `application/json`

**Authentication**: 
- Enten `X-App-Token` header med app token (anbefalet)
- Eller ingen auth i TestFlight, men rate-limit + abuse protection

**Rate Limit**: 30 requests/min pr IP/device (beskyt mod spam)

## Request Format

```json
{
  "country": "DK",
  "barcode": "5701234567890",
  "barcode_type": "EAN13",
  "issue_type": "NOT_FOUND",
  "lookup_source": "openfoodfacts",
  "http_status": 404,
  "error_code": null,
  "product_name_seen": null,
  "user_note": "Scannet i Netto - kom ikke frem",
  "client": {
    "app_version": "0.9.3",
    "build_number": "42",
    "platform": "iOS",
    "os_version": "17.6",
    "device_model": "iPhone14,5",
    "locale": "da-DK"
  },
  "context": {
    "scanned_at": "2025-12-16T18:32:10Z",
    "session_id": "c3b1d9a0-2d0c-4b1c-9fd8-9e9fb2b7c2f1",
    "network_type": "wifi"
  },
  "attachments": {
    "product_photo_base64": null,
    "ingredients_photo_base64": null,
    "product_photo_url": null,
    "ingredients_photo_url": null
  }
}
```

## Response Format

### Success (201 Created)

```json
{
  "status": "ok",
  "report_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "received"
}
```

### Validation Error (400 Bad Request)

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "fields": {
    "barcode": "Barcode is required",
    "issue_type": "Invalid issue_type"
  }
}
```

### Server Error (500 Internal Server Error)

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

## Issue Types

- `NOT_FOUND`: Produktet findes ikke i databasen
- `MISSING_INGREDIENTS`: Produktet findes, men mangler ingrediensliste
- `LOOKUP_ERROR`: Teknisk feil ved lookup (nettværk, timeout, etc.)
- `OCR_FAILED`: OCR-fejl (hvis OCR implementeres)

## Datamodel (Database)

### Tabel: `missing_product_reports`

```sql
CREATE TABLE missing_product_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  country VARCHAR(2) NOT NULL DEFAULT 'DK',
  barcode VARCHAR(20) NOT NULL,
  barcode_type VARCHAR(10), -- EAN13, EAN8, UPC, UNKNOWN
  issue_type VARCHAR(20) NOT NULL, -- NOT_FOUND, MISSING_INGREDIENTS, LOOKUP_ERROR, OCR_FAILED
  lookup_source VARCHAR(50), -- openfoodfacts, internal_db
  http_status INTEGER,
  error_code VARCHAR(50), -- timeout, offline, network_error
  product_name_seen VARCHAR(255),
  user_note TEXT, -- max 500 chars
  app_version VARCHAR(20) NOT NULL,
  build_number VARCHAR(20) NOT NULL,
  platform VARCHAR(10) NOT NULL, -- iOS, Android
  os_version VARCHAR(20) NOT NULL,
  device_model VARCHAR(50) NOT NULL,
  locale VARCHAR(10) NOT NULL, -- da-DK
  session_id VARCHAR(100),
  dedupe_hash VARCHAR(64) NOT NULL, -- hash(barcode + issue_type + day)
  occurrence_count INTEGER DEFAULT 1,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  product_photo_url TEXT,
  ingredients_photo_url TEXT,
  raw_payload JSONB, -- For debugging
  
  -- Indexes
  INDEX idx_barcode (barcode),
  INDEX idx_issue_type (issue_type),
  INDEX idx_dedupe_hash (dedupe_hash),
  INDEX idx_created_at (created_at),
  INDEX idx_occurrence_count (occurrence_count DESC)
);
```

## Dedupe-logik

For at undgå spam/duplikater genereres en `dedupe_hash`:

```python
import hashlib
from datetime import datetime

def generate_dedupe_hash(barcode: str, issue_type: str) -> str:
    today = datetime.now().strftime('%Y-%m-%d')
    hash_input = f"{barcode}:{issue_type}:{today}"
    return hashlib.sha256(hash_input.encode()).hexdigest()
```

Hvis samme hash allerede findes i dag:
- Incrementér `occurrence_count`
- Opdater `last_seen_at`
- Ikke opret ny række

## Billedhåndtering

Hvis `product_photo_base64` eller `ingredients_photo_base64` er inkluderet:

1. Dekod base64-strengen
2. Upload til storage (S3, Cloud Storage, etc.)
3. Gem URL i `product_photo_url` eller `ingredients_photo_url`
4. Slet base64-data fra payload før gemning

**Anbefaling**: Upload til storage først, send kun URL'er i payload (mere effektivt).

## Eksempel: Node.js/Express Backend

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json({ limit: '10mb' })); // For bilde-upload

// Rate limiting middleware (simplified)
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many requests'
});

app.post('/v1/reports/missing-product', limiter, async (req, res) => {
  // Optional: Check app token
  const appToken = req.headers['x-app-token'];
  if (process.env.APP_TOKEN && appToken !== process.env.APP_TOKEN) {
    return res.status(401).json({ error: 'Invalid app token' });
  }

  const {
    country,
    barcode,
    barcode_type,
    issue_type,
    lookup_source,
    http_status,
    error_code,
    product_name_seen,
    user_note,
    client,
    context,
    attachments
  } = req.body;

  // Validation
  if (!barcode || !issue_type || !client) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fields: {
        barcode: !barcode ? 'Barcode is required' : undefined,
        issue_type: !issue_type ? 'Issue type is required' : undefined,
        client: !client ? 'Client info is required' : undefined
      }
    });
  }

  // Generate dedupe hash
  const today = new Date().toISOString().split('T')[0];
  const dedupeHash = crypto
    .createHash('sha256')
    .update(`${barcode}:${issue_type}:${today}`)
    .digest('hex');

  try {
    // Check for existing report today
    const existing = await db.missing_product_reports.findOne({
      where: { dedupe_hash: dedupeHash }
    });

    let reportId;
    if (existing) {
      // Update existing
      await existing.update({
        occurrence_count: existing.occurrence_count + 1,
        last_seen_at: new Date(),
        // Update other fields if provided
        user_note: user_note || existing.user_note,
        product_name_seen: product_name_seen || existing.product_name_seen
      });
      reportId = existing.id;
    } else {
      // Process images if present
      let productPhotoUrl = null;
      let ingredientsPhotoUrl = null;

      if (attachments?.product_photo_base64) {
        productPhotoUrl = await uploadImageToStorage(
          attachments.product_photo_base64,
          barcode,
          'product'
        );
      }

      if (attachments?.ingredients_photo_base64) {
        ingredientsPhotoUrl = await uploadImageToStorage(
          attachments.ingredients_photo_base64,
          barcode,
          'ingredients'
        );
      }

      // Create new report
      const report = await db.missing_product_reports.create({
        country: country || 'DK',
        barcode,
        barcode_type,
        issue_type,
        lookup_source,
        http_status,
        error_code,
        product_name_seen,
        user_note: user_note?.substring(0, 500), // Limit to 500 chars
        app_version: client.app_version,
        build_number: client.build_number,
        platform: client.platform,
        os_version: client.os_version,
        device_model: client.device_model,
        locale: client.locale,
        session_id: context?.session_id,
        dedupe_hash: dedupeHash,
        product_photo_url: productPhotoUrl,
        ingredients_photo_url: ingredientsPhotoUrl,
        raw_payload: req.body // Store full payload for debugging
      });

      reportId = report.id;
    }

    res.status(201).json({
      status: 'ok',
      report_id: reportId,
      message: 'received'
    });
  } catch (error) {
    console.error('Error processing report:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

async function uploadImageToStorage(base64Data, barcode, type) {
  // Decode base64
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Upload to your storage (S3, Cloud Storage, etc.)
  const filename = `${barcode}-${type}-${Date.now()}.jpg`;
  // ... upload logic
  // return URL to saved image
  return `https://your-storage.com/images/${filename}`;
}
```

## Admin/Export Endpoint

```javascript
// GET /v1/reports/missing-product?from=2025-12-01&to=2025-12-31&issue_type=NOT_FOUND
app.get('/v1/reports/missing-product', async (req, res) => {
  // Basic auth or admin token check
  const authHeader = req.headers.authorization;
  if (!isAdmin(authHeader)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { from, to, issue_type, format = 'json' } = req.query;

  const where = {};
  if (from) where.created_at = { $gte: new Date(from) };
  if (to) where.created_at = { ...where.created_at, $lte: new Date(to) };
  if (issue_type) where.issue_type = issue_type;

  const reports = await db.missing_product_reports.findAll({ where });

  if (format === 'csv') {
    // Convert to CSV
    const csv = convertToCSV(reports);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=reports.csv');
    return res.send(csv);
  }

  res.json({
    count: reports.length,
    reports: reports.map(r => ({
      id: r.id,
      barcode: r.barcode,
      issue_type: r.issue_type,
      product_name_seen: r.product_name_seen,
      occurrence_count: r.occurrence_count,
      created_at: r.created_at,
      last_seen_at: r.last_seen_at
    }))
  });
});
```

## Testing

Test backend med curl:

```bash
curl -X POST http://localhost:3000/v1/reports/missing-product \
  -H "Content-Type: application/json" \
  -H "X-App-Token: your-app-token" \
  -d '{
    "country": "DK",
    "barcode": "5701234567890",
    "barcode_type": "EAN13",
    "issue_type": "NOT_FOUND",
    "lookup_source": "openfoodfacts",
    "http_status": 404,
    "client": {
      "app_version": "0.9.3",
      "build_number": "42",
      "platform": "iOS",
      "os_version": "17.6",
      "device_model": "iPhone14,5",
      "locale": "da-DK"
    },
    "context": {
      "scanned_at": "2025-12-16T18:32:10Z",
      "session_id": "test-session-123",
      "network_type": "wifi"
    }
  }'
```

## Sikkerhed

1. **Rate limiting**: Implementer rate limiting (30 req/min pr IP/device)
2. **Autentisering**: Brug app token i produktion
3. **Validering**: Valider alle input-felter
4. **Billedstørrelse**: Begræns billedstørrelse (max 5MB)
5. **SQL injection**: Brug parameteriserede queries
6. **CORS**: Konfigurer CORS korrekt

## Monitoring

Log følgende for monitoring:
- Antal modtagne rapporter per dag
- Fordeling af issue_types
- Antal rapporter med billeder
- Fejlrate ved billedupload
- Gennemsnitlig responstid
- Top rapporterede stregkoder (højeste occurrence_count)

