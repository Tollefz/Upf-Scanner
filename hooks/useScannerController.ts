import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { validateGTIN } from '@/src/utils/gtin';
import { lookupProductByGtin, type LookupOutcome } from '@/src/services/productLookup';
import type { Product } from '@/src/data/Product';

// Global log gate - check environment variable or default to dev mode
const getLoggingEnabled = (): boolean => {
  // Check environment variable first
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_LOG_LEVEL) {
    const level = process.env.EXPO_PUBLIC_LOG_LEVEL.toLowerCase();
    return level === 'debug' || level === 'verbose';
  }
  // Default to dev mode
  return __DEV__;
};

// Structured logging for scan flow debugging
function logScanFlow(event: string, details?: Record<string, any>, enabled: boolean = getLoggingEnabled()) {
  if (!enabled) return;
  const timestamp = new Date().toISOString();
  const detailStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[SCAN_FLOW] ${timestamp} ${event}${detailStr}`);
}

/**
 * Options for throttled logging
 */
interface ThrottledLoggerOptions {
  /** Minimum time between logs in ms */
  throttleMs: number;
  /** Whether to log first event immediately (before summary) */
  logFirstImmediately: boolean;
  /** Event type to log */
  eventType: 'SCAN_IGNORED' | 'SCAN_DETECTED_SUPPRESSED';
}

/**
 * Throttled logging helper for SCAN_IGNORED and SCAN_DETECTED_SUPPRESSED events
 * Reduces log noise when camera continuously detects same barcode while scanning is disabled
 * 
 * @param lastLogAtRef - Ref to track when we last logged
 * @param countRef - Ref to count ignored/suppressed events
 * @param summaryTimeoutRef - Ref to store summary timeout
 * @param reason - Reason for ignoring/suppressing (e.g., 'scanning_disabled', 'lock_active')
 * @param enableLogging - Whether logging is enabled
 * @param options - Throttling options (throttleMs, logFirstImmediately, eventType)
 * @returns Function to call when event should be logged
 */
function createThrottledIgnoredLogger(
  lastLogAtRef: MutableRefObject<number>,
  countRef: MutableRefObject<number>,
  summaryTimeoutRef: MutableRefObject<NodeJS.Timeout | null>,
  reason: string,
  enableLogging: boolean,
  options: ThrottledLoggerOptions
): () => void {
  const { throttleMs, logFirstImmediately, eventType } = options;
  const summaryEventType = `${eventType}_SUMMARY`;

  return () => {
    if (!enableLogging) return;

    const now = Date.now();
    const timeSinceLastLog = now - lastLogAtRef.current;

    // Increment count
    countRef.current += 1;

    // If within throttle window, schedule summary log instead
    if (timeSinceLastLog < throttleMs) {
      // Clear existing timeout
      if (summaryTimeoutRef.current) {
        clearTimeout(summaryTimeoutRef.current);
      }

      // Schedule summary log at end of throttle window
      const remainingTime = throttleMs - timeSinceLastLog;
      summaryTimeoutRef.current = setTimeout(() => {
        if (countRef.current > 0) {
          logScanFlow(summaryEventType, {
            reason,
            count: countRef.current,
            duration: `${throttleMs}ms`
          }, enableLogging);
          countRef.current = 0;
          lastLogAtRef.current = Date.now();
        }
        summaryTimeoutRef.current = null;
      }, remainingTime);
      return;
    }

    // Outside throttle window
    if (logFirstImmediately) {
      // Lock active mode: log first event immediately + summary of accumulated
      if (countRef.current > 1) {
        // Log summary of previous accumulated events
        logScanFlow(summaryEventType, {
          reason,
          count: countRef.current - 1,
          duration: `${throttleMs}ms`
        }, enableLogging);
      }
      // Log current single event
      logScanFlow(eventType, { reason }, enableLogging);
      // Reset count after logging
      countRef.current = 0;
    } else {
      // Paused state mode: only summary, no single events
      if (countRef.current > 1) {
        // Log summary of accumulated events (including current)
        logScanFlow(summaryEventType, {
          reason,
          count: countRef.current,
          duration: `${throttleMs}ms`
        }, enableLogging);
        countRef.current = 0;
      } else {
        // First event in paused state: don't log anything, keep count=1
        // This event will be included in next summary
        // countRef.current is already 1, don't reset
      }
    }
    
    // Update timestamp
    lastLogAtRef.current = now;
    
    // Clear any pending timeout
    if (summaryTimeoutRef.current) {
      clearTimeout(summaryTimeoutRef.current);
      summaryTimeoutRef.current = null;
    }
  };
}

/**
 * Scanner Error Types
 */
export type ScannerErrorType = 
  | 'invalid_gtin' 
  | 'network_error' 
  | 'timeout' 
  | 'unknown'
  | 'aborted';

export interface ScannerError {
  type: ScannerErrorType;
  message: string;
  code?: string; // GTIN that caused the error
  timestamp?: number;
}

export type ScanOutcome =
  | { kind: 'product'; product: Product }
  | { kind: 'not_found'; gtin: string }
  | { kind: 'error'; error: ScannerError };

/**
 * Barcode Type Detection
 */
export type BarcodeType = 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' | 'UNKNOWN';

/**
 * Scanner Controller Options
 */
export interface UseScannerControllerOptions {
  /** Callback when barcode is successfully scanned and validated */
  onBarcodeScanned?: (barcode: string, barcodeType: BarcodeType) => Promise<void>;
  
  /** Debounce time in ms (default: 800) */
  debounceMs?: number;
  
  /** Lookup timeout in ms (default: 12000) */
  lookupTimeoutMs?: number;
  
  /** Safety timeout in ms - always resets lock (default: 15000) */
  safetyTimeoutMs?: number;
  
  /** Auto-resume scanning after error (default: false) */
  autoResumeOnError?: boolean;
  
  /** Enable/disable logging (default: true in dev) */
  enableLogging?: boolean;
}

/**
 * Scanner Controller Return API
 * 
 * Stable, production-ready API that separates concerns:
 * - State: Read-only state for UI
 * - Actions: Imperative actions for UI
 * - Handler: Direct handler for CameraView
 */
export interface UseScannerControllerReturn {
  // ========== STATE (Read-only for UI) ==========
  /** Whether scanning is currently enabled */
  isScanningEnabled: boolean;
  
  /** Whether a scan is currently being processed */
  isProcessing: boolean;
  
  /** Current error, if any */
  error: ScannerError | null;
  
  /** Last successfully scanned code */
  lastScannedCode: string | null;
  
  /** Current barcode type being processed */
  currentBarcodeType: BarcodeType | null;
  
  /** Current scan outcome (product, not_found, or error) */
  outcome: ScanOutcome | null;
  
  // ========== ACTIONS (Imperative for UI) ==========
  /** Pause scanning (e.g., when showing product sheet) */
  pauseScanning: () => void;
  
  /** Resume scanning after pause */
  resumeScanning: () => void;
  
  /** Reset scanner completely (clears all state) */
  resetScanner: (reason?: string) => void;
  
  /** Clear current error and outcome */
  clearError: () => void;
  
  /** Retry last scan (if error occurred) */
  retryLastScan: () => void;
  
  // ========== HANDLER (For CameraView) ==========
  /** Handler for CameraView onBarcodeScanned prop */
  onBarcodeScanned: ((barcode: string) => void) | undefined;
}

/**
 * useScannerController - Production-ready scanner controller hook
 * 
 * Centralizes ALL scanning logic and state management.
 * Eliminates "stops after 2 scans" by ensuring lock is ALWAYS reset.
 * 
 * Key features:
 * - Idempotent lock management
 * - All timeouts stored in refs
 * - Comprehensive logging
 * - Lifecycle-aware (focus/background)
 * - Never leaves scanning in locked state
 */
export function useScannerController(
  options: UseScannerControllerOptions = {}
): UseScannerControllerReturn {
  const {
    onBarcodeScanned: onBarcodeScannedCallback,
    debounceMs = 800,
    lookupTimeoutMs = 12000,
    safetyTimeoutMs = 15000,
    autoResumeOnError = false,
    enableLogging = __DEV__,
  } = options;

  // State
  const [isScanningEnabled, setIsScanningEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<ScannerError | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [currentBarcodeType, setCurrentBarcodeType] = useState<BarcodeType | null>(null);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  
  // Store last scan for retry
  const lastScanForRetryRef = useRef<{ barcode: string; barcodeType: BarcodeType } | null>(null);

  // Refs for lock and timeouts (CRITICAL: All timeouts must be in refs)
  const lockRef = useRef(false);
  const debounceRef = useRef<{ code: string; timestamp: number } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFocusedRef = useRef(false);

  // Refs for throttled SCAN_DETECTED suppression logging
  // Used when guards stop events before processing (scanning_disabled/lock_active)
  const lastSuppressedDisabledLogAtRef = useRef<number>(0);
  const lastSuppressedLockLogAtRef = useRef<number>(0);
  const suppressedDisabledCountRef = useRef<number>(0);
  const suppressedLockCountRef = useRef<number>(0);
  const suppressedDisabledSummaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suppressedLockSummaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Centralized lock reset - IDEMPOTENT and safe to call multiple times
   */
  const resetLock = useCallback((reason: string) => {
    logScanFlow('LOCK_RESET', { reason }, enableLogging);

    // Clear all timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Reset lock immediately (idempotent)
    if (lockRef.current) {
      lockRef.current = false;
      setIsProcessing(false);
      setCurrentBarcodeType(null);
      logScanFlow('SCANNING_RESUMED', { reason }, enableLogging);
    }

    // Clear debounce
    debounceRef.current = null;
  }, []);

  /**
   * Set lock with safety timeout
   */
  const setLock = useCallback(() => {
    // Clear any existing timeouts first
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    // Set lock
    lockRef.current = true;
    setIsProcessing(true);
    logScanFlow('LOCK_SET', undefined, enableLogging);

    // Safety timeout: Always reset lock after safetyTimeoutMs
    safetyTimeoutRef.current = setTimeout(() => {
      logScanFlow('SAFETY_TIMEOUT', { duration: `${safetyTimeoutMs}ms` }, enableLogging);
      resetLock('safety_timeout');
    }, safetyTimeoutMs);
  }, [resetLock, safetyTimeoutMs]);

  /**
   * Reset scanner completely
   */
  const resetScanner = useCallback((reason: string = 'manual') => {
    logScanFlow('SCANNER_RESET', { reason }, enableLogging);
    resetLock(reason);
    setError(null);
    setOutcome(null);
    setLastScannedCode(null);
    setCurrentBarcodeType(null);
    lastScanForRetryRef.current = null;
    // Don't automatically resume - let UI control this via resumeScanning()
  }, [resetLock, enableLogging]);

  /**
   * Pause scanning
   */
  const pauseScanning = useCallback(() => {
    logScanFlow('SCANNING_PAUSED', undefined, enableLogging);
    setIsScanningEnabled(false);
  }, [enableLogging]);

  /**
   * Resume scanning
   */
  const resumeScanning = useCallback(() => {
    logScanFlow('SCANNING_RESUMED', { reason: 'manual' }, enableLogging);
    resetLock('resume_scanning');
    setIsScanningEnabled(true);
  }, [resetLock, enableLogging]);

  /**
   * Clear error and outcome
   */
  const clearError = useCallback(() => {
    setError(null);
    setOutcome(null);
  }, []);

  /**
   * Retry last scan
   */
  const retryLastScan = useCallback(() => {
    if (lastScanForRetryRef.current && !lockRef.current && isScanningEnabled) {
      logScanFlow('RETRY_SCAN', { barcode: lastScanForRetryRef.current.barcode }, enableLogging);
      clearError();
      // Call handleBarcodeScanned directly via ref to avoid dependency issues
      const barcode = lastScanForRetryRef.current.barcode;
      handleBarcodeScanned(barcode);
    }
  }, [enableLogging, isScanningEnabled, clearError, handleBarcodeScanned]);

  /**
   * Throttled loggers for SCAN_DETECTED suppression
   * Used when guards stop events before processing (scanning_disabled/lock_active)
   */
  const logSuppressedDisabled = useCallback(() => {
    const logger = createThrottledIgnoredLogger(
      lastSuppressedDisabledLogAtRef,
      suppressedDisabledCountRef,
      suppressedDisabledSummaryTimeoutRef,
      'scanning_disabled',
      enableLogging,
      {
        throttleMs: 1000, // 1 second throttle
        logFirstImmediately: false, // Paused state: only summary, no single events
        eventType: 'SCAN_DETECTED_SUPPRESSED'
      }
    );
    logger();
  }, [enableLogging]);

  const logSuppressedLock = useCallback(() => {
    const logger = createThrottledIgnoredLogger(
      lastSuppressedLockLogAtRef,
      suppressedLockCountRef,
      suppressedLockSummaryTimeoutRef,
      'lock_active',
      enableLogging,
      {
        throttleMs: 300, // 300ms throttle
        logFirstImmediately: true, // Lock active: log first immediately + summary (useful for debug)
        eventType: 'SCAN_DETECTED_SUPPRESSED'
      }
    );
    logger();
  }, [enableLogging]);

  /**
   * Main barcode scan handler
   */
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    // Guard: Check if scanning is enabled
    // Don't log SCAN_DETECTED if scanning is disabled - use suppressed logging only
    if (!isScanningEnabled) {
      logSuppressedDisabled();
      return;
    }

    // Guard: Check lock
    // Don't log SCAN_DETECTED if lock is active - use suppressed logging only
    if (lockRef.current) {
      logSuppressedLock();
      return;
    }

    // Only log SCAN_DETECTED when event is actually being processed
    logScanFlow('SCAN_DETECTED', { barcode }, enableLogging);

    const now = Date.now();
    const normalized = barcode.trim();

    // Debounce: Ignore same code if scanned recently
    if (
      debounceRef.current &&
      debounceRef.current.code === normalized &&
      now - debounceRef.current.timestamp < debounceMs
    ) {
      logScanFlow('SCAN_IGNORED', { reason: 'debounce', code: normalized }, enableLogging);
      return;
    }

    // Update debounce
    debounceRef.current = { code: normalized, timestamp: now };

    // Validate GTIN
    const validation = validateGTIN(normalized);
    if (!validation.ok || !validation.normalized) {
      logScanFlow('SCAN_ERROR', { reason: 'invalid_gtin', error: validation.error }, enableLogging);
      const error: ScannerError = {
        type: 'invalid_gtin',
        message: validation.error || 'Ugyldig strekkode',
        code: normalized,
        timestamp: now,
      };
      setError(error);
      if (autoResumeOnError) {
        setTimeout(() => resetLock('auto_resume_error'), 1000);
      }
      return;
    }

    const normalizedGTIN = validation.normalized;

    // Detect barcode type
    const barcodeType: BarcodeType =
      normalizedGTIN.length === 13
        ? 'EAN13'
        : normalizedGTIN.length === 8
        ? 'EAN8'
        : normalizedGTIN.length === 12
        ? 'UPC'
        : normalizedGTIN.length >= 8 && normalizedGTIN.length <= 20
        ? 'CODE128'
        : 'UNKNOWN';

    // Set lock BEFORE processing
    setLock();
    setLastScannedCode(normalizedGTIN);
    setCurrentBarcodeType(barcodeType);
    setError(null);
    setOutcome(null);
    
    // Store for retry
    lastScanForRetryRef.current = { barcode: normalizedGTIN, barcodeType };

    // Create abort controller for lookup
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Lookup timeout (10-15s)
    const startTime = Date.now();
    timeoutRef.current = setTimeout(() => {
      logScanFlow('LOOKUP_TIMEOUT', { gtin: normalizedGTIN, duration: `${lookupTimeoutMs}ms` }, enableLogging);
      abortController.abort();
      const error: ScannerError = {
        type: 'timeout',
        message: 'Tidsavbrudd - prøv igjen',
        code: normalizedGTIN,
        timestamp: Date.now(),
      };
      setError(error);
      setOutcome({ kind: 'error', error });
      setIsProcessing(false); // Lookup is complete (timeout)
      pauseScanning();
      resetLock('lookup_timeout');
      if (autoResumeOnError) {
        setTimeout(() => {
          resetLock('auto_resume_timeout');
          resumeScanning();
        }, 1000);
      }
    }, lookupTimeoutMs);

    // Perform product lookup
    try {
      const lookupOutcome = await lookupProductByGtin(normalizedGTIN, abortController.signal);

      // Check if aborted
      if (abortController.signal.aborted) {
        logScanFlow('LOOKUP_ABORTED', { gtin: normalizedGTIN }, enableLogging);
        return;
      }

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Handle outcome
      if (lookupOutcome.kind === 'product') {
        const latency = Date.now() - startTime;
        logScanFlow('LOOKUP_SUCCESS', { gtin: normalizedGTIN, latency, source: lookupOutcome.product.source }, enableLogging);
        
        // Set outcome FIRST
        const outcomeValue = { kind: 'product' as const, product: lookupOutcome.product };
        setOutcome(outcomeValue);
        setIsProcessing(false); // Lookup is complete
        logScanFlow('OUTCOME_SET', { kind: 'product', gtin: normalizedGTIN, hasProduct: !!lookupOutcome.product }, enableLogging);
        
        // Pause scanning when showing result
        pauseScanning();
        
        // Call callback if provided (for navigation, etc.)
        if (onBarcodeScannedCallback) {
          await onBarcodeScannedCallback(normalizedGTIN, barcodeType);
        }
        
        // Don't reset lock automatically - let user close ProductSheet first
        // Lock will be reset when user closes ProductSheet
      } else if (lookupOutcome.kind === 'not_found') {
        const latency = Date.now() - startTime;
        logScanFlow('LOOKUP_NOT_FOUND', { gtin: normalizedGTIN, latency }, enableLogging);
        
        setOutcome({ kind: 'not_found', gtin: normalizedGTIN });
        setIsProcessing(false); // Lookup is complete
        logScanFlow('OUTCOME_SET', { kind: 'not_found', gtin: normalizedGTIN }, enableLogging);
        
        // Pause scanning when showing result
        pauseScanning();
        
        // Call callback if provided (for navigation to unknown product screen)
        if (onBarcodeScannedCallback) {
          await onBarcodeScannedCallback(normalizedGTIN, barcodeType);
        }
        
        // Don't reset lock automatically - let user close ProductSheet first
        // Lock will be reset when user closes ProductSheet
      }
    } catch (err: any) {
      // Check if aborted
      if (abortController.signal.aborted || err.name === 'AbortError') {
        logScanFlow('LOOKUP_ABORTED', { gtin: normalizedGTIN }, enableLogging);
        return;
      }

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const latency = Date.now() - startTime;
      logScanFlow('LOOKUP_ERROR', { gtin: normalizedGTIN, error: err.message, latency }, enableLogging);

      const error: ScannerError = {
        type: err.name === 'AbortError' ? 'aborted' : 'network_error',
        message: err.message || 'Nettverksfeil - prøv igjen',
        code: normalizedGTIN,
        timestamp: Date.now(),
      };
      setError(error);
      setOutcome({ kind: 'error', error });
      setIsProcessing(false); // Lookup is complete (with error)

      // Pause scanning on error too
      pauseScanning();

      resetLock('lookup_error');
      if (autoResumeOnError) {
        setTimeout(() => {
          resetLock('auto_resume_error');
          resumeScanning();
        }, 1000);
      }
    }
  }, [isScanningEnabled, debounceMs, lookupTimeoutMs, onBarcodeScannedCallback, setLock, resetLock, enableLogging, autoResumeOnError, retryLastScan]);

  /**
   * Handle screen focus
   */
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      logScanFlow('SCREEN_FOCUSED', undefined, enableLogging);
      resetScanner('screen_focused');

      return () => {
        isFocusedRef.current = false;
        logScanFlow('SCREEN_BLURRED', undefined, enableLogging);
      };
    }, [resetScanner, enableLogging])
  );

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        logScanFlow('APP_BACKGROUND', undefined, enableLogging);
        resetScanner('app_background');
      } else if (nextAppState === 'active' && isFocusedRef.current) {
        logScanFlow('APP_FOREGROUND', undefined, enableLogging);
        resetScanner('app_foreground');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [resetScanner, enableLogging]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      resetLock('unmount');
      // Clear any pending summary timeouts
      if (suppressedDisabledSummaryTimeoutRef.current) {
        clearTimeout(suppressedDisabledSummaryTimeoutRef.current);
        suppressedDisabledSummaryTimeoutRef.current = null;
      }
      if (suppressedLockSummaryTimeoutRef.current) {
        clearTimeout(suppressedLockSummaryTimeoutRef.current);
        suppressedLockSummaryTimeoutRef.current = null;
      }
    };
  }, [resetLock]);

  return {
    // State
    isScanningEnabled,
    isProcessing,
    error,
    lastScannedCode,
    currentBarcodeType,
    outcome,

    // Actions
    pauseScanning,
    resumeScanning,
    resetScanner,
    clearError,
    retryLastScan,

    // Handler
    // CRITICAL: Always return handler to prevent camera remounting
    // Scanning is controlled internally via early return in handleBarcodeScanned
    onBarcodeScanned: handleBarcodeScanned,
  };
}

