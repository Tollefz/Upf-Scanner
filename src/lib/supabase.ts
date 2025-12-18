/**
 * Supabase Client
 * 
 * Initialiserer Supabase client for bruk i appen
 * Bruker kun anon key (sikker for client-side)
 */

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get Supabase config from environment variables
const supabaseUrl = 
  Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  '';

const supabaseAnonKey = 
  Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  '';

// Silent check - only log in production if actually needed
// In dev, Supabase is optional and warnings are noisy
if (!supabaseUrl || !supabaseAnonKey) {
  // Only log if explicitly needed (not in dev mode)
  if (__DEV__) {
    // Silent in dev - Supabase is optional
  } else {
    // Could log in production if needed, but keep silent for now
  }
}

/**
 * Supabase client instance
 * 
 * Uses anon key - safe for client-side usage
 * Service role key is ONLY used in Edge Functions (server-side)
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!supabase;
}

