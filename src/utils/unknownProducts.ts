/**
 * Unknown Products Storage
 * 
 * Lagrer ukjente produkter (not_found) i lokal kø for sending til Supabase
 * Støtter offline-kø med status tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'unknown_products_queue';
const MAX_ITEMS = 500; // Cap på maks 500 items

export interface UnknownProductReport {
  gtin: string;
  createdAt: string; // ISO 8601 format
  photoUri?: string; // Local file URI (for image upload)
  manualName?: string; // Manuelt skrevet navn
  note?: string; // Valgfritt notat
  ocrText?: string; // OCR-extracted text (hvis tilgjengelig)
  
  // Queue status fields
  status: 'queued' | 'sent' | 'failed';
  reportId?: string; // Supabase report ID
  lastError?: string; // Last error message if failed
  retryCount?: number; // Number of retry attempts
}

/**
 * Legger til en ny ukjent produktrapport i køen
 * Default status er "queued"
 */
export async function addUnknownReport(
  report: Omit<UnknownProductReport, 'status' | 'retryCount'>
): Promise<void> {
  try {
    if (!report.gtin || !report.createdAt) {
      throw new Error('GTIN og createdAt er påkrevd');
    }

    const existing = await listUnknownReports();
    
    // Sjekk om dette GTIN allerede finnes med samme status
    const existingIndex = existing.findIndex(r => r.gtin === report.gtin);
    
    let updated: UnknownProductReport[];
    
    if (existingIndex >= 0) {
      // Oppdater eksisterende entry (behold status hvis allerede sent)
      const existingReport = existing[existingIndex];
      updated = [...existing];
      updated[existingIndex] = {
        ...report,
        status: existingReport.status === 'sent' ? 'sent' : 'queued',
        reportId: existingReport.reportId,
        retryCount: existingReport.retryCount || 0,
      };
    } else {
      // Legg til ny entry med status "queued"
      const newReport: UnknownProductReport = {
        ...report,
        status: 'queued',
        retryCount: 0,
      };
      updated = [...existing, newReport];
      
      // Cap på maks 500 items - fjern eldste "sent" items først, deretter "failed"
      if (updated.length > MAX_ITEMS) {
        // Prioriter å beholde queued og recent failed
        updated.sort((a, b) => {
          // Queued først
          if (a.status === 'queued' && b.status !== 'queued') return -1;
          if (b.status === 'queued' && a.status !== 'queued') return 1;
          // Nyeste først
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        updated = updated.slice(0, MAX_ITEMS);
      }
    }
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding unknown report:', error);
    throw error;
  }
}

/**
 * Oppdaterer status på en eksisterende rapport
 */
export async function updateReportStatus(
  gtin: string,
  status: 'queued' | 'sent' | 'failed',
  reportId?: string,
  lastError?: string
): Promise<void> {
  try {
    const reports = await listUnknownReports();
    const index = reports.findIndex(r => r.gtin === gtin);
    
    if (index >= 0) {
      reports[index] = {
        ...reports[index],
        status,
        reportId: reportId || reports[index].reportId,
        lastError: lastError || reports[index].lastError,
        retryCount: (reports[index].retryCount || 0) + (status === 'failed' ? 1 : 0),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    }
  } catch (error) {
    console.error('Error updating report status:', error);
    throw error;
  }
}

/**
 * Henter alle ukjente produktrapporter
 */
export async function listUnknownReports(): Promise<UnknownProductReport[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const reports = JSON.parse(data) as UnknownProductReport[];
    
    // Migrer gamle format til nytt (hvis nødvendig)
    return reports.map(r => ({
      ...r,
      status: r.status || 'queued',
      retryCount: r.retryCount || 0,
    })).filter(r => r.gtin && r.createdAt);
  } catch (error) {
    console.error('Error listing unknown reports:', error);
    return [];
  }
}

/**
 * Henter ukjente produktrapporter som er queued eller failed
 */
export async function listPendingReports(): Promise<UnknownProductReport[]> {
  const reports = await listUnknownReports();
  return reports.filter(r => r.status === 'queued' || r.status === 'failed');
}

/**
 * Henter ukjente produktrapporter sortert etter createdAt (nyeste først)
 */
export async function listUnknownReportsSorted(): Promise<UnknownProductReport[]> {
  const reports = await listUnknownReports();
  return reports.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Sletter en spesifikk rapport
 */
export async function deleteReport(gtin: string): Promise<void> {
  try {
    const reports = await listUnknownReports();
    const filtered = reports.filter(r => r.gtin !== gtin);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}

/**
 * Sletter alle ukjente produktrapporter
 */
export async function clearUnknownReports(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing unknown reports:', error);
    throw error;
  }
}

/**
 * Sletter kun rapporter med status "sent"
 */
export async function clearSentReports(): Promise<void> {
  try {
    const reports = await listUnknownReports();
    const filtered = reports.filter(r => r.status !== 'sent');
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error clearing sent reports:', error);
    throw error;
  }
}

/**
 * Henter antall ukjente produktrapporter
 */
export async function getUnknownReportsCount(): Promise<number> {
  const reports = await listUnknownReports();
  return reports.length;
}

/**
 * Henter antall pending rapporter (queued + failed)
 */
export async function getPendingReportsCount(): Promise<number> {
  const pending = await listPendingReports();
  return pending.length;
}
