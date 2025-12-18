/**
 * Sync On App Start
 * 
 * Utility for syncing unknown reports when app starts
 * Call this from app root or layout
 */

import { syncUnknownReports } from './unknownReportSender';

let hasSyncedOnStart = false;

/**
 * Sync pending reports on app start
 * Only runs once per app session
 */
export async function syncOnAppStart(): Promise<void> {
  if (hasSyncedOnStart) {
    return;
  }

  hasSyncedOnStart = true;

  try {
    // Sync up to 10 reports on app start
    await syncUnknownReports(10);
  } catch (error) {
    console.error('[SyncOnAppStart] Error:', error);
    // Don't throw - this is background operation
  }
}

