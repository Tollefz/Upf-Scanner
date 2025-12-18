import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScanLogs, type ScanLogEntry } from './scan-logging';

export type ScanMetrics = {
  totalScans: number;
  byState: {
    found: number;
    not_found: number;
    network_error: number;
    scan_error: number;
    missing_data: number;
    timeout: number;
    unknown_error: number;
  };
  medianLatency: number;
  avgLatency: number;
  topBarcodes: Array<{
    barcode: string;
    count: number;
    lastSeen: number;
  }>;
};

const METRICS_CACHE_KEY = 'scan_metrics_cache';
const METRICS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate metrics from scan logs
 */
export async function calculateMetrics(
  fromDate?: Date,
  toDate?: Date
): Promise<ScanMetrics> {
  const logs = await getScanLogs();
  
  // Filter by date range if provided
  let filteredLogs = logs;
  if (fromDate || toDate) {
    filteredLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      if (fromDate && logDate < fromDate) return false;
      if (toDate && logDate > toDate) return false;
      return true;
    });
  }

  const totalScans = filteredLogs.length;

  // Count by state
  const byState = {
    found: 0,
    not_found: 0,
    network_error: 0,
    scan_error: 0,
    missing_data: 0,
    missing_ingredients: 0, // Alias for missing_data
    timeout: 0,
    unknown_error: 0,
  };

  const latencies: number[] = [];
  const barcodeCounts = new Map<string, { count: number; lastSeen: number }>();

  filteredLogs.forEach(log => {
    // Count by state
    if (log.status === 'missing_ingredients' || log.status === 'missing_data') {
      byState.missing_data++;
    } else if (log.status in byState) {
      byState[log.status as keyof typeof byState]++;
    }

    // Collect latencies
    if (log.latency > 0) {
      latencies.push(log.latency);
    }

    // Count barcodes
    const existing = barcodeCounts.get(log.barcode);
    if (existing) {
      existing.count++;
      existing.lastSeen = Math.max(existing.lastSeen, log.timestamp);
    } else {
      barcodeCounts.set(log.barcode, {
        count: 1,
        lastSeen: log.timestamp,
      });
    }
  });

  // Calculate median latency
  let medianLatency = 0;
  if (latencies.length > 0) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianLatency = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  // Calculate average latency
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length)
    : 0;

  // Get top 20 barcodes
  const topBarcodes = Array.from(barcodeCounts.entries())
    .map(([barcode, data]) => ({
      barcode,
      count: data.count,
      lastSeen: data.lastSeen,
    }))
    .sort((a, b) => {
      // Sort by count (desc), then by lastSeen (desc)
      if (b.count !== a.count) return b.count - a.count;
      return b.lastSeen - a.lastSeen;
    })
    .slice(0, 20);

  return {
    totalScans,
    byState,
    medianLatency,
    avgLatency,
    topBarcodes,
  };
}

/**
 * Get cached metrics (for performance)
 */
export async function getCachedMetrics(): Promise<ScanMetrics | null> {
  try {
    const cached = await AsyncStorage.getItem(METRICS_CACHE_KEY);
    if (!cached) return null;

    const { metrics, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < METRICS_CACHE_DURATION) {
      return metrics;
    }

    return null;
  } catch (error) {
    console.error('Error getting cached metrics:', error);
    return null;
  }
}

/**
 * Cache metrics
 */
export async function cacheMetrics(metrics: ScanMetrics): Promise<void> {
  try {
    await AsyncStorage.setItem(
      METRICS_CACHE_KEY,
      JSON.stringify({
        metrics,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error('Error caching metrics:', error);
  }
}

/**
 * Get metrics (with caching)
 */
export async function getMetrics(
  fromDate?: Date,
  toDate?: Date,
  useCache = true
): Promise<ScanMetrics> {
  // Try cache first
  if (useCache) {
    const cached = await getCachedMetrics();
    if (cached) return cached;
  }

  // Calculate fresh metrics
  const metrics = await calculateMetrics(fromDate, toDate);
  
  // Cache for next time
  await cacheMetrics(metrics);

  return metrics;
}

/**
 * Export metrics as JSON (for backend/support)
 */
export async function exportMetricsAsJSON(
  fromDate?: Date,
  toDate?: Date
): Promise<string> {
  const metrics = await calculateMetrics(fromDate, toDate);
  
  return JSON.stringify({
    ...metrics,
    generated_at: new Date().toISOString(),
    date_range: {
      from: fromDate?.toISOString() || null,
      to: toDate?.toISOString() || null,
    },
  }, null, 2);
}

/**
 * Get state distribution as percentages
 */
export async function getStateDistribution(): Promise<Record<string, number>> {
  const metrics = await getMetrics();
  const distribution: Record<string, number> = {};

  if (metrics.totalScans === 0) {
    return {
      found: 0,
      not_found: 0,
      network_error: 0,
      scan_error: 0,
      missing_data: 0,
    };
  }

  Object.entries(metrics.byState).forEach(([state, count]) => {
    distribution[state] = Math.round((count / metrics.totalScans) * 100 * 100) / 100; // 2 decimals
  });

  return distribution;
}

