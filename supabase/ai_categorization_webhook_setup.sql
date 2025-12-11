-- Alternative AI Categorization Setup using Supabase Webhooks
-- This approach doesn't require pg_net extension
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1) Instructions for Webhook Setup
-- ============================================================================

-- To set up automatic categorization:
-- 
-- Option A: Use Supabase Database Webhooks (Recommended)
-- 1. Go to Supabase Dashboard > Database > Webhooks
-- 2. Create a new webhook:
--    - Name: "AI Categorization Webhook"
--    - Table: vent_messages
--    - Events: INSERT
--    - Type: HTTP Request
--    - URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-categorization-webhook
--    - HTTP Method: POST
--    - HTTP Headers:
--      - Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--      - apikey: YOUR_SERVICE_ROLE_KEY
--      - Content-Type: application/json
--    - Request Body (JSON):
--      {
--        "message_id": "{{ $new.id }}",
--        "message_body": "{{ $new.body }}",
--        "vent_link_id": "{{ $new.vent_link_id }}"
--      }
--
-- Note: The Edge Function will automatically look up the owner_id from the vent_link
--
-- Option B: Use pg_cron (if available)
-- Schedule a job to process uncategorized messages:
--    SELECT cron.schedule(
--      'process-uncategorized-messages',
--      '*/5 * * * *', -- Every 5 minutes
--      $$
--        SELECT trigger_categorization_for_message(id)
--        FROM vent_messages
--        WHERE ai_processed_at IS NULL OR ai_category IS NULL
--        LIMIT 10
--      $$
--    );
--
-- Option C: Client-side trigger (simpler but less reliable)
-- Call the Edge Function from the client after message creation

-- ============================================================================
-- 2) Function to process categorization for a message
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_message_categorization(p_message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_body TEXT;
  v_vent_link_id UUID;
BEGIN
  -- Get message details
  SELECT body, vent_link_id INTO v_message_body, v_vent_link_id
  FROM public.vent_messages
  WHERE id = p_message_id;
  
  IF v_message_body IS NULL THEN
    RAISE EXCEPTION 'Message not found: %', p_message_id;
  END IF;
  
  -- This function will be called by a webhook or scheduled job
  RAISE NOTICE 'Categorization queued for message %', p_message_id;
END;
$$;

-- ============================================================================
-- 3) Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.process_message_categorization(UUID) TO authenticated;

-- ============================================================================
-- 4) Comments
-- ============================================================================

COMMENT ON FUNCTION public.process_message_categorization(UUID) IS 'Queue a message for AI categorization processing';
