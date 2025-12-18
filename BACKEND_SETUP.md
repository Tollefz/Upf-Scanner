# Backend Setup for Product Reporting

## Oversikt

Appen sender automatisk produktrapporter til en backend når brukere rapporterer manglende eller feil produkter. Dette dokumentet beskriver hvordan du setter opp backend for å motta disse rapportene.

## API Endpoint

**URL**: `POST /api/reports`

**Content-Type**: `application/json`

## Request Format

```json
{
  "reports": [
    {
      "barcode": "1234567890123",
      "status": "not_found" | "missing_ingredients" | "error",
      "productName": "Produktnavn (optional)",
      "timestamp": 1702752000000,
      "imageUri": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." (optional),
      "appVersion": "1.0.0"
    }
  ],
  "timestamp": 1702752000000
}
```

## Response Format

Backend bør returnere HTTP 200 med:

```json
{
  "accepted": ["1234567890123"], // Optional: list of accepted barcodes
  "message": "Reports received successfully"
}
```

Eller HTTP 4xx/5xx ved feil:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Status-verdier

- `not_found`: Produktet finnes ikke i Open Food Facts-databasen
- `missing_ingredients`: Produktet finnes, men mangler ingrediensliste
- `error`: Teknisk feil (nettverk, timeout, etc.)

## Bildehåndtering

Hvis `imageUri` er inkludert, er det en base64-kodet bilde (JPEG/PNG). Format:
```
data:image/jpeg;base64,<base64-encoded-image>
```

Backend bør:
1. Dekode base64-strengen
2. Lagre bildet (f.eks. til S3, Cloud Storage, eller lokal filsystem)
3. Lagre referanse til bildet i databasen sammen med rapporten

## Eksempel: Node.js/Express Backend

```javascript
const express = require('express');
const app = express();

app.use(express.json({ limit: '10mb' })); // For bilde-upload

app.post('/api/reports', async (req, res) => {
  const { reports, timestamp } = req.body;
  
  try {
    const acceptedBarcodes = [];
    
    for (const report of reports) {
      // Process image if present
      let imageUrl = null;
      if (report.imageUri) {
        imageUrl = await saveImage(report.imageUri, report.barcode);
      }
      
      // Save to database
      await db.productReports.create({
        barcode: report.barcode,
        status: report.status,
        productName: report.productName,
        imageUrl: imageUrl,
        timestamp: new Date(report.timestamp),
        appVersion: report.appVersion,
      });
      
      acceptedBarcodes.push(report.barcode);
    }
    
    res.json({
      accepted: acceptedBarcodes,
      message: `Received ${reports.length} reports`
    });
  } catch (error) {
    console.error('Error processing reports:', error);
    res.status(500).json({
      error: 'Failed to process reports',
      code: 'INTERNAL_ERROR'
    });
  }
});

async function saveImage(imageUri, barcode) {
  // Extract base64 data
  const base64Data = imageUri.split(',')[1];
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Save to storage (example: AWS S3, Google Cloud Storage, etc.)
  const filename = `${barcode}-${Date.now()}.jpg`;
  // ... upload to your storage service
  // return URL to saved image
  return `https://your-storage.com/images/${filename}`;
}
```

## Eksempel: Python/Flask Backend

```python
from flask import Flask, request, jsonify
import base64
from datetime import datetime

app = Flask(__name__)

@app.route('/api/reports', methods=['POST'])
def receive_reports():
    data = request.json
    reports = data.get('reports', [])
    
    accepted_barcodes = []
    
    for report in reports:
        # Process image if present
        image_url = None
        if report.get('imageUri'):
            image_url = save_image(report['imageUri'], report['barcode'])
        
        # Save to database
        save_to_database(
            barcode=report['barcode'],
            status=report['status'],
            product_name=report.get('productName'),
            image_url=image_url,
            timestamp=datetime.fromtimestamp(report['timestamp'] / 1000),
            app_version=report.get('appVersion', '1.0.0')
        )
        
        accepted_barcodes.append(report['barcode'])
    
    return jsonify({
        'accepted': accepted_barcodes,
        'message': f'Received {len(reports)} reports'
    })

def save_image(image_uri, barcode):
    # Extract base64 data
    header, encoded = image_uri.split(',', 1)
    image_data = base64.b64decode(encoded)
    
    # Save to storage
    filename = f"{barcode}-{int(datetime.now().timestamp())}.jpg"
    # ... upload to your storage service
    # return URL to saved image
    return f"https://your-storage.com/images/{filename}"
```

## Database Schema (forslag)

```sql
CREATE TABLE product_reports (
  id SERIAL PRIMARY KEY,
  barcode VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'not_found', 'missing_ingredients', 'error'
  product_name VARCHAR(255),
  image_url TEXT,
  timestamp TIMESTAMP NOT NULL,
  app_version VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE,
  INDEX idx_barcode (barcode),
  INDEX idx_status (status),
  INDEX idx_processed (processed)
);
```

## Håndtering av duplikater

Appen prøver å unngå duplikater ved å sjekke om samme barcode+status allerede finnes i køen. Backend bør også håndtere duplikater:

```javascript
// Example: Check if report already exists
const existing = await db.productReports.findOne({
  where: {
    barcode: report.barcode,
    status: report.status,
    processed: false
  }
});

if (existing) {
  // Update existing instead of creating new
  await existing.update({ timestamp: new Date(report.timestamp) });
} else {
  // Create new
  await db.productReports.create({...});
}
```

## Testing

Test backend med curl:

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "reports": [
      {
        "barcode": "1234567890123",
        "status": "not_found",
        "timestamp": 1702752000000,
        "appVersion": "1.0.0"
      }
    ],
    "timestamp": 1702752000000
  }'
```

## Sikkerhet

1. **Rate limiting**: Implementer rate limiting for å forhindre misbruk
2. **Autentisering**: Vurder API keys eller OAuth for produksjon
3. **Validering**: Valider all input (barcode format, status values, etc.)
4. **Bilde-størrelse**: Begrens bilde-størrelse (f.eks. max 5MB)

## Monitoring

Logg følgende for monitoring:
- Antall mottatte rapporter per dag
- Fordeling av status-typer
- Antall rapporter med bilder
- Feilrate ved bilde-opplasting
- Gjennomsnittlig responstid

