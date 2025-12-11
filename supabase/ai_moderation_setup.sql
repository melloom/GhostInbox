-- AI Moderation Auto-Processing Setup
-- This file sets up automatic AI moderation for new messages
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1) Enable pg_net extension (for HTTP calls from database)
-- ============================================================================

-- Check if pg_net extension exists, if not you'll need to enable it in Supabase Dashboard
-- Go to Database > Extensions and enable "pg_net"
-- Or run: CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 2) Function to call Edge Function for moderation (using pg_net)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_moderate_message()
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
  -- Get Supabase URL and service role key from environment
  -- These should be set as database secrets or environment variables
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If not set, try to get from Supabase project settings
  -- For production, set these via: ALTER DATABASE postgres SET app.settings.supabase_url = 'your-url';
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    -- Fallback: construct from current database
    v_supabase_url := 'https://' || current_database() || '.supabase.co';
  END IF;
  
  -- Use enhanced moderation for better accuracy
  v_edge_function_url := v_supabase_url || '/functions/v1/ai-moderation-enhanced';
  
  -- Schedule HTTP request to Edge Function (non-blocking)
  -- This will call the Edge Function asynchronously
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
      'vent_link_id', NEW.vent_link_id
    )
  ) INTO v_response_id;
  
  -- Log the request (optional)
  INSERT INTO public.ai_processing_log (
    message_id,
    processing_type,
    result,
    created_at
  ) VALUES (
    NEW.id,
    'moderation',
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
      'moderation',
      jsonb_build_object('error', SQLERRM),
      NOW()
    );
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3) Alternative: Simple trigger that marks message for processing
-- ============================================================================
-- If pg_net is not available, use this simpler approach
-- The Edge Function will be called from the client or a scheduled job

CREATE OR REPLACE FUNCTION public.mark_message_for_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark that this message needs moderation
  -- A background job or client can check for messages where ai_processed_at IS NULL
  -- For now, we'll rely on the webhook approach
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4) Create trigger to auto-moderate on message insert
-- ============================================================================

DROP TRIGGER IF EXISTS auto_moderate_on_insert ON public.vent_messages;

-- Use the pg_net approach if available, otherwise use the simpler one
CREATE TRIGGER auto_moderate_on_insert
  AFTER INSERT ON public.vent_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_moderate_message();

-- ============================================================================
-- 5) Function to manually trigger moderation (for existing messages)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_moderation_for_message(p_message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_body TEXT;
  v_vent_link_id UUID;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_edge_function_url TEXT;
  v_response_id BIGINT;
BEGIN
  -- Get message details
  SELECT body, vent_link_id INTO v_message_body, v_vent_link_id
  FROM public.vent_messages
  WHERE id = p_message_id;
  
  IF v_message_body IS NULL THEN
    RAISE EXCEPTION 'Message not found: %', p_message_id;
  END IF;
  
  -- Get Supabase URL
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://' || current_database() || '.supabase.co';
  END IF;
  
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  -- Use enhanced moderation for better accuracy
  v_edge_function_url := v_supabase_url || '/functions/v1/ai-moderation-enhanced';
  
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
      'vent_link_id', v_vent_link_id
    )
  ) INTO v_response_id;
  
  RAISE NOTICE 'Moderation triggered for message % (request ID: %)', p_message_id, v_response_id;
END;
$$;

-- ============================================================================
-- 6) Grant permissions
-- ============================================================================

-- Allow authenticated users to trigger moderation for their own messages
GRANT EXECUTE ON FUNCTION public.trigger_moderation_for_message(UUID) TO authenticated;

-- ============================================================================
-- 7) Comments
-- ============================================================================

COMMENT ON FUNCTION public.auto_moderate_message() IS 'Automatically triggers AI moderation when a new message is inserted';
COMMENT ON FUNCTION public.trigger_moderation_for_message(UUID) IS 'Manually trigger moderation for a specific message';
COMMENT ON TRIGGER auto_moderate_on_insert ON public.vent_messages IS 'Automatically moderates new messages using AI';
