# Barcode Scanner Integration

## Oversikt

ScanScreen er integrert med expo-camera for å skanne EAN/UPC-strekkoder og navigere til ProductScreen med den skannede GTIN.

## Funksjonalitet

### Kamera-tillatelse
- Be om tillatelse ved første bruk
- Vis loading-state mens tillatelse behandles
- Vis forklaring + knapper hvis tillatelse nektes
- Knapp for å åpne innstillinger hvis tillatelse ikke kan spørres om igjen

### Strekkode-skanning
- Støtter: EAN-8, EAN-13, UPC-A, UPC-E, GTIN-14
- Normaliserer GTIN (fjerner mellomrom/bindestrek)
- Validerer GTIN med checksum før navigasjon

### Debounce / Single Fire
- 2 sekunders cooldown mellom skanninger
- Ignorerer samme kode hvis skannet igjen
- Deaktiverer scanning når navigasjon starter

### Navigasjon
- Navigerer til `/product` med `gtin` parameter
- ProductScreen leser `gtin` fra route params og kaller `lookupProduct(gtin)`

## Teknisk

### Brukte biblioteker
- `expo-camera` - CameraView med barcodeScannerEnabled
- `expo-router` - Navigasjon med params
- `src/utils/gtin` - GTIN-validering og normalisering

### States
1. **Loading permission**: Viser "Ber om kameratillatelse..."
2. **Denied permission**: Viser forklaring + knapper
3. **Scanning**: Viser kamera med scan frame overlay
4. **Scanning disabled**: Når navigasjon starter, deaktiverer scanning

### Scan Frame Overlay
- Sentral scan frame (300x300)
- Semi-transparent overlay rundt
- Corner indicators i hjørnene
- Instruksjonstekst nederst

## Testing

1. Start appen → ScanScreen vises
2. Gi kameratillatelse (første gang)
3. Scan en strekkode (f.eks. Nutella: 3017620422003)
4. Appen navigerer automatisk til ProductScreen
5. ProductScreen henter produktdata via `lookupProduct(gtin)`

## Troubleshooting

### Kamera ikke vises
- Sjekk at kameratillatelse er gitt
- Sjekk at expo-camera er installert og oppdatert

### Strekkode ikke detekteres
- Sjekk at strekkode er i godt lys
- Sjekk at strekkode er synlig i scan frame
- Prøv å holde kameraet stødig

### Navigasjon skjer ikke
- Sjekk at GTIN er gyldig (8, 12, 13, eller 14 siffer)
- Sjekk console for valideringsfeil
- Sjekk at `/product` route er riktig satt opp

