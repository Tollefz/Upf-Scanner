/**
 * GS1 Image API Client
 * 
 * Documentation: https://developer.gs1.org/
 * 
 * TODO: Get API credentials from:
 * 1. Register at https://developer.gs1.org/
 * 2. Create application and get API key for Image API
 * 3. Set environment variable: EXPO_PUBLIC_GS1_IMAGE_API_KEY
 */

import { fetchWithRetry, getAuthHeaders, type APIClientConfig } from './base';

interface GS1ImageResponse {
  images?: Array<{ url: string }>;
  frontImage?: { url: string };
}

export class GS1ImageClient {
  private apiKey: string;
  private baseURL: string;
  private config: APIClientConfig;

  constructor(apiKey: string, config: APIClientConfig = {}) {
    if (!apiKey) {
      throw new Error('GS1 Image API key is required');
    }
    
    this.apiKey = apiKey;
    // TODO: Replace with actual GS1 Image API base URL
    this.baseURL = 'https://api.gs1.org/image/v1';
    this.config = config;
  }

  /**
   * Fetches product image URL for a GTIN
   */
  async fetchImageURL(gtin: string): Promise<string | null> {
    // TODO: Replace with actual endpoint path
    const url = `${this.baseURL}/products/${encodeURIComponent(gtin)}/images`;
    
    const response = await fetchWithRetry<GS1ImageResponse>(
      url,
      {
        method: 'GET',
        headers: getAuthHeaders(undefined, this.apiKey), // API key as Bearer token
      },
      this.config
    );

    if (response.error || !response.data) {
      console.warn(`GS1 Image API error for GTIN ${gtin}:`, response.error);
      return null;
    }

    // Extract image URL (prefer front image, fallback to first image)
    return response.data.frontImage?.url || response.data.images?.[0]?.url || null;
  }
}

