# Client-side Rate Limit Håndtering

## Hvordan appen håndterer 429 (Rate Limited)

### I submitReport()

Når bruker trykker "Rapporter":

1. Edge Function returnerer HTTP 429 hvis rate limit er nådd
2. `submitReportToSupabase()` kaster error med melding: "For mange rapporter. Prøv igjen om X minutter."
3. `submitReport()` fanger error og returnerer:
   ```typescript
   {
     success: false,
     message: "For mange rapporter. Prøv igjen om X minutter."
   }
   ```
4. UnknownProductScreen viser denne meldingen til brukeren

### I syncUnknownReports()

Når appen syncer pending reports:

1. Hvis rate limit error oppstår:
   - Report forblir i kø (status="queued" eller "failed")
   - Ikke increment retry count (rate limiting er midlertidig)
   - Logg at report er rate limited
   - Fortsett med neste report

2. Report vil bli prøvd igjen i neste sync (etter retryAfterSec)

### UI-melding

**Når rate limited:**
- Vis vennlig melding: "Du har sendt for mange rapporter. Vent litt og prøv igjen."
- Vis estimert ventetid: "Prøv igjen om X minutter"
- Ikke vis teknisk error
- Rapport forblir i kø og sendes automatisk senere

**Eksempel på melding:**
```
"Du har sendt for mange rapporter.
Vent litt og prøv igjen om 5 minutter."
```

### Automatisk Retry

**Viktig:** Ikke retry automatisk ved rate limiting (429):
- Rate limiting er intensjonell
- Automatisk retry vil bare gjøre det verre
- La brukeren vente til neste window (10 minutter)
- Sync funksjonen prøver igjen senere automatisk

### Best Practices

1. **Vennlig språk:** "For mange rapporter" ikke "Rate limit exceeded"
2. **Estimert tid:** Vis når bruker kan prøve igjen (basert på retryAfterSec)
3. **Behold i kø:** Lagre rapport lokalt, send senere
4. **Ikke spam:** Ikke prøv automatisk retry umiddelbart
5. **Informativ:** Forklar at rapporten er lagret og sendes senere

