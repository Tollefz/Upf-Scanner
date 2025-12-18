# Backend API Endpoint - Produktrapportering

## Endpoint

**POST** `/v1/reports/missing-product`

## Authentication

**Option A (Anbefalet):**
```
X-App-Token: <app-token>
```

**Option B (TestFlight):**
- Ingen auth, men rate limiting (30 req/min pr IP)

## Request Headers

```
Content-Type: application/json
X-App-Token: <optional-app-token>
```

## Request Body

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
    "app_version": "0.9.4",
    "build_number": "45",
    "platform": "iOS",
    "os_version": "17.6",
    "device_model": "iPhone14,5",
    "locale": "da-DK"
  },
  "context": {
    "scanned_at": "2025-12-16T18:32:10Z",
    "session_id": "c3b1d9a0-2d0c-4b1c-9fd8-9e9fb2b7c2f1",
    "network_type": "wifi",
    "latency_ms": 912
  },
  "attachments": {
    "product_photo_base64": null,
    "ingredients_photo_base64": null,
    "product_photo_url": null,
    "ingredients_photo_url": null
  }
}
```

## Response

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
  "status": "error",
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "fields": {
    "barcode": "Barcode is required",
    "issue_type": "Invalid issue_type. Must be one of: NOT_FOUND, MISSING_INGREDIENTS, LOOKUP_ERROR, OCR_FAILED"
  }
}
```

### Server Error (500 Internal Server Error)

```json
{
  "status": "error",
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

## Field Validation

### Required Fields
- `country`: CHAR(2), default "DK"
- `barcode`: VARCHAR(32), required
- `issue_type`: One of: `NOT_FOUND`, `MISSING_INGREDIENTS`, `LOOKUP_ERROR`, `OCR_FAILED`
- `client.app_version`: VARCHAR(16), required
- `client.build_number`: VARCHAR(16), required
- `client.os_version`: VARCHAR(16), required
- `client.device_model`: VARCHAR(64), required

### Optional Fields
- `barcode_type`: VARCHAR(16)
- `lookup_source`: VARCHAR(64)
- `http_status`: INTEGER
- `error_code`: VARCHAR(64)
- `product_name_seen`: TEXT
- `user_note`: TEXT (max 500 chars)
- `client.locale`: VARCHAR(16), default "da-DK"
- `context.*`: All optional
- `attachments.*`: All optional

## Dedupe Logic

Backend genererer `dedupe_hash` automatisk:
```
SHA256(barcode + ":" + issue_type + ":" + YYYY-MM-DD)
```

Hvis hash allerede findes i dag:
- Increment `occurrence_count`
- Update `last_seen_at`
- Return existing `report_id`

Hvis hash ikke findes:
- Create new report
- Return new `report_id`

## Rate Limiting

- **30 requests per minute** per IP/device
- Return `429 Too Many Requests` hvis overskredet:

```json
{
  "status": "error",
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

## Example Implementation (Node.js/Express)

```javascript
const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();
const pool = new Pool({
  // Your PostgreSQL connection config
});

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    status: 'error',
    error: 'Rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

app.post('/v1/reports/missing-product', limiter, async (req, res) => {
  const {
    country = 'DK',
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
      status: 'error',
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fields: {
        barcode: !barcode ? 'Barcode is required' : undefined,
        issue_type: !issue_type ? 'Issue type is required' : undefined,
        client: !client ? 'Client info is required' : undefined
      }
    });
  }

  const validIssueTypes = ['NOT_FOUND', 'MISSING_INGREDIENTS', 'LOOKUP_ERROR', 'OCR_FAILED'];
  if (!validIssueTypes.includes(issue_type)) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid issue_type',
      code: 'VALIDATION_ERROR',
      fields: {
        issue_type: `Must be one of: ${validIssueTypes.join(', ')}`
      }
    });
  }

  try {
    // Call PostgreSQL function
    const result = await pool.query(
      `SELECT upsert_missing_product_report(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      ) as report_id`,
      [
        country,
        barcode,
        barcode_type || null,
        issue_type,
        lookup_source || null,
        http_status || null,
        error_code || null,
        product_name_seen || null,
        user_note?.substring(0, 500) || null,
        client.app_version,
        client.build_number,
        client.os_version,
        client.device_model,
        client.locale || 'da-DK',
        attachments?.product_photo_url || null,
        attachments?.ingredients_photo_url || null,
        JSON.stringify(req.body) // raw_payload
      ]
    );

    const reportId = result.rows[0].report_id;

    res.status(201).json({
      status: 'ok',
      report_id: reportId,
      message: 'received'
    });
  } catch (error) {
    console.error('Error processing report:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});
```

## Export Endpoint (Admin)

**GET** `/v1/reports/missing-product/export`

### Query Parameters
- `from`: ISO date (YYYY-MM-DD)
- `to`: ISO date (YYYY-MM-DD)
- `issue_type`: Filter by issue type
- `country`: Filter by country (default: DK)
- `format`: `json` or `csv` (default: json)

### Example Request
```
GET /v1/reports/missing-product/export?from=2025-12-01&to=2025-12-31&issue_type=NOT_FOUND&format=csv
```

### Response (JSON)
```json
{
  "count": 150,
  "reports": [
    {
      "id": "uuid",
      "barcode": "5701234567890",
      "barcode_type": "EAN13",
      "issue_type": "NOT_FOUND",
      "occurrence_count": 5,
      "product_name_seen": null,
      "created_at": "2025-12-16T10:00:00Z",
      "last_seen_at": "2025-12-16T18:00:00Z"
    }
  ]
}
```

### Response (CSV)
```
id,barcode,barcode_type,issue_type,occurrence_count,product_name_seen,created_at,last_seen_at
550e8400-e29b-41d4-a716-446655440000,5701234567890,EAN13,NOT_FOUND,5,,2025-12-16T10:00:00Z,2025-12-16T18:00:00Z
```

## Top Issues Endpoint

**GET** `/v1/reports/missing-product/top`

### Query Parameters
- `limit`: Number of results (default: 100)
- `issue_type`: Filter by issue type
- `country`: Filter by country (default: DK)

### Response
```json
{
  "top_barcodes": [
    {
      "barcode": "5701234567890",
      "barcode_type": "EAN13",
      "issue_type": "NOT_FOUND",
      "occurrence_count": 15,
      "last_seen_at": "2025-12-16T18:00:00Z"
    }
  ],
  "by_issue_type": {
    "NOT_FOUND": 120,
    "MISSING_INGREDIENTS": 45,
    "LOOKUP_ERROR": 8
  }
}
```

