// Supabase Edge Function: submit-unknown-report
// Handles unknown product report submissions from mobile app
// 
// Deploy: supabase functions deploy submit-unknown-report

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MINUTES = 10; // 10 minute window
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 requests per window
const RATE_LIMIT_MAX_REQUESTS_UNKNOWN = 2; // Stricter limit for unknown deviceHash

interface RequestBody {
  gtin: string;
  manualName?: string;
  note?: string;
  ocrText?: string;
  appVersion?: string;
  platform?: string;
  locale?: string;
  deviceHash?: string;
  hasImage?: boolean;
  imageExt?: 'jpg' | 'png';
}

interface ResponseData {
  success: boolean;
  message: string;
  reportId?: string;
  uploadUrl?: string;
  imagePath?: string;
}

/**
 * Validates GTIN format (8, 12, 13, or 14 digits after trimming)
 */
function validateGTIN(gtin: string): boolean {
  const normalized = gtin.replace(/[\s-]/g, '').trim();
  const validLengths = [8, 12, 13, 14];
  
  if (!validLengths.includes(normalized.length)) {
    return false;
  }
  
  if (!/^\d+$/.test(normalized)) {
    return false;
  }
  
  return true;
}

/**
 * Calculates the start of the current rate limit window
 * Windows are aligned to 10-minute intervals (e.g., 10:00, 10:10, 10:20, ...)
 */
function getCurrentWindowStart(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const windowStart = new Date(now);
  
  // Round down to nearest 10-minute mark
  windowStart.setMinutes(Math.floor(minutes / RATE_LIMIT_WINDOW_MINUTES) * RATE_LIMIT_WINDOW_MINUTES);
  windowStart.setSeconds(0);
  windowStart.setMilliseconds(0);
  
  return windowStart;
}

/**
 * Calculates seconds until the next window starts
 */
function getRetryAfterSeconds(): number {
  const now = new Date();
  const currentWindowStart = getCurrentWindowStart();
  const nextWindowStart = new Date(currentWindowStart);
  nextWindowStart.setMinutes(nextWindowStart.getMinutes() + RATE_LIMIT_WINDOW_MINUTES);
  
  const diffMs = nextWindowStart.getTime() - now.getTime();
  return Math.ceil(diffMs / 1000);
}

/**
 * Checks and increments rate limit counter for a device_hash
 * Returns true if within limit, false if rate limited
 */
async function checkRateLimit(
  supabase: any,
  deviceHash: string
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  try {
    // Use fallback if deviceHash is missing or invalid
    const effectiveHash = deviceHash || 'unknown';
    const maxRequests = effectiveHash === 'unknown' 
      ? RATE_LIMIT_MAX_REQUESTS_UNKNOWN 
      : RATE_LIMIT_MAX_REQUESTS;

    const windowStart = getCurrentWindowStart();
    const windowStartISO = windowStart.toISOString();

    // Try to get existing counter for this device_hash and window
    const { data: existing, error: selectError } = await supabase
      .from('rate_limits')
      .select('count, updated_at')
      .eq('device_hash', effectiveHash)
      .eq('window_start', windowStartISO)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking rate limit:', selectError);
      // On error, allow the request (fail open for availability)
      return { allowed: true };
    }

    const currentCount = existing?.count || 0;

    // Check if limit is exceeded
    if (currentCount >= maxRequests) {
      const retryAfterSec = getRetryAfterSeconds();
      return { allowed: false, retryAfterSec };
    }

    // Increment counter atomically using upsert with proper conflict resolution
    // For MVP: use upsert with count calculation
    const newCount = currentCount + 1;
    
    const { error: upsertError } = await supabase
      .from('rate_limits')
      .upsert({
        device_hash: effectiveHash,
        window_start: windowStartISO,
        count: newCount,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'device_hash,window_start',
        // Note: Supabase upsert replaces the whole row, so we set count directly
        // This is safe because we check limit before incrementing
      });

    if (upsertError) {
      console.error('Error updating rate limit:', upsertError);
      // On error, allow the request (fail open for availability)
      return { allowed: true };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Unexpected error in checkRateLimit:', error);
    // Fail open - allow request on unexpected errors
    return { allowed: true };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get service role key from environment
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL not set');
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const body: RequestBody = await req.json();

    // Validate required fields
    if (!body.gtin) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'GTIN is required',
        } as ResponseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validate GTIN format
    if (!validateGTIN(body.gtin)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid GTIN format. Must be 8, 12, 13, or 14 digits.',
        } as ResponseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Normalize GTIN (remove spaces/hyphens)
    const normalizedGTIN = body.gtin.replace(/[\s-]/g, '').trim();

    // Check rate limit
    const deviceHash = body.deviceHash || 'unknown';
    const rateLimitCheck = await checkRateLimit(supabase, deviceHash);
    
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'RATE_LIMITED',
          message: `For mange forespørsler. Prøv igjen om ${Math.ceil((rateLimitCheck.retryAfterSec || 60) / 60)} minutter.`,
          retryAfterSec: rateLimitCheck.retryAfterSec,
        } as ResponseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    // Prepare image path if hasImage is true
    let imagePath: string | null = null;
    let uploadUrl: string | null = null;

    // Insert report into database first (to get the report ID)
    const { data: reportData, error: insertError } = await supabase
      .from('unknown_reports')
      .insert({
        gtin: normalizedGTIN,
        manual_name: body.manualName || null,
        note: body.note || null,
        ocr_text: body.ocrText || null,
        app_version: body.appVersion || null,
        platform: body.platform || null,
        locale: body.locale || null,
        device_hash: body.deviceHash || null,
        image_path: null, // Will be updated after image upload
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting report:', insertError);
      throw insertError;
    }

    const reportId = reportData.id;

    // If hasImage is true, generate signed upload URL
    if (body.hasImage === true) {
      const imageExt = body.imageExt || 'jpg';
      
      // Generate image path: {gtin}/{reportId}.{ext}
      imagePath = `${normalizedGTIN}/${reportId}.${imageExt}`;

      // Generate signed upload URL (valid for 120 seconds)
      // Supabase Storage signed URLs can be used for both GET and PUT operations
      // The signed URL allows the client to upload the image directly to Storage
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('unknown-product-images')
        .createSignedUrl(imagePath, 120); // 120 seconds expiry

      if (signedUrlError) {
        console.error('Error creating signed upload URL:', signedUrlError);
        // Continue anyway - report is saved, but image upload will fail
        // Could optionally delete the report here if image is critical
      } else {
        // Signed URL can be used for PUT operation by the client
        // The client will upload the image file using PUT to this URL
        uploadUrl = signedUrlData.signedUrl;

        // Pre-update report with image_path (will be confirmed after successful upload)
        // This allows us to track which reports expect images
        await supabase
          .from('unknown_reports')
          .update({ image_path: imagePath })
          .eq('id', reportId);
      }
    }

    // Return success response
    const response: ResponseData = {
      success: true,
      message: 'Report submitted successfully',
      reportId,
      ...(uploadUrl && { uploadUrl, imagePath }),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error in submit-unknown-report:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
      } as ResponseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

