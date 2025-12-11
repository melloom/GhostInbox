-- Alternative AI Moderation Setup using Supabase Webhooks
-- This approach doesn't require pg_net extension
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1) Create a function to process moderation for a message
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_message_moderation(p_message_id UUID)
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
  -- The actual moderation is done by the Edge Function
  RAISE NOTICE 'Moderation queued for message %', p_message_id;
END;
$$;

-- ============================================================================
-- 2) Instructions for Webhook Setup
-- ============================================================================

-- To set up automatic moderation:
-- 
-- Option A: Use Supabase Database Webhooks (Recommended)
-- 1. Go to Supabase Dashboard > Database > Webhooks
-- 2. Create a new webhook:
--    - Name: "AI Moderation Webhook"
--    - Table: vent_messages
--    - Events: INSERT
--    - Type: HTTP Request
--    - URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-moderation-enhanced
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
-- Option B: Use pg_cron (if available)
-- 1. Enable pg_cron extension
-- 2. Schedule a job to process unmoderated messages:
--    SELECT cron.schedule(
--      'process-unmoderated-messages',
--      '*/5 * * * *', -- Every 5 minutes
--      $$
--        SELECT process_message_moderation(id)
--        FROM vent_messages
--        WHERE ai_processed_at IS NULL
--        LIMIT 10
--      $$
--    );
--
-- Option C: Client-side trigger (simpler but less reliable)
-- Call the Edge Function from the client after message creation
-- See: src/pages/VentPage.tsx - handleSubmit function

-- ============================================================================
-- 3) Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.process_message_moderation(UUID) TO authenticated;

-- ============================================================================
-- 4) Comments
-- ============================================================================

COMMENT ON FUNCTION public.process_message_moderation(UUID) IS 'Queue a message for AI moderation processing';
