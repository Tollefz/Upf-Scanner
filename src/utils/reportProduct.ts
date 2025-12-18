/**
 * Enkel produktrapportering til Supabase Edge Function
 * 
 * Bruk denne funksjonen for å rapportere produkter til submit-unknown-report Edge Function
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ReportProductParams {
  gtin: string;
  comment?: string; // Optional reason/comment
}

export interface ReportProductResult {
  success: boolean;
  message: string;
  reportId?: string;
}

/**
 * Sender en produktrapport til Supabase Edge Function
 * 
 * @param gtin - Produktkode (GTIN/EAN)
 * @param comment - Valgfritt kommentar/grunn
 * @returns Resultat med success status og melding
 * 
 * @example
 * const result = await reportProduct('3017620422003', 'Produktet mangler i databasen');
 * if (result.success) {
 *   console.log('Rapport sendt!', result.reportId);
 * }
 */
export async function reportProduct(
  gtin: string,
  comment?: string
): Promise<ReportProductResult> {
  // Valider input
  if (!gtin || !gtin.trim()) {
    return {
      success: false,
      message: 'Produktkode (GTIN) er påkrevd',
    };
  }

  // Sjekk at Supabase er konfigurert
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      message: 'Supabase er ikke konfigurert. Rapportering er ikke tilgjengelig.',
    };
  }

  try {
    // Kall Edge Function
    const { data, error } = await supabase.functions.invoke('submit-unknown-report', {
      body: {
        gtin: gtin.trim(),
        note: comment?.trim() || undefined, // Bruk 'note' som feltnavn (som Edge Function forventer)
        hasImage: false, // Ingen bilde i denne enkle versjonen
      },
    });

    // Håndter feil fra Supabase
    if (error) {
      console.error('[ReportProduct] Supabase error:', error);
      return {
        success: false,
        message: error.message || 'Kunne ikke sende rapport. Prøv igjen senere.',
      };
    }

    // Håndter feil fra Edge Function
    if (!data || !data.success) {
      const errorMessage = data?.message || 'Ukjent feil oppstod';
      
      // Sjekk om det er rate limiting
      if (data?.code === 'RATE_LIMITED') {
        const minutes = Math.ceil((data.retryAfterSec || 60) / 60);
        return {
          success: false,
          message: `For mange rapporter. Prøv igjen om ${minutes} minutter.`,
        };
      }

      return {
        success: false,
        message: errorMessage,
      };
    }

    // Suksess!
    return {
      success: true,
      message: data.message || 'Rapport sendt',
      reportId: data.reportId,
    };
  } catch (error: any) {
    // Håndter uventede feil
    console.error('[ReportProduct] Unexpected error:', error);
    return {
      success: false,
      message: error.message || 'Noe gikk galt. Sjekk nettforbindelsen og prøv igjen.',
    };
  }
}

