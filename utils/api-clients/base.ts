/**
 * Base API Client
 * 
 * Common functionality for all API clients: timeout, retry, error handling
 */

export interface APIClientConfig {
  timeout?: number; // Default: 10000ms
  retries?: number; // Default: 2
  retryDelay?: number; // Default: 500ms
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  statusCode?: number;
}

const DEFAULT_CONFIG: Required<APIClientConfig> = {
  timeout: 10000,
  retries: 2,
  retryDelay: 500,
};

/**
 * Base fetch with timeout and retry logic
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  config: APIClientConfig = {}
): Promise<APIResponse<T>> {
  const { timeout, retries, retryDelay } = { ...DEFAULT_CONFIG, ...config };
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 404) {
          return { error: 'Not found', statusCode: 404 };
        }
        
        if (response.status >= 500 && attempt < retries) {
          // Retry on server errors
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
        
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }
      
      const data = await response.json() as T;
      return { data };
      
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on abort (timeout) or network errors on last attempt
      if (error.name === 'AbortError') {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
        return { error: 'Request timeout' };
      }
      
      // Retry on network errors
      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
        return { error: 'Network error' };
      }
      
      // Don't retry on other errors
      return { error: error.message || 'Unknown error' };
    }
  }
  
  return { error: lastError?.message || 'Request failed after retries' };
}

/**
 * Common headers for API requests
 * 
 * @param authToken - Bearer token (for Authorization header)
 * @param apiKey - API key (for Authorization: Bearer or X-API-Key header depending on source)
 * @param useApiKeyHeader - If true, use X-API-Key header, otherwise use Authorization: Bearer
 */
export function getAuthHeaders(
  authToken?: string,
  apiKey?: string,
  useApiKeyHeader: boolean = false
): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  } else if (apiKey) {
    if (useApiKeyHeader) {
      headers['X-API-Key'] = apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }
  
  return headers;
}

