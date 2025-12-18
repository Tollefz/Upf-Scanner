# Backend Analysis Guide - Missing Product Reports

## Oversigt

Efter Danmark-testen kan du analysere dataene via SQL-queries og CSV-export. Dette dokument beskriver hvordan.

## 📊 Quick Analysis Endpoints

### 1. Top Missing Barcodes

**GET** `/v1/reports/missing-product/top`

**Query Parameters:**
- `from` (required): Start date (ISO: YYYY-MM-DD)
- `to` (required): End date (ISO: YYYY-MM-DD)
- `country` (optional): Default `DK`
- `issue_type` (optional): Default `NOT_FOUND`
- `limit` (optional): Default `50`

**Example:**
```
GET /v1/reports/missing-product/top?from=2025-12-10&to=2025-12-17&country=DK&issue_type=NOT_FOUND&limit=20
```

**Response:**
```json
{
  "country": "DK",
  "issue_type": "NOT_FOUND",
  "from": "2025-12-10",
  "to": "2025-12-17",
  "count": 20,
  "top_barcodes": [
    {
      "barcode": "5701234567890",
      "barcode_type": "EAN13",
      "total_reports": 15,
      "unique_days": 5,
      "first_seen": "2025-12-10T10:30:00Z",
      "last_seen": "2025-12-16T18:45:00Z",
      "product_name_seen": null
    }
  ]
}
```

### 2. Statistics (Health Check)

**GET** `/v1/reports/missing-product/stats`

**Response:**
```json
{
  "country": "DK",
  "from": "2025-12-10",
  "to": "2025-12-17",
  "overall": {
    "total_reports": 150,
    "total_occurrences": 234,
    "unique_barcodes": 87,
    "days_with_reports": 7
  },
  "by_issue_type": [
    {
      "issue_type": "NOT_FOUND",
      "total_reports": 120,
      "unique_barcodes": 65
    },
    {
      "issue_type": "NETWORK_ERROR",
      "total_reports": 20,
      "unique_barcodes": 15
    }
  ]
}
```

## 📥 CSV Export

### Download CSV

**GET** `/v1/reports/missing-product/export.csv`

**Query Parameters:**
- `from` (required): Start date
- `to` (required): End date
- `country` (optional): Default `DK`
- `issue_type` (optional): Filter by issue type
- `limit` (optional): Default `1000`, max `10000`

**Example:**
```
GET /v1/reports/missing-product/export.csv?from=2025-12-10&to=2025-12-17&country=DK&issue_type=NOT_FOUND
```

**Response:**
- CSV file download
- Filename: `missing_products_DK_2025-12-10_2025-12-17.csv`

### Use CSV in Analysis

#### Excel/Google Sheets
1. Download CSV
2. Open in Excel/Sheets
3. Data is automatically parsed

#### Pandas (Python)
```python
import pandas as pd

# Load CSV
df = pd.read_csv('missing_products_DK_2025-12-10_2025-12-17.csv', 
                 parse_dates=['created_at', 'last_seen_at'])

# Top 20 barcodes
top_20 = df.groupby('barcode')['occurrence_count'].sum().sort_values(ascending=False).head(20)
print(top_20)

# Issue type distribution
issue_dist = df.groupby('issue_type')['occurrence_count'].sum()
print(issue_dist)

# Network errors
network_errors = df[df['issue_type'] == 'LOOKUP_ERROR']
print(f"Network errors: {len(network_errors)}")
```

#### Cursor/ChatGPT Analysis
1. Download CSV
2. Paste into Cursor/ChatGPT
3. Ask questions:
   - "Gi meg top 20 EAN-koder som mangler i DK"
   - "Hvor mange feil var NOT_FOUND vs NETWORK_ERROR?"
   - "Hvilken kilde feiler mest?"
   - "Hvilke app-versjoner har flest rapporter?"

## 🔍 SQL Queries (Direct Database Access)

Se `BACKEND_ANALYSIS_QUERIES.sql` for komplette SQL-queries.

### Top 20 Missing Barcodes (NOT_FOUND)

```sql
SELECT
    barcode,
    barcode_type,
    SUM(occurrence_count) AS total_reports,
    COUNT(*) AS unique_days,
    MAX(product_name_seen) AS product_name
FROM missing_product_reports
WHERE country = 'DK'
  AND issue_type = 'NOT_FOUND'
  AND created_at >= '2025-12-10'
  AND created_at < '2025-12-18'
GROUP BY barcode, barcode_type
ORDER BY total_reports DESC
LIMIT 20;
```

### Issue Type Distribution

```sql
SELECT
    issue_type,
    SUM(occurrence_count) AS total_reports,
    COUNT(DISTINCT barcode) AS unique_barcodes
FROM missing_product_reports
WHERE country = 'DK'
  AND created_at >= '2025-12-10'
  AND created_at < '2025-12-18'
GROUP BY issue_type
ORDER BY total_reports DESC;
```

## 📈 Analysis Workflow

### Efter Danmark-testen:

1. **Quick Overview**
   ```
   GET /v1/reports/missing-product/stats?from=2025-12-10&to=2025-12-17
   ```
   - Se totalt antal rapporter
   - Se fordeling af issue types

2. **Top Missing Products**
   ```
   GET /v1/reports/missing-product/top?from=2025-12-10&to=2025-12-17&limit=20
   ```
   - Identificer top 20 manglende barcodes
   - Prioriter DB-fiks baseret på frekvens

3. **Download Full Data**
   ```
   GET /v1/reports/missing-product/export.csv?from=2025-12-10&to=2025-12-17
   ```
   - Analyser i Excel/Pandas
   - Find mønstre (samme butikker? samme merke?)

4. **Action Items**
   - Seed DB med top 20-50 manglende produkter
   - Fikse datakilde-problemer (hvis network_errors er høje)
   - Forbedre scanning (hvis scan_errors er høje)

## 🔐 Security

**Authentication:**
- Header: `X-Admin-Token: <admin-token>`
- Or: IP whitelist
- Or: Basic Auth

**Rate Limiting:**
- 10 requests per minute per IP

## ✅ Done / Acceptkriterier

- [x] CSV kan lastes ned i nettleser
- [x] Data matcher DB
- [x] Rekkefølge og kolonnenavn er stabile
- [x] Export funker for Danmark-test uten ekstra tooling
- [x] Top barcodes endpoint for quick analysis
- [x] Statistics endpoint for health check

## 📝 Eksempel: Efter Danmark-testen

**Scenario:** Du har testet i Danmark fra 10. dec til 17. dec.

**Step 1: Quick Stats**
```bash
curl -H "X-Admin-Token: your-token" \
  "https://your-backend.com/v1/reports/missing-product/stats?from=2025-12-10&to=2025-12-17"
```

**Result:**
- 150 total reports
- 87 unique barcodes
- 120 NOT_FOUND, 20 NETWORK_ERROR, 10 SCAN_ERROR

**Step 2: Top Missing**
```bash
curl -H "X-Admin-Token: your-token" \
  "https://your-backend.com/v1/reports/missing-product/top?from=2025-12-10&to=2025-12-17&limit=20"
```

**Result:**
- Top 20 barcodes identificeret
- Prioriter DB-fiks baseret på frekvens

**Step 3: Full Analysis**
```bash
curl -H "X-Admin-Token: your-token" \
  "https://your-backend.com/v1/reports/missing-product/export.csv?from=2025-12-10&to=2025-12-17" \
  -o missing_products.csv
```

**Result:**
- CSV downloadet
- Analyser i Excel/Pandas
- Find mønstre og action items

---

**Status:** ✅ Klar til brug efter Danmark-testen!

