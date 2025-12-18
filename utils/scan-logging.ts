import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScanResultStatus = 
  | 'found' 
  | 'not_found' 
  | 'missing_ingredients' 
  | 'missing_data'  // Alias for missing_ingredients
  | 'network_error' 
  | 'timeout' 
  | 'unknown_error'
  | 'scan_error';

export type ScanLogEntry = {
  barcode: string;
  status: ScanResultStatus;
  latency: number; // milliseconds
  timestamp: number;
  dataSource: 'openfoodfacts' | 'ocr' | 'manual' | 'unknown';
  hasIngredients: boolean;
  ingredientsLength?: number;
  productName?: string;
};

export type UnknownBarcode = {
  barcode: string;
  firstSeen: number;
  lastSeen: number;
  count: number; // how many times it was scanned
};

const SCAN_LOGS_KEY = 'scan_logs';
const UNKNOWN_BARCODES_KEY = 'unknown_barcodes';
const MAX_LOG_ENTRIES = 1000; // Keep last 1000 scans
const MAX_UNKNOWN_BARCODES = 500;

/**
 * Log a scan event for analytics
 */
export async function logScanEvent(entry: ScanLogEntry): Promise<void> {
  try {
    const logs = await getScanLogs();
    logs.push(entry);
    
    // Keep only the most recent logs
    const sorted = logs.sort((a, b) => b.timestamp - a.timestamp);
    const trimmed = sorted.slice(0, MAX_LOG_ENTRIES);
    
    await AsyncStorage.setItem(SCAN_LOGS_KEY, JSON.stringify(trimmed));
    
    // Also log to console in dev mode
    if (__DEV__) {
      console.log('[Scan Log]', {
        barcode: entry.barcode,
        status: entry.status,
        latency: `${entry.latency}ms`,
        dataSource: entry.dataSource,
      });
    }
  } catch (error) {
    console.error('Error logging scan event:', error);
  }
}

/**
 * Get scan logs (for analytics/debugging)
 */
export async function getScanLogs(): Promise<ScanLogEntry[]> {
  try {
    const data = await AsyncStorage.getItem(SCAN_LOGS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting scan logs:', error);
    return [];
  }
}

/**
 * Add an unknown barcode to the queue
 */
export async function addUnknownBarcode(barcode: string): Promise<void> {
  try {
    const unknown = await getUnknownBarcodes();
    const existing = unknown.find(u => u.barcode === barcode);
    
    if (existing) {
      existing.count += 1;
      existing.lastSeen = Date.now();
    } else {
      unknown.push({
        barcode,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        count: 1,
      });
    }
    
    // Keep only the most recent/frequent
    const sorted = unknown.sort((a, b) => {
      // Sort by count (desc), then by lastSeen (desc)
      if (b.count !== a.count) return b.count - a.count;
      return b.lastSeen - a.lastSeen;
    });
    const trimmed = sorted.slice(0, MAX_UNKNOWN_BARCODES);
    
    await AsyncStorage.setItem(UNKNOWN_BARCODES_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error adding unknown barcode:', error);
  }
}

/**
 * Get all unknown barcodes
 */
export async function getUnknownBarcodes(): Promise<UnknownBarcode[]> {
  try {
    const data = await AsyncStorage.getItem(UNKNOWN_BARCODES_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting unknown barcodes:', error);
    return [];
  }
}

/**
 * Clear unknown barcodes (after syncing to backend)
 */
export async function clearUnknownBarcodes(barcodes: string[]): Promise<void> {
  try {
    const unknown = await getUnknownBarcodes();
    const filtered = unknown.filter(u => !barcodes.includes(u.barcode));
    await AsyncStorage.setItem(UNKNOWN_BARCODES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error clearing unknown barcodes:', error);
  }
}

/**
 * Export logs as JSON (for sending to backend)
 */
export async function exportLogsForBackend(): Promise<string> {
  try {
    const logs = await getScanLogs();
    const unknown = await getUnknownBarcodes();
    
    // Aggregate data (no personal info)
    const aggregated = {
      scanStats: {
        total: logs.length,
        byStatus: logs.reduce((acc, log) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        }, {} as Record<ScanResultStatus, number>),
        avgLatency: logs.length > 0 
          ? Math.round(logs.reduce((sum, log) => sum + log.latency, 0) / logs.length)
          : 0,
      },
      unknownBarcodes: unknown.map(u => ({
        barcode: u.barcode,
        count: u.count,
        firstSeen: u.firstSeen,
        lastSeen: u.lastSeen,
      })),
      timestamp: Date.now(),
    };
    
    return JSON.stringify(aggregated, null, 2);
  } catch (error) {
    console.error('Error exporting logs:', error);
    return JSON.stringify({ error: 'Failed to export logs' });
  }
}

