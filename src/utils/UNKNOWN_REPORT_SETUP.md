# Unknown Report Setup - Oppsummering

## Implementert

### 1. Supabase Client
- `src/lib/supabase.ts` - Initialiserer Supabase client med anon key
- Leser config fra `EXPO_PUBLIC_SUPABASE_URL` og `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 2. Queue System
- `src/utils/unknownProducts.ts` - Oppdatert med status, reportId, lastError, retryCount
- Støtter: queued, sent, failed
- Cap på 500 items

### 3. Report Sender
- `src/utils/unknownReportSender.ts` - Submit, upload, sync funksjonalitet
- `submitReport()` - Sender umiddelbart hvis online, ellers lagrer i kø
- `syncUnknownReports()` - Syncer alle pending reports
- Støtter image upload via signed URLs
- Max 3 retries per report

### 4. UI Integration
- `src/screens/UnknownProductScreen.tsx` - Oppdatert til å bruke submitReport()
- Viser riktig melding basert på online/offline status
- "Takk for rapporten!" eller "Lagret – sendes automatisk når du er på nett."

### 5. Auto Sync
- `src/utils/syncOnAppStart.ts` - Syncer ved app start
- `app/_layout.tsx` - Kaller syncOnAppStart() ved mount
- `src/screens/ScanScreen.tsx` - Syncer når skjermen får focus

## Installer Dependencies

```bash
npm install @supabase/supabase-js
```

## Environment Variables

Legg til i `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://your-project.supabase.co",
      "supabaseAnonKey": "your-anon-key"
    }
  }
}
```

Eller bruk `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Funksjonalitet

### Når bruker trykker "Rapporter":
1. Report lagres lokalt med status="queued"
2. Prøver å sende umiddelbart hvis online
3. Hvis bilde: Får signed URL og uploader bildet
4. Markerer som "sent" ved success
5. Viser "Takk for rapporten!" eller offline-melding

### Auto Sync:
- Ved app start (via _layout.tsx)
- Når ScanScreen får focus (via useFocusEffect)
- Håndterer offline kø automatisk

## Flow

```
User clicks "Rapporter"
  ↓
addUnknownReport() → status="queued"
  ↓
submitReport() → Check online
  ↓
If online:
  → submitReportToSupabase()
  → uploadImageToSupabase() (if image)
  → updateReportStatus(status="sent")
  ↓
If offline:
  → Report stays in queue
  → Sync later via syncUnknownReports()
```

