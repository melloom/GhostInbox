-- Additional Priority Trigger for Moderation Fields
-- Run this AFTER running enhanced_moderation_schema.sql
-- This adds a trigger to re-score priority when moderation fields are updated

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_score_priority_on_moderation_update ON public.vent_messages;

-- Create trigger for moderation fields
CREATE TRIGGER auto_score_priority_on_moderation_update
  AFTER UPDATE OF ai_moderation_severity, ai_self_harm_risk ON public.vent_messages
  FOR EACH ROW
  WHEN (OLD.ai_moderation_severity IS DISTINCT FROM NEW.ai_moderation_severity
        OR OLD.ai_self_harm_risk IS DISTINCT FROM NEW.ai_self_harm_risk)
  EXECUTE FUNCTION public.auto_score_priority();

-- Comment
COMMENT ON TRIGGER auto_score_priority_on_moderation_update ON public.vent_messages IS 'Re-scores priority when moderation severity or self-harm risk is updated';
