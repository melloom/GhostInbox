-- AI Priority Scoring Auto-Processing Setup
-- This file sets up automatic AI priority scoring for new messages
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1) Function to call Edge Function for priority scoring (using pg_net)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_score_priority()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_edge_function_url TEXT;
  v_response_id BIGINT;
BEGIN
  -- Get Supabase URL and service role key
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://' || current_database() || '.supabase.co';
  END IF;
  
  -- Use enhanced priority scoring for better accuracy
  v_edge_function_url := v_supabase_url || '/functions/v1/ai-priority-enhanced';
  
  -- Schedule HTTP request to Edge Function (non-blocking)
  -- Pass existing AI data if available
  SELECT net.http_post(
    url := v_edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_role_key, ''),
      'apikey', COALESCE(v_service_role_key, '')
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'message_body', NEW.body,
      'vent_link_id', NEW.vent_link_id,
      'created_at', NEW.created_at,
      'ai_category', NEW.ai_category,
      'ai_sentiment', NEW.ai_sentiment,
      'ai_urgency', NEW.ai_urgency,
      'ai_moderation_severity', NEW.ai_moderation_severity,
      'ai_self_harm_risk', NEW.ai_self_harm_risk
    )
  ) INTO v_response_id;
  
  -- Log the request
  INSERT INTO public.ai_processing_log (
    message_id,
    processing_type,
    result,
    created_at
  ) VALUES (
    NEW.id,
    'priority-score',
    jsonb_build_object('status', 'queued', 'request_id', v_response_id),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    INSERT INTO public.ai_processing_log (
      message_id,
      processing_type,
      result,
      created_at
    ) VALUES (
      NEW.id,
      'priority-score',
      jsonb_build_object('error', SQLERRM),
      NOW()
    );
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2) Create trigger to auto-score priority on message insert/update
-- ============================================================================

DROP TRIGGER IF EXISTS auto_score_priority_on_insert ON public.vent_messages;
DROP TRIGGER IF EXISTS auto_score_priority_on_update ON public.vent_messages;

-- Trigger on insert (for new messages)
CREATE TRIGGER auto_score_priority_on_insert
  AFTER INSERT ON public.vent_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_score_priority();

-- Trigger on update (when categorization or moderation is added, re-score priority)
CREATE TRIGGER auto_score_priority_on_update
  AFTER UPDATE OF ai_category, ai_sentiment, ai_urgency, ai_moderation_severity, ai_self_harm_risk ON public.vent_messages
  FOR EACH ROW
  WHEN (OLD.ai_category IS DISTINCT FROM NEW.ai_category 
        OR OLD.ai_sentiment IS DISTINCT FROM NEW.ai_sentiment 
        OR OLD.ai_urgency IS DISTINCT FROM NEW.ai_urgency
        OR OLD.ai_moderation_severity IS DISTINCT FROM NEW.ai_moderation_severity
        OR OLD.ai_self_harm_risk IS DISTINCT FROM NEW.ai_self_harm_risk)
  EXECUTE FUNCTION public.auto_score_priority();

-- ============================================================================
-- 3) Function to manually trigger priority scoring
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_priority_scoring_for_message(p_message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_body TEXT;
  v_vent_link_id UUID;
  v_created_at TIMESTAMPTZ;
  v_ai_category TEXT;
  v_ai_sentiment TEXT;
  v_ai_urgency TEXT;
  v_ai_moderation_severity TEXT;
  v_ai_self_harm_risk TEXT;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_edge_function_url TEXT;
  v_response_id BIGINT;
BEGIN
  -- Get message details including AI data
  SELECT 
    vm.body, 
    vm.vent_link_id, 
    vm.created_at,
    vm.ai_category,
    vm.ai_sentiment,
    vm.ai_urgency,
    vm.ai_moderation_severity,
    vm.ai_self_harm_risk
  INTO 
    v_message_body, 
    v_vent_link_id, 
    v_created_at,
    v_ai_category,
    v_ai_sentiment,
    v_ai_urgency,
    v_ai_moderation_severity,
    v_ai_self_harm_risk
  FROM public.vent_messages vm
  WHERE vm.id = p_message_id;
  
  IF v_message_body IS NULL THEN
    RAISE EXCEPTION 'Message not found: %', p_message_id;
  END IF;
  
  -- Get Supabase URL
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://' || current_database() || '.supabase.co';
  END IF;
  
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  -- Use enhanced priority scoring for better accuracy
  v_edge_function_url := v_supabase_url || '/functions/v1/ai-priority-enhanced';
  
  -- Schedule HTTP request
  SELECT net.http_post(
    url := v_edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_role_key, ''),
      'apikey', COALESCE(v_service_role_key, '')
    ),
    body := jsonb_build_object(
      'message_id', p_message_id,
      'message_body', v_message_body,
      'vent_link_id', v_vent_link_id,
      'created_at', v_created_at,
      'ai_category', v_ai_category,
      'ai_sentiment', v_ai_sentiment,
      'ai_urgency', v_ai_urgency,
      'ai_moderation_severity', v_ai_moderation_severity,
      'ai_self_harm_risk', v_ai_self_harm_risk
    )
  ) INTO v_response_id;
  
  RAISE NOTICE 'Priority scoring triggered for message % (request ID: %)', p_message_id, v_response_id;
END;
$$;

-- ============================================================================
-- 4) Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.trigger_priority_scoring_for_message(UUID) TO authenticated;

-- ============================================================================
-- 5) Comments
-- ============================================================================

COMMENT ON FUNCTION public.auto_score_priority() IS 'Automatically triggers AI priority scoring when a new message is inserted or AI data is updated';
COMMENT ON FUNCTION public.trigger_priority_scoring_for_message(UUID) IS 'Manually trigger priority scoring for a specific message';
COMMENT ON TRIGGER auto_score_priority_on_insert ON public.vent_messages IS 'Automatically scores priority for new messages using AI';
COMMENT ON TRIGGER auto_score_priority_on_update ON public.vent_messages IS 'Re-scores priority when categorization data is updated';
