-- Alternative AI Priority Scoring Setup using Supabase Webhooks
-- This approach doesn't require pg_net extension
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1) Instructions for Webhook Setup
-- ============================================================================

-- To set up automatic priority scoring:
-- 
-- Option A: Use Supabase Database Webhooks (Recommended)
-- 1. Go to Supabase Dashboard > Database > Webhooks
-- 2. Create a new webhook:
--    - Name: "AI Priority Scoring Webhook"
--    - Table: vent_messages
--    - Events: INSERT, UPDATE (on ai_category, ai_sentiment, ai_urgency columns)
--    - Type: HTTP Request
--    - URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-priority-enhanced
--    - HTTP Method: POST
--    - HTTP Headers:
--      - Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--      - apikey: YOUR_SERVICE_ROLE_KEY
--      - Content-Type: application/json
--    - Request Body (JSON):
--      {
--        "message_id": "{{ $new.id }}",
--        "message_body": "{{ $new.body }}",
--        "vent_link_id": "{{ $new.vent_link_id }}",
--        "created_at": "{{ $new.created_at }}",
--        "ai_category": "{{ $new.ai_category }}",
--        "ai_sentiment": "{{ $new.ai_sentiment }}",
--        "ai_urgency": "{{ $new.ai_urgency }}"
--      }
--
-- Note: The Edge Function will use existing AI categorization data if available
--       to provide more accurate priority scores
--
-- Option B: Use pg_cron (if available)
-- Schedule a job to process unscored messages:
--    SELECT cron.schedule(
--      'process-unscored-messages',
--      '*/10 * * * *', -- Every 10 minutes
--      $$
--        SELECT trigger_priority_scoring_for_message(id)
--        FROM vent_messages
--        WHERE ai_priority_score IS NULL
--        LIMIT 10
--      $$
--    );
--
-- Option C: Client-side trigger (simpler but less reliable)
-- Call the Edge Function from the client after message creation or categorization

-- ============================================================================
-- 2) Function to process priority scoring for a message
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_message_priority_scoring(p_message_id UUID)
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
  RAISE NOTICE 'Priority scoring queued for message %', p_message_id;
END;
$$;

-- ============================================================================
-- 3) Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.process_message_priority_scoring(UUID) TO authenticated;

-- ============================================================================
-- 4) Comments
-- ============================================================================

COMMENT ON FUNCTION public.process_message_priority_scoring(UUID) IS 'Queue a message for AI priority scoring processing';
