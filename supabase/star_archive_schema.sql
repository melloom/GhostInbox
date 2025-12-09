-- Star and Archive Features for GhostInbox
-- Run this in your Supabase SQL Editor

-- Add is_starred column to vent_messages
ALTER TABLE public.vent_messages 
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

-- Add is_archived column to vent_messages
ALTER TABLE public.vent_messages 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vent_messages_is_starred ON public.vent_messages(is_starred);
CREATE INDEX IF NOT EXISTS idx_vent_messages_is_archived ON public.vent_messages(is_archived);

-- RLS policies already cover updates, so no new policies needed
-- The existing "Vent messages: only owner can update" policy will handle starred/archived updates

