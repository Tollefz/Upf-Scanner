/**
 * Unknown Report Sender
 * 
 * Håndterer sending av unknown product reports til Supabase
 * Støtter offline-kø og automatisk sync
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  addUnknownReport,
  updateReportStatus,
  listPendingReports,
  type UnknownProductReport,
} from './unknownProducts';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const MAX_RETRIES = 3; // Maximum retry attempts per report

interface SubmitResult {
  success: boolean;
  message: string;
  reportId?: string;
  needsImageUpload?: boolean;
  uploadUrl?: string;
  imagePath?: string;
}

/**
 * Checks if device is online
 * Simple implementation - can be improved with NetInfo if needed
 */
async function isOnline(): Promise<boolean> {
  try {
    // Simple connectivity check
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets device info for report
 */
function getDeviceInfo() {
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const platform = Platform.OS; // 'ios' | 'android'
  const locale = Platform.locale || 'da-DK';
  
  // Simple device hash (for abuse control)
  // In production, use expo-device for more reliable device ID
  const deviceId = `${platform}-${Constants.expoConfig?.slug || 'app'}`;
  const deviceHash = hashString(deviceId).substring(0, 16);
  
  return { appVersion, platform, locale, deviceHash };
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Submits a single report to Supabase Edge Function
 */
async function submitReportToSupabase(
  report: UnknownProductReport
): Promise<SubmitResult> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { appVersion, platform, locale, deviceHash } = getDeviceInfo();
    const hasImage = !!report.photoUri;
    const imageExt = report.photoUri?.toLowerCase().endsWith('.png') ? 'png' : 'jpg';

    // Call Edge Function
    const { data: response, error } = await supabase.functions.invoke(
      'submit-unknown-report',
      {
        body: {
          gtin: report.gtin,
          manualName: report.manualName,
          note: report.note,
          ocrText: report.ocrText,
          appVersion,
          platform,
          locale,
          deviceHash,
          hasImage,
          imageExt,
        },
      }
    );

    if (error) {
      throw error;
    }

    if (!response || !response.success) {
      // Check if it's a rate limit error
      if (response?.code === 'RATE_LIMITED') {
        const minutes = Math.ceil((response.retryAfterSec || 60) / 60);
        throw new Error(`For mange rapporter. Prøv igjen om ${minutes} minutter.`);
      }
      throw new Error(response?.message || 'Unknown error from Edge Function');
    }

    return {
      success: true,
      message: response.message,
      reportId: response.reportId,
      needsImageUpload: hasImage && !!response.uploadUrl,
      uploadUrl: response.uploadUrl,
      imagePath: response.imagePath,
    };
  } catch (error: any) {
    console.error('[ReportSender] Error submitting report:', error);
    throw error;
  }
}

/**
 * Uploads image to Supabase storage using signed URL
 */
async function uploadImageToSupabase(
  signedUrl: string,
  localUri: string
): Promise<void> {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Uint8Array
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine content type
    const contentType = localUri.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';

    // Upload to signed URL using PUT
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Image upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    console.log('[ReportSender] Image uploaded successfully');
  } catch (error) {
    console.error('[ReportSender] Error uploading image:', error);
    throw error;
  }
}

/**
 * Submits a report and handles image upload if needed
 * 
 * @param report Report to submit
 * @returns Success status
 */
export async function submitReport(
  report: Omit<UnknownProductReport, 'status' | 'retryCount'>
): Promise<{ success: boolean; message: string; offline?: boolean }> {
  try {
    // Add to queue first
    await addUnknownReport(report);

    // Check if online
    const online = await isOnline();
    if (!online) {
      return {
        success: true,
        message: 'Lagret – sendes automatisk når du er på nett.',
        offline: true,
      };
    }

    // Try to submit immediately
    const reportWithStatus: UnknownProductReport = {
      ...report,
      status: 'queued',
      retryCount: 0,
    };

    const result = await submitReportToSupabase(reportWithStatus);

    if (result.success && result.reportId) {
      // If image upload needed, do it now
      if (result.needsImageUpload && result.uploadUrl && report.photoUri) {
        try {
          await uploadImageToSupabase(result.uploadUrl, report.photoUri);
        } catch (uploadError: any) {
          // Image upload failed, but report is saved
          // Mark as failed so it can retry
          await updateReportStatus(
            report.gtin,
            'failed',
            result.reportId,
            `Image upload failed: ${uploadError.message}`
          );
          return {
            success: false,
            message: 'Rapport lagret, men bilde kunne ikke lastes opp. Prøver igjen senere.',
          };
        }
      }

      // Mark as sent
      await updateReportStatus(report.gtin, 'sent', result.reportId);
      return {
        success: true,
        message: 'Takk for rapporten!',
      };
    }

    // Should not reach here if result.success is true
    throw new Error('Unexpected response from server');
  } catch (error: any) {
    console.error('[ReportSender] Error in submitReport:', error);
    
    // Mark as failed for retry
    await updateReportStatus(
      report.gtin,
      'failed',
      undefined,
      error.message || 'Unknown error'
    );

    // Check if it's a network error
    const isNetworkError = error.message?.includes('network') || 
                          error.message?.includes('fetch') ||
                          error.code === 'NETWORK_ERROR';

    if (isNetworkError) {
      return {
        success: true,
        message: 'Lagret – sendes automatisk når du er på nett.',
        offline: true,
      };
    }

    return {
      success: false,
      message: error.message || 'Kunne ikke sende rapport. Prøver igjen senere.',
    };
  }
}

/**
 * Syncs all pending reports (queued or failed) to Supabase
 * 
 * @param maxAttempts Maximum number of reports to process in this sync
 * @returns Number of successfully synced reports
 */
export async function syncUnknownReports(maxAttempts: number = 10): Promise<number> {
  if (!isSupabaseConfigured() || !supabase) {
    // Silent in dev - Supabase is optional
    if (!__DEV__) {
      // Could log in production if needed, but keep silent for now
    }
    return 0;
  }

  try {
    // Check if online
    const online = await isOnline();
    if (!online) {
      console.log('[ReportSender] Offline, skipping sync');
      return 0;
    }

    // Get pending reports (queued or failed, but with retry count < MAX_RETRIES)
    const pending = await listPendingReports();
    const toSync = pending
      .filter(r => (r.retryCount || 0) < MAX_RETRIES)
      .slice(0, maxAttempts); // Limit to maxAttempts per sync

    if (toSync.length === 0) {
      return 0;
    }

    console.log(`[ReportSender] Syncing ${toSync.length} pending reports`);

    let successCount = 0;

    for (const report of toSync) {
      try {
        const result = await submitReportToSupabase(report);

        if (result.success && result.reportId) {
          // Upload image if needed
          if (result.needsImageUpload && result.uploadUrl && report.photoUri) {
            try {
              await uploadImageToSupabase(result.uploadUrl, report.photoUri);
            } catch (uploadError: any) {
              // Image upload failed, but report is saved
              await updateReportStatus(
                report.gtin,
                'failed',
                result.reportId,
                `Image upload failed: ${uploadError.message}`
              );
              continue;
            }
          }

          // Mark as sent
          await updateReportStatus(report.gtin, 'sent', result.reportId);
          successCount++;
        }
      } catch (error: any) {
        console.error(`[ReportSender] Error syncing report ${report.gtin}:`, error);
        
        // Check if it's a rate limit error - don't mark as failed, keep in queue
        if (error.message?.includes('For mange rapporter')) {
          console.log(`[ReportSender] Rate limited for ${report.gtin}, keeping in queue for later retry`);
          // Don't increment retry count for rate limits - just skip for now
          continue;
        }
        
        // Update error status for other errors
        await updateReportStatus(
          report.gtin,
          'failed',
          report.reportId,
          error.message || 'Sync error'
        );
        // Continue with next report
      }
    }

    if (successCount > 0) {
      console.log(`[ReportSender] Successfully synced ${successCount} reports`);
    }

    return successCount;
  } catch (error) {
    console.error('[ReportSender] Error in syncUnknownReports:', error);
    return 0;
  }
}

