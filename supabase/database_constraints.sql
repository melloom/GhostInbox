-- Critical Database Constraints for GhostInbox
-- Run this in your Supabase SQL Editor to add server-side validation

-- Message body length constraint (max 5000 characters)
ALTER TABLE public.vent_messages 
  DROP CONSTRAINT IF EXISTS body_length;

ALTER TABLE public.vent_messages 
  ADD CONSTRAINT body_length 
  CHECK (length(body) <= 5000 AND length(body) >= 1);

-- Handle format constraint (3-30 chars, alphanumeric + underscores/hyphens)
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS handle_format;

ALTER TABLE public.profiles 
  ADD CONSTRAINT handle_format 
  CHECK (
    length(handle) >= 3 
    AND length(handle) <= 30 
    AND handle ~ '^[a-z0-9_-]+$'
  );

-- Handle cannot be empty
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS handle_not_empty;

ALTER TABLE public.profiles 
  ADD CONSTRAINT handle_not_empty 
  CHECK (trim(handle) != '');

-- Slug format constraint (same as handle)
ALTER TABLE public.vent_links 
  DROP CONSTRAINT IF EXISTS slug_format;

ALTER TABLE public.vent_links 
  ADD CONSTRAINT slug_format 
  CHECK (
    length(slug) >= 3 
    AND length(slug) <= 30 
    AND slug ~ '^[a-z0-9_-]+$'
  );

-- Slug cannot be empty
ALTER TABLE public.vent_links 
  DROP CONSTRAINT IF EXISTS slug_not_empty;

ALTER TABLE public.vent_links 
  ADD CONSTRAINT slug_not_empty 
  CHECK (trim(slug) != '');

-- Body cannot be empty (already enforced by NOT NULL, but add explicit check)
ALTER TABLE public.vent_messages 
  DROP CONSTRAINT IF EXISTS body_not_empty;

ALTER TABLE public.vent_messages 
  ADD CONSTRAINT body_not_empty 
  CHECK (trim(body) != '');

-- Comments for documentation
COMMENT ON CONSTRAINT body_length ON public.vent_messages IS 'Enforces maximum message length of 5000 characters';
COMMENT ON CONSTRAINT handle_format ON public.profiles IS 'Enforces handle format: 3-30 chars, lowercase alphanumeric + underscores/hyphens';
COMMENT ON CONSTRAINT slug_format ON public.vent_links IS 'Enforces slug format: 3-30 chars, lowercase alphanumeric + underscores/hyphens';

