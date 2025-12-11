-- Additional Features Schema for GhostInbox
-- Run this in your Supabase SQL Editor

-- Message Tags table
CREATE TABLE IF NOT EXISTS public.message_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.vent_messages(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, tag_name)
);

-- Message Notes table (private notes for creators)
CREATE TABLE IF NOT EXISTS public.message_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.vent_messages(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, owner_id)
);

-- Private Responses table (creators can respond to anonymous messages)
CREATE TABLE IF NOT EXISTS public.message_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.vent_messages(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Response Templates table
CREATE TABLE IF NOT EXISTS public.response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_text TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_tags_message_id ON public.message_tags(message_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_tag_name ON public.message_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_message_notes_message_id ON public.message_notes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_notes_owner_id ON public.message_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_message_responses_message_id ON public.message_responses(message_id);
CREATE INDEX IF NOT EXISTS idx_message_responses_owner_id ON public.message_responses(owner_id);
CREATE INDEX IF NOT EXISTS idx_response_templates_owner_id ON public.response_templates(owner_id);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.message_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;

-- Message Tags policies
DROP POLICY IF EXISTS "Message tags: owners can manage" ON public.message_tags;
CREATE POLICY "Message tags: owners can manage"
  ON public.message_tags
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_messages
      JOIN public.vent_links ON vent_links.id = vent_messages.vent_link_id
      WHERE vent_messages.id = message_tags.message_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_messages
      JOIN public.vent_links ON vent_links.id = vent_messages.vent_link_id
      WHERE vent_messages.id = message_tags.message_id
        AND vent_links.owner_id = auth.uid()
    )
  );

-- Message Notes policies
DROP POLICY IF EXISTS "Message notes: owners can manage" ON public.message_notes;
CREATE POLICY "Message notes: owners can manage"
  ON public.message_notes
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Message Responses policies
DROP POLICY IF EXISTS "Message responses: owners can manage" ON public.message_responses;
CREATE POLICY "Message responses: owners can manage"
  ON public.message_responses
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_messages
      JOIN public.vent_links ON vent_links.id = vent_messages.vent_link_id
      WHERE vent_messages.id = message_responses.message_id
        AND vent_links.owner_id = auth.uid()
        AND vent_links.owner_id = message_responses.owner_id
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_messages
      JOIN public.vent_links ON vent_links.id = vent_messages.vent_link_id
      WHERE vent_messages.id = message_responses.message_id
        AND vent_links.owner_id = auth.uid()
        AND vent_links.owner_id = message_responses.owner_id
    )
  );

-- Response Templates policies
DROP POLICY IF EXISTS "Response templates: owners can manage" ON public.response_templates;
CREATE POLICY "Response templates: owners can manage"
  ON public.response_templates
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

