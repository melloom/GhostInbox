-- AI Categorization Auto-Processing Setup
-- This file sets up automatic AI categorization for new messages
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1) Function to call Edge Function for categorization (using pg_net)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_categorize_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_edge_function_url TEXT;
  v_response_id BIGINT;
  v_owner_id UUID;
BEGIN
  -- Get owner_id from vent_link
  SELECT owner_id INTO v_owner_id
  FROM public.vent_links
  WHERE id = NEW.vent_link_id;
  
  -- Get Supabase URL and service role key
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://' || current_database() || '.supabase.co';
  END IF;
  
  v_edge_function_url := v_supabase_url || '/functions/v1/ai-categorization-webhook';
  
  -- Schedule HTTP request to Edge Function (non-blocking)
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
      'owner_id', v_owner_id
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
    'categorize',
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
      'categorize',
      jsonb_build_object('error', SQLERRM),
      NOW()
    );
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2) Create trigger to auto-categorize on message insert
-- ============================================================================

DROP TRIGGER IF EXISTS auto_categorize_on_insert ON public.vent_messages;

-- Use the pg_net approach if available
CREATE TRIGGER auto_categorize_on_insert
  AFTER INSERT ON public.vent_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_categorize_message();

-- ============================================================================
-- 3) Function to manually trigger categorization
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_categorization_for_message(p_message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_body TEXT;
  v_vent_link_id UUID;
  v_owner_id UUID;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_edge_function_url TEXT;
  v_response_id BIGINT;
BEGIN
  -- Get message details
  SELECT vm.body, vm.vent_link_id, vl.owner_id
  INTO v_message_body, v_vent_link_id, v_owner_id
  FROM public.vent_messages vm
  JOIN public.vent_links vl ON vm.vent_link_id = vl.id
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
  v_edge_function_url := v_supabase_url || '/functions/v1/ai-categorization-webhook';
  
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
      'owner_id', v_owner_id
    )
  ) INTO v_response_id;
  
  RAISE NOTICE 'Categorization triggered for message % (request ID: %)', p_message_id, v_response_id;
END;
$$;

-- ============================================================================
-- 4) Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.trigger_categorization_for_message(UUID) TO authenticated;

-- ============================================================================
-- 5) Comments
-- ============================================================================

COMMENT ON FUNCTION public.auto_categorize_message() IS 'Automatically triggers AI categorization when a new message is inserted';
COMMENT ON FUNCTION public.trigger_categorization_for_message(UUID) IS 'Manually trigger categorization for a specific message';
COMMENT ON TRIGGER auto_categorize_on_insert ON public.vent_messages IS 'Automatically categorizes new messages using AI';
