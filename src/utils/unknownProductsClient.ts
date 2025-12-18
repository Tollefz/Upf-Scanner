/**
 * Unknown Products Client
 * 
 * Client-side utility for submitting unknown product reports to Supabase
 * 
 * Prerequisites:
 * - EXPO_PUBLIC_SUPABASE_URL must be set
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY must be set
 */

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Get Supabase config from environment
const supabaseUrl = 
  Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = 
  Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Silent in dev - Supabase is optional
  if (!__DEV__) {
    // Could log in production if needed, but keep silent for now
  }
}

// Create Supabase client (uses anon key, safe for client-side)
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

interface SubmitReportParams {
  gtin: string;
  manualName?: string;
  note?: string;
  ocrText?: string;
  photoUri?: string; // Local file URI
  imageExt?: 'jpg' | 'png';
}

interface SubmitReportResponse {
  success: boolean;
  message: string;
  reportId?: string;
  uploadUrl?: string;
  imagePath?: string;
}

/**
 * Submits unknown product report to Supabase via Edge Function
 * 
 * @param params Report data
 * @returns Response with reportId and optional uploadUrl
 */
export async function submitUnknownReportToSupabase(
  params: SubmitReportParams
): Promise<SubmitReportResponse> {
  if (!supabase) {
    throw new Error('Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  try {
    const hasImage = !!params.photoUri;
    const imageExt = params.imageExt || (params.photoUri?.endsWith('.png') ? 'png' : 'jpg');

    // Get device info (optional)
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    const platform = Platform.OS; // 'ios' | 'android'
    const locale = Platform.locale || 'da-DK';

    // Generate device hash (simple hash of device ID, for abuse control)
    // In production, use a more secure method
    const deviceId = await getDeviceId();
    const deviceHash = hashString(deviceId).substring(0, 16);

    // Call Edge Function
    const { data: response, error } = await supabase.functions.invoke(
      'submit-unknown-report',
      {
        body: {
          gtin: params.gtin,
          manualName: params.manualName,
          note: params.note,
          ocrText: params.ocrText,
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
      console.error('Supabase function error:', error);
      throw error;
    }

    if (!response || !response.success) {
      throw new Error(response?.message || 'Unknown error');
    }

    // If hasImage and we got an uploadUrl, upload the image
    if (hasImage && response.uploadUrl && params.photoUri) {
      await uploadImageToSupabase(response.uploadUrl, params.photoUri);
    }

    return {
      success: true,
      message: response.message,
      reportId: response.reportId,
      uploadUrl: response.uploadUrl,
      imagePath: response.imagePath,
    };
  } catch (error: any) {
    console.error('Error submitting report to Supabase:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit report',
    };
  }
}

/**
 * Uploads image to Supabase storage using signed URL
 * 
 * Note: Supabase signed URLs from createSignedUrl can be used for PUT operations
 * We upload the file directly to the signed URL
 */
async function uploadImageToSupabase(signedUrl: string, localUri: string): Promise<void> {
  try {
    // Read file as base64 (expo-file-system)
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Uint8Array
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine content type based on file extension
    const contentType = localUri.toLowerCase().endsWith('.png') 
      ? 'image/png' 
      : 'image/jpeg';

    // Upload to signed URL using PUT method
    // Supabase signed URLs support PUT operations for uploads
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

    console.log('Image uploaded successfully to:', signedUrl.split('?')[0]);
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Gets device ID (simple implementation)
 * TODO: Use expo-device for more reliable device ID
 */
async function getDeviceId(): Promise<string> {
  // Simple fallback - in production, use expo-device
  return Platform.OS === 'ios' 
    ? 'ios-device-id' 
    : 'android-device-id';
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

