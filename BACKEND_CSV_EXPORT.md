# CSV Export Endpoint - Backend Implementation

## Endpoint

**GET** `/v1/reports/missing-product/export.csv`

## Query Parameters

| Parameter | Type | Required | Default | Example |
|-----------|------|----------|---------|---------|
| `from` | date (ISO) | Yes | - | `2025-12-10` |
| `to` | date (ISO) | Yes | - | `2025-12-17` |
| `country` | string | No | `DK` | `DK` |
| `issue_type` | string | No | `null` (all) | `NOT_FOUND` |
| `limit` | int | No | `1000` | `5000` |

## Response Headers

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="missing_products_DK_2025-12-10_2025-12-17.csv"
```

## CSV Columns (Fixed Order)

1. `created_at` - ISO 8601 timestamp
2. `last_seen_at` - ISO 8601 timestamp
3. `barcode` - EAN/UPC code
4. `barcode_type` - EAN13, EAN8, UPC, etc.
5. `issue_type` - NOT_FOUND, MISSING_INGREDIENTS, LOOKUP_ERROR, OCR_FAILED
6. `lookup_source` - openfoodfacts, internal_db, etc.
7. `http_status` - HTTP status code (if applicable)
8. `error_code` - timeout, network_error, etc.
9. `occurrence_count` - Number of times reported
10. `app_version` - App version string
11. `build_number` - Build number
12. `os_version` - iOS/Android version
13. `device_model` - Device model
14. `locale` - Locale (e.g., da-DK)
15. `product_name_seen` - Product name if available
16. `country` - Country code (DK)

## CSV Format

- **Header row**: Column names (first line)
- **Encoding**: UTF-8
- **Line endings**: `\n` (Unix-style)
- **Quoting**: Fields containing commas/quotes are quoted with double quotes
- **Date format**: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)

## Example Request

```
GET /v1/reports/missing-product/export.csv?from=2025-12-10&to=2025-12-17&country=DK&issue_type=NOT_FOUND&limit=1000
```

## Example Response

```csv
created_at,last_seen_at,barcode,barcode_type,issue_type,lookup_source,http_status,error_code,occurrence_count,app_version,build_number,os_version,device_model,locale,product_name_seen,country
2025-12-10T10:30:00Z,2025-12-16T18:45:00Z,5701234567890,EAN13,NOT_FOUND,openfoodfacts,404,,15,0.9.4,45,17.6,iPhone14,5,da-DK,,DK
2025-12-10T11:15:00Z,2025-12-16T19:20:00Z,5701234567891,EAN13,NOT_FOUND,openfoodfacts,404,,12,0.9.4,45,17.6,iPhone14,5,da-DK,,DK
```

## Security

### Option 1: Admin Token (Recommended)

```javascript
// Header required
X-Admin-Token: <admin-token>
```

### Option 2: IP Whitelist

Only allow requests from internal IPs (e.g., office network).

### Option 3: Basic Auth

```javascript
Authorization: Basic <base64-encoded-credentials>
```

## Error Responses

### 400 Bad Request (Missing Parameters)

```json
{
  "error": "Missing required parameter: from"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

- **Recommended**: 10 requests per minute per IP
- **Purpose**: Prevent abuse and database overload

## Usage Examples

### Download CSV in Browser

```
https://your-backend.com/v1/reports/missing-product/export.csv?from=2025-12-10&to=2025-12-17&country=DK
```

### Download via cURL

```bash
curl -H "X-Admin-Token: your-token" \
  "https://your-backend.com/v1/reports/missing-product/export.csv?from=2025-12-10&to=2025-12-17&country=DK&issue_type=NOT_FOUND" \
  -o missing_products.csv
```

### Import in Pandas

```python
import pandas as pd

df = pd.read_csv('missing_products.csv', parse_dates=['created_at', 'last_seen_at'])
top_20 = df.groupby('barcode')['occurrence_count'].sum().sort_values(ascending=False).head(20)
```

### Import in Excel/Sheets

1. Download CSV
2. Open in Excel/Google Sheets
3. Data is automatically parsed

## Analysis Queries (Post-Export)

After downloading CSV, you can ask:

- "Gi meg top 20 EAN-koder som mangler i DK"
- "Hvor mange feil var NOT_FOUND vs NETWORK_ERROR?"
- "Hvilken kilde feiler mest?"
- "Hvilke app-versjoner har flest rapporter?"

