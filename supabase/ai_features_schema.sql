-- AI Features Database Schema
-- Run this in your Supabase SQL Editor to add AI-related columns and tables

-- Add AI columns to vent_messages table
ALTER TABLE public.vent_messages
ADD COLUMN IF NOT EXISTS ai_moderation_score REAL,
ADD COLUMN IF NOT EXISTS ai_moderation_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_moderation_categories JSONB,
ADD COLUMN IF NOT EXISTS ai_self_harm_risk TEXT,
ADD COLUMN IF NOT EXISTS ai_category TEXT,
ADD COLUMN IF NOT EXISTS ai_sentiment TEXT,
ADD COLUMN IF NOT EXISTS ai_urgency TEXT,
ADD COLUMN IF NOT EXISTS ai_priority_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

-- Add indexes for AI queries
CREATE INDEX IF NOT EXISTS idx_messages_ai_moderation_flagged ON public.vent_messages(ai_moderation_flagged) WHERE ai_moderation_flagged = true;
CREATE INDEX IF NOT EXISTS idx_messages_ai_priority_score ON public.vent_messages(ai_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_messages_ai_category ON public.vent_messages(ai_category);
CREATE INDEX IF NOT EXISTS idx_messages_ai_sentiment ON public.vent_messages(ai_sentiment);
CREATE INDEX IF NOT EXISTS idx_messages_ai_urgency ON public.vent_messages(ai_urgency);

-- Create AI processing log table (optional - for tracking)
CREATE TABLE IF NOT EXISTS public.ai_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.vent_messages(id) ON DELETE CASCADE,
  processing_type TEXT NOT NULL, -- 'moderation', 'categorize', 'priority-score'
  result JSONB,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_log_message_id ON public.ai_processing_log(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_created_at ON public.ai_processing_log(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.vent_messages.ai_moderation_score IS 'Overall moderation score (0-1, higher = more problematic)';
COMMENT ON COLUMN public.vent_messages.ai_moderation_flagged IS 'Whether message was flagged by AI moderation';
COMMENT ON COLUMN public.vent_messages.ai_moderation_categories IS 'JSON object with category flags and scores from moderation API';
COMMENT ON COLUMN public.vent_messages.ai_self_harm_risk IS 'Self-harm risk level: none, low, medium, high';
COMMENT ON COLUMN public.vent_messages.ai_category IS 'Primary category: question, compliment, criticism, support, feedback, suggestion, other';
COMMENT ON COLUMN public.vent_messages.ai_sentiment IS 'Sentiment: positive, negative, neutral, mixed';
COMMENT ON COLUMN public.vent_messages.ai_urgency IS 'Urgency level: low, medium, high';
COMMENT ON COLUMN public.vent_messages.ai_priority_score IS 'Priority score 1-100 (higher = more important to respond to)';
COMMENT ON COLUMN public.vent_messages.ai_processed_at IS 'Timestamp when AI processing was completed';

-- RLS policies for ai_processing_log (owners can see their own logs)
ALTER TABLE public.ai_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI processing logs"
ON public.ai_processing_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vent_messages vm
    JOIN public.vent_links vl ON vm.vent_link_id = vl.id
    WHERE vm.id = ai_processing_log.message_id
    AND vl.owner_id = auth.uid()
  )
);
