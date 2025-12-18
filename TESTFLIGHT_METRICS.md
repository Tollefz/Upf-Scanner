# TestFlight Metrics - v1

## Metrics til Måling

### 1. State Distribution

**Mål:** Andel scans som ender i hver state

```typescript
// Eksempel output:
{
  totalScans: 1000,
  byState: {
    found: 650,        // 65%
    not_found: 200,    // 20%
    network_error: 80, // 8%
    scan_error: 50,    // 5%
    missing_data: 20,  // 2% (skal være lav i v1)
    timeout: 0,
    unknown_error: 0
  }
}
```

**Success Criteria:**
- ✅ 90%+ af scans ender i tydelig state
- ✅ <5% `scan_error` (multi-frame validation virker)
- ✅ <10% `network_error` (god netværkshåndtering)

**Hvordan måle:**
```typescript
import { getStateDistribution } from '@/utils/metrics';

const distribution = await getStateDistribution();
console.log('State distribution:', distribution);
// { found: 65.0, not_found: 20.0, network_error: 8.0, ... }
```

### 2. Top 20 Mest Rapporterede EAN-koder (DK)

**Mål:** Identificer hvilke produkter mangler mest

**Backend Query:**
```sql
SELECT 
  barcode,
  barcode_type,
  issue_type,
  occurrence_count,
  last_seen_at,
  product_name_seen
FROM missing_product_reports
WHERE country = 'DK'
  AND issue_type = 'NOT_FOUND'
ORDER BY occurrence_count DESC, last_seen_at DESC
LIMIT 20;
```

**Via API:**
```
GET /v1/reports/missing-product/top?limit=20&country=DK&issue_type=NOT_FOUND
```

**Success Criteria:**
- ✅ 50+ unikke barcodes rapporteret i første uge
- ✅ Top 20 identificeret for prioritert fiksing

### 3. Median Latency på Lookup

**Mål:** Mål lookup performance

```typescript
import { getMetrics } from '@/utils/metrics';

const metrics = await getMetrics();
console.log('Median latency:', metrics.medianLatency, 'ms');
console.log('Average latency:', metrics.avgLatency, 'ms');
```

**Success Criteria:**
- ✅ Median latency < 2000ms (2 sekunder)
- ✅ 95th percentile < 5000ms (5 sekunder)

**Eksempel output:**
```json
{
  "medianLatency": 842,
  "avgLatency": 912,
  "totalScans": 1000
}
```

## Hvordan Måle i TestFlight

### Option 1: Via Backend Export

1. **Efter TestFlight periode:**
   ```bash
   curl "https://your-backend.com/v1/reports/missing-product/export?from=2025-12-01&to=2025-12-31&format=json" \
     -H "Authorization: Bearer <admin-token>"
   ```

2. **Analyser data:**
   - Tæl rapporter per `issue_type`
   - Sorter efter `occurrence_count`
   - Beregn median `latency_ms` fra `context.latency_ms`

### Option 2: Via App Logs (Lokalt)

1. **Eksporter metrics:**
   ```typescript
   import { exportMetricsAsJSON } from '@/utils/metrics';
   
   const json = await exportMetricsAsJSON();
   // Send til backend eller gem lokalt
   ```

2. **Se i debug mode:**
   - Metrics vises i debug container (hvis DEV_MODE = true)

### Option 3: Via Backend Dashboard (Fremtidig)

Implementer dashboard endpoint:
```
GET /v1/admin/metrics?from=...&to=...
```

Returnerer:
```json
{
  "state_distribution": {
    "found": 65.0,
    "not_found": 20.0,
    "network_error": 8.0,
    "scan_error": 5.0,
    "missing_data": 2.0
  },
  "latency": {
    "median": 842,
    "avg": 912,
    "p95": 2340,
    "p99": 4500
  },
  "top_barcodes": [
    {
      "barcode": "5701234567890",
      "count": 15,
      "issue_type": "NOT_FOUND"
    }
  ]
}
```

## Konkrete Test Scenarier

### Scenario 1: Stabil Barcode
1. Scan samme barcode 5+ gange
2. **Forventet:** Går til `found` eller `not_found` (ikke `scan_error`)
3. **Mål:** `scan_error` rate < 5%

### Scenario 2: Ustabil Barcode
1. Scan forskellige barcodes hurtigt
2. **Forventet:** Viser `scan_error` med forslag
3. **Mål:** `scan_error` håndteres korrekt

### Scenario 3: Offline
1. Slå WiFi/mobil data af
2. Scan barcode
3. **Forventet:** Viser `network_error`, IKKE `not_found`
4. **Mål:** 0% false `not_found` fra network errors

### Scenario 4: 404 Produkt
1. Scan ugyldig/ukendt barcode
2. **Forventet:** Viser `not_found` med "Rapportér produkt" knap
3. **Mål:** Rapport sendes til backend

### Scenario 5: Timeout
1. Simuler langsomt netværk (via dev tools)
2. Scan barcode
3. **Forventet:** Viser `network_error` med "Prøv igen", IKKE `not_found`
4. **Mål:** 0% false `not_found` fra timeouts

## Success Metrics Dashboard (Eksempel)

```
📊 TestFlight v1 Metrics (Uge 1)

Total Scans: 1,234

State Distribution:
✅ found:           65.2% (804)
✅ not_found:       20.1% (248)
⚠️  network_error:   8.3% (102)
⚠️  scan_error:       4.8% (59)
   missing_data:     1.6% (20)

Performance:
✅ Median latency:  842ms
✅ Avg latency:     912ms
✅ P95 latency:     2,340ms

Top 5 Rapporterede Barcodes:
1. 5701234567890 (EAN13) - 15 rapporter
2. 5701234567891 (EAN13) - 12 rapporter
3. 5701234567892 (EAN13) - 10 rapporter
4. 5701234567893 (EAN13) - 8 rapporter
5. 5701234567894 (EAN13) - 7 rapporter

✅ SUCCESS: Alle kriterier opfyldt!
```

## Action Items Baseret på Metrics

### Hvis `scan_error` > 5%:
- Juster multi-frame validation threshold
- Overvej længere samlingsperiode
- Test på forskellige enheder

### Hvis `network_error` > 10%:
- Implementer caching (v2)
- Optimér timeout værdier
- Overvej retry-strategi

### Hvis `not_found` > 30%:
- Fokusér på datakilde-fallback (v2)
- Prioriter top rapporterede barcodes
- Overvej egen database for DK-produkter

### Hvis median latency > 2000ms:
- Implementer caching (v2)
- Optimér API calls
- Overvej CDN for statisk data

