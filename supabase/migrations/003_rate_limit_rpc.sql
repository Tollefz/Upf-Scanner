-- Migration: Add RPC function for atomic rate limit increment
-- Alternative approach using PostgreSQL function for true atomic increment
-- Run with: supabase migration new rate_limit_rpc

-- Optional: Create a PostgreSQL function for atomic increment
-- This provides better atomicity than client-side upsert
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_device_hash TEXT,
  p_window_start TIMESTAMPTZ,
  p_max_requests INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Get or initialize count for this device_hash and window
  INSERT INTO public.rate_limits (device_hash, window_start, count, updated_at)
  VALUES (p_device_hash, p_window_start, 1, now())
  ON CONFLICT (device_hash, window_start)
  DO UPDATE SET 
    count = rate_limits.count + 1,
    updated_at = now()
  RETURNING count INTO current_count;
  
  -- Return the new count
  RETURN current_count;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION increment_rate_limit(TEXT, TIMESTAMPTZ, INTEGER) TO service_role;

-- Note: This RPC function is optional - the client-side upsert approach works fine for MVP
-- Uncomment if you want to use the RPC approach instead:
-- 
-- In Edge Function, replace upsert with:
-- const { data, error } = await supabase.rpc('increment_rate_limit', {
--   p_device_hash: effectiveHash,
--   p_window_start: windowStartISO,
--   p_max_requests: maxRequests,
-- });

