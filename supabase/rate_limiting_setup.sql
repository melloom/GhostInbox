-- Rate Limiting Setup for GhostInbox
-- This adds IP hashing and rate limiting support

-- Function to hash IP addresses (SHA-256)
-- Note: This will be called from Edge Functions, but we can also use it in triggers
CREATE OR REPLACE FUNCTION hash_ip(ip_address TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use pgcrypto extension for hashing
  RETURN encode(digest(ip_address, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index on ip_hash for faster rate limit queries
CREATE INDEX IF NOT EXISTS idx_vent_messages_ip_hash ON public.vent_messages(ip_hash);
CREATE INDEX IF NOT EXISTS idx_vent_messages_vent_link_ip ON public.vent_messages(vent_link_id, ip_hash, created_at DESC);

-- Function to check rate limit (can be called from Edge Functions or triggers)
CREATE OR REPLACE FUNCTION check_message_rate_limit(
  p_vent_link_id UUID,
  p_ip_hash TEXT,
  p_limit_per_hour INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Calculate window start (1 hour ago)
  v_window_start := NOW() - INTERVAL '1 hour';
  
  -- Count messages from this IP for this vent link in the last hour
  SELECT COUNT(*)
  INTO v_count
  FROM public.vent_messages
  WHERE vent_link_id = p_vent_link_id
    AND ip_hash = p_ip_hash
    AND created_at >= v_window_start;
  
  -- Return true if under limit, false if over limit
  RETURN v_count < p_limit_per_hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Trigger to automatically hash IP on insert
-- Note: This requires the IP to be passed in a different field first
-- For now, Edge Functions will handle IP hashing

-- Add comment to ip_hash column
COMMENT ON COLUMN public.vent_messages.ip_hash IS 'SHA-256 hash of sender IP address for rate limiting. Null if not available.';

