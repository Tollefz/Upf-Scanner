-- Migration: Add rate limiting table for unknown report submissions
-- Run with: supabase migration new add_rate_limiting

-- Create rate_limits table to track requests per device_hash per time window
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one row per device_hash per time window
  UNIQUE(device_hash, window_start)
);

-- Create index for fast lookups by device_hash and window_start
CREATE INDEX IF NOT EXISTS idx_rate_limits_device_window 
ON public.rate_limits(device_hash, window_start DESC);

-- Create index for cleanup of old windows (for maintenance)
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
ON public.rate_limits(window_start);

-- Enable RLS (Row Level Security)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Deny all access from anon (only service_role via Edge Function can access)
CREATE POLICY "Deny all anon access" ON public.rate_limits
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Service role can do everything (used by Edge Function)
-- Note: Service role bypasses RLS by default, but we'll be explicit
CREATE POLICY "Service role full access" ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean up old rate limit windows (older than 1 hour)
-- Can be called periodically via cron job or manually
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < (now() - INTERVAL '1 hour');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Optional: Create a scheduled job to clean up old records
-- (Uncomment if you want automatic cleanup)
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_old_rate_limits();');

