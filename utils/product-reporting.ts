import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type IssueType = 'NOT_FOUND' | 'MISSING_INGREDIENTS' | 'LOOKUP_ERROR' | 'OCR_FAILED';

export type ProductReportPayload = {
  country: string; // e.g., "DK"
  barcode: string;
  barcode_type?: string; // "EAN13" | "EAN8" | "UPC" | "UNKNOWN"
  issue_type: IssueType;
  lookup_source?: string; // e.g., "openfoodfacts"
  http_status?: number; // e.g., 404, 500
  error_code?: string; // e.g., "timeout", "offline"
  product_name_seen?: string;
  user_note?: string; // max 500 chars
  client: {
    app_version: string;
    build_number: string;
    platform: string; // "iOS" | "Android"
    os_version: string;
    device_model: string;
    locale: string; // e.g., "da-DK"
  };
  context: {
    scanned_at: string; // ISO 8601
    session_id: string;
    network_type?: string; // "wifi" | "cellular" | "unknown"
    latency_ms?: number; // Lookup latency in milliseconds
  };
  attachments?: {
    product_photo_base64?: string | null;
    ingredients_photo_base64?: string | null;
    product_photo_url?: string | null;
    ingredients_photo_url?: string | null;
  };
};

// Internal report type (before sending to backend)
export type QueuedReport = {
  payload: ProductReportPayload;
  reportId: string; // UUID generated locally
  queuedAt: number;
  retryCount: number;
};

const REPORTS_QUEUE_KEY = 'product_reports_queue';
const REPORTS_SENT_KEY = 'product_reports_sent';
const SESSION_ID_KEY = 'app_session_id';
const MAX_QUEUE_SIZE = 500;
const MAX_RETRY_COUNT = 3;

// Backend endpoint - UPDATE THIS with your actual backend URL
// Format: POST /v1/reports/missing-product
const BACKEND_URL = __DEV__ 
  ? 'https://your-backend-dev.com/v1/reports/missing-product' // Replace with dev URL
  : 'https://your-backend.com/v1/reports/missing-product'; // Replace with production URL

// Expected response format:
// { status: "ok", report_id: "uuid", message: "received" }

// App token for authentication (optional, can be set via env)
const APP_TOKEN = Constants.expoConfig?.extra?.appToken || null;

/**
 * Generate or get session ID
 */
async function getOrCreateSessionId(): Promise<string> {
  try {
    let sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      // Generate UUID v4
      sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  } catch (error) {
    console.error('Error getting session ID:', error);
    // Fallback to a simple ID
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Detect barcode type from barcode string
 */
function detectBarcodeType(barcode: string): string {
  if (barcode.length === 13) return 'EAN13';
  if (barcode.length === 8) return 'EAN8';
  if (barcode.length === 12) return 'UPC';
  return 'UNKNOWN';
}

/**
 * Get device info
 */
function getDeviceInfo() {
  return {
    app_version: Constants.expoConfig?.version || '1.0.0',
    build_number: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '1',
    platform: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Unknown',
    os_version: Platform.Version?.toString() || 'Unknown',
    device_model: Device.modelName || Device.deviceName || 'Unknown',
    locale: Platform.select({
      ios: Device.locale || 'da-DK',
      android: Device.locale || 'da-DK',
      default: 'da-DK',
    }) || 'da-DK',
  };
}

/**
 * Create a product report payload
 */
export async function createProductReport(
  barcode: string,
  issueType: IssueType,
  options: {
    productName?: string;
    lookupSource?: string;
    httpStatus?: number;
    errorCode?: string;
    userNote?: string;
    productPhotoBase64?: string | null;
    ingredientsPhotoBase64?: string | null;
    productPhotoUrl?: string | null;
    ingredientsPhotoUrl?: string | null;
    latencyMs?: number; // Lookup latency in milliseconds
  } = {}
): Promise<ProductReportPayload> {
  const sessionId = await getOrCreateSessionId();
  const deviceInfo = getDeviceInfo();
  
  // Detect network type (simplified - would need NetInfo in real implementation)
  const networkType = 'unknown'; // TODO: Implement with @react-native-community/netinfo

  return {
    country: 'DK', // Hardcoded for Danish market
    barcode,
    barcode_type: detectBarcodeType(barcode),
    issue_type: issueType,
    lookup_source: options.lookupSource || 'openfoodfacts',
    http_status: options.httpStatus,
    error_code: options.errorCode,
    product_name_seen: options.productName,
    user_note: options.userNote?.substring(0, 500), // Limit to 500 chars
    client: deviceInfo,
    context: {
      scanned_at: new Date().toISOString(),
      session_id: sessionId,
      network_type: networkType,
      latency_ms: options.latencyMs, // Include latency if provided
    },
    attachments: {
      product_photo_base64: options.productPhotoBase64 || null,
      ingredients_photo_base64: options.ingredientsPhotoBase64 || null,
      product_photo_url: options.productPhotoUrl || null,
      ingredients_photo_url: options.ingredientsPhotoUrl || null,
    },
  };
}

/**
 * Queue a product report for sending
 */
export async function queueProductReport(
  barcode: string,
  issueType: IssueType,
  options: Parameters<typeof createProductReport>[2] = {}
): Promise<string> {
  try {
    const payload = await createProductReport(barcode, issueType, options);
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedReport: QueuedReport = {
      payload,
      reportId,
      queuedAt: Date.now(),
      retryCount: 0,
    };

    const queue = await getQueuedReports();
    
    // Check for duplicates (same barcode + issue_type today)
    const today = new Date().toISOString().split('T')[0];
    const existingIndex = queue.findIndex(
      r => r.payload.barcode === barcode && 
           r.payload.issue_type === issueType &&
           r.payload.context.scanned_at.startsWith(today)
    );
    
    if (existingIndex >= 0) {
      // Update existing report (e.g., with new image or note)
      queue[existingIndex] = { ...queue[existingIndex], ...queuedReport };
    } else {
      queue.push(queuedReport);
    }
    
    // Keep queue size manageable
    const trimmed = queue.slice(-MAX_QUEUE_SIZE);
    
    await AsyncStorage.setItem(REPORTS_QUEUE_KEY, JSON.stringify(trimmed));
    
    // Try to send immediately (fire and forget)
    sendReportsToBackend().catch(err => {
      console.log('Failed to send reports immediately, will retry later:', err);
    });
    
    return reportId;
  } catch (error) {
    console.error('Error queueing product report:', error);
    throw error;
  }
}

/**
 * Get all queued reports
 */
export async function getQueuedReports(): Promise<QueuedReport[]> {
  try {
    const data = await AsyncStorage.getItem(REPORTS_QUEUE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting queued reports:', error);
    return [];
  }
}

/**
 * Send reports to backend
 */
export async function sendReportsToBackend(): Promise<{ success: boolean; sent: number; failed: number; reportIds: string[] }> {
  const queue = await getQueuedReports();
  
  if (queue.length === 0) {
    return { success: true, sent: 0, failed: 0, reportIds: [] };
  }

  // Filter out reports that have exceeded retry count
  const reportsToSend = queue.filter(r => r.retryCount < MAX_RETRY_COUNT);
  const reportsToRemove = queue.filter(r => r.retryCount >= MAX_RETRY_COUNT);

  if (reportsToSend.length === 0) {
    // Remove failed reports
    await AsyncStorage.setItem(REPORTS_QUEUE_KEY, JSON.stringify([]));
    return { success: false, sent: 0, failed: reportsToRemove.length, reportIds: [] };
  }

  // In development, just log instead of actually sending
  if (__DEV__ && (!BACKEND_URL || BACKEND_URL.includes('your-backend'))) {
    console.log('[DEV] Would send reports to backend:', reportsToSend.length);
    console.log('[DEV] Reports:', JSON.stringify(reportsToSend.map(r => r.payload), null, 2));
    // Mark as sent in dev mode for testing
    const sentIds = reportsToSend.map(r => r.reportId);
    const previouslySent = await getSentReports();
    await AsyncStorage.setItem(REPORTS_SENT_KEY, JSON.stringify([...previouslySent, ...reportsToSend]));
    await AsyncStorage.removeItem(REPORTS_QUEUE_KEY);
    return { success: true, sent: reportsToSend.length, failed: 0, reportIds: sentIds };
  }

  const sentIds: string[] = [];
  const failedReports: QueuedReport[] = [];

  // Send reports one by one (backend expects individual reports, not batch)
  for (const report of reportsToSend) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add app token if available
      if (APP_TOKEN) {
        headers['X-App-Token'] = APP_TOKEN;
      }

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(report.payload),
      });

      if (!response.ok) {
        if (response.status === 400) {
          // Validation error - don't retry
          console.error('Validation error for report:', report.reportId);
          failedReports.push({ ...report, retryCount: MAX_RETRY_COUNT });
        } else {
          // Server error - retry later
          failedReports.push({ ...report, retryCount: report.retryCount + 1 });
        }
        continue;
      }

      const result = await response.json();
      sentIds.push(report.reportId);
      
      // Log report_id from backend if provided
      if (result.report_id) {
        console.log(`Report ${report.reportId} sent successfully, backend ID: ${result.report_id}`);
      }
    } catch (error) {
      console.error(`Error sending report ${report.reportId}:`, error);
      // Network error - retry later
      failedReports.push({ ...report, retryCount: report.retryCount + 1 });
    }
  }

  // Update queue with failed reports (for retry)
  await AsyncStorage.setItem(REPORTS_QUEUE_KEY, JSON.stringify([...failedReports, ...reportsToRemove]));

  // Track sent reports
  const sentReports = reportsToSend.filter(r => sentIds.includes(r.reportId));
  const previouslySent = await getSentReports();
  await AsyncStorage.setItem(REPORTS_SENT_KEY, JSON.stringify([...previouslySent, ...sentReports]));

  return {
    success: sentIds.length > 0,
    sent: sentIds.length,
    failed: failedReports.length + reportsToRemove.length,
    reportIds: sentIds,
  };
}

/**
 * Get previously sent reports (for analytics)
 */
export async function getSentReports(): Promise<QueuedReport[]> {
  try {
    const data = await AsyncStorage.getItem(REPORTS_SENT_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting sent reports:', error);
    return [];
  }
}

/**
 * Clear sent reports (for cleanup)
 */
export async function clearSentReports(): Promise<void> {
  try {
    await AsyncStorage.removeItem(REPORTS_SENT_KEY);
  } catch (error) {
    console.error('Error clearing sent reports:', error);
  }
}

/**
 * Retry sending failed reports
 */
export async function retryFailedReports(): Promise<{ success: boolean; sent: number; failed: number; reportIds: string[] }> {
  return sendReportsToBackend();
}
