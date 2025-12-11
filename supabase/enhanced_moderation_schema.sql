-- Enhanced Moderation Schema
-- Adds tables for moderation feedback, analytics, and crisis resources

-- ============================================================================
-- 1) Moderation Feedback Table (for learning from false positives/negatives)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.moderation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.vent_messages(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL, -- 'false_positive', 'false_negative', 'correct', 'needs_review'
  original_flag_status BOOLEAN,
  user_corrected_status BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_feedback_message_id ON public.moderation_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_moderation_feedback_owner_id ON public.moderation_feedback(owner_id);
CREATE INDEX IF NOT EXISTS idx_moderation_feedback_type ON public.moderation_feedback(feedback_type);

-- ============================================================================
-- 2) Crisis Resources Table (for self-harm intervention)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crisis_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.vent_messages(id) ON DELETE CASCADE,
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  resources_shown BOOLEAN DEFAULT false,
  intervention_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_resources_message_id ON public.crisis_resources(message_id);
CREATE INDEX IF NOT EXISTS idx_crisis_resources_vent_link_id ON public.crisis_resources(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_crisis_resources_risk_level ON public.crisis_resources(risk_level);

-- ============================================================================
-- 3) Moderation Analytics Table (for tracking moderation performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.moderation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_messages INTEGER DEFAULT 0,
  flagged_messages INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  false_negatives INTEGER DEFAULT 0,
  crisis_detections INTEGER DEFAULT 0,
  spam_detections INTEGER DEFAULT 0,
  threat_detections INTEGER DEFAULT 0,
  average_processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_moderation_analytics_date ON public.moderation_analytics(date DESC);

-- ============================================================================
-- 4) Add enhanced moderation fields to vent_messages
-- ============================================================================

ALTER TABLE public.vent_messages
ADD COLUMN IF NOT EXISTS ai_moderation_severity TEXT, -- 'none', 'low', 'medium', 'high', 'critical'
ADD COLUMN IF NOT EXISTS ai_moderation_requires_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_moderation_false_positive_risk TEXT, -- 'low', 'medium', 'high'
ADD COLUMN IF NOT EXISTS ai_moderation_recommended_action TEXT; -- 'none', 'flag', 'monitor', 'alert', 'intervene'

-- ============================================================================
-- 5) RLS Policies
-- ============================================================================

ALTER TABLE public.moderation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_analytics ENABLE ROW LEVEL SECURITY;

-- Moderation Feedback: Owners can manage their own feedback
CREATE POLICY "Moderation feedback: owners can manage"
ON public.moderation_feedback
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Crisis Resources: Owners can view resources for their messages
CREATE POLICY "Crisis resources: owners can view"
ON public.crisis_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vent_links vl
    WHERE vl.id = crisis_resources.vent_link_id
    AND vl.owner_id = auth.uid()
  )
);

-- Moderation Analytics: Authenticated users can view (for dashboard)
CREATE POLICY "Moderation analytics: authenticated can view"
ON public.moderation_analytics
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- 6) Comments
-- ============================================================================

COMMENT ON TABLE public.moderation_feedback IS 'User feedback on moderation accuracy for learning and improvement';
COMMENT ON TABLE public.crisis_resources IS 'Tracks crisis interventions and resources shown for self-harm risk messages';
COMMENT ON TABLE public.moderation_analytics IS 'Daily analytics on moderation performance and accuracy';
COMMENT ON COLUMN public.vent_messages.ai_moderation_severity IS 'Severity level: none, low, medium, high, critical';
COMMENT ON COLUMN public.vent_messages.ai_moderation_requires_review IS 'Whether this message requires human review';
COMMENT ON COLUMN public.vent_messages.ai_moderation_false_positive_risk IS 'Risk of false positive: low, medium, high';
COMMENT ON COLUMN public.vent_messages.ai_moderation_recommended_action IS 'Recommended action: none, flag, monitor, alert, intervene';
