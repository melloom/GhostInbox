-- Polls feature for GhostInbox
-- Run this in your Supabase SQL Editor

-- Polls table
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  max_votes INTEGER -- Optional: limit total votes
);

-- Poll options table
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll votes table
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  ip_hash TEXT, -- For anonymous voting prevention (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, ip_hash) -- Prevent duplicate votes from same IP (if ip_hash is provided)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_polls_vent_link_id ON public.polls(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_polls_is_active ON public.polls(is_active);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON public.poll_votes(option_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all poll tables
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls policies
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Polls: owners can do everything" ON public.polls;
DROP POLICY IF EXISTS "Polls: public can select active polls" ON public.polls;

-- Owners can do everything with their polls
CREATE POLICY "Polls: owners can do everything"
  ON public.polls
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = polls.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = polls.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

-- Public can read active polls (needed for /v/:slug page)
CREATE POLICY "Polls: public can select active polls"
  ON public.polls
  FOR SELECT
  USING (is_active = true);

-- Poll options policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Poll options: owners can do everything" ON public.poll_options;
DROP POLICY IF EXISTS "Poll options: public can select for active polls" ON public.poll_options;

-- Owners can do everything with their poll options
CREATE POLICY "Poll options: owners can do everything"
  ON public.poll_options
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.polls
      JOIN public.vent_links ON vent_links.id = polls.vent_link_id
      WHERE polls.id = poll_options.poll_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.polls
      JOIN public.vent_links ON vent_links.id = polls.vent_link_id
      WHERE polls.id = poll_options.poll_id
        AND vent_links.owner_id = auth.uid()
    )
  );

-- Public can read poll options for active polls
CREATE POLICY "Poll options: public can select for active polls"
  ON public.poll_options
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.polls
      WHERE polls.id = poll_options.poll_id
        AND polls.is_active = true
    )
  );

-- Poll votes policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Poll votes: public can insert" ON public.poll_votes;
DROP POLICY IF EXISTS "Poll votes: public can select" ON public.poll_votes;
DROP POLICY IF EXISTS "Poll votes: owners can select all" ON public.poll_votes;

-- Public can insert votes (anonymous voting)
CREATE POLICY "Poll votes: public can insert"
  ON public.poll_votes
  FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.polls
      WHERE polls.id = poll_votes.poll_id
        AND polls.is_active = true
    )
  );

-- Public can read votes (to see results)
CREATE POLICY "Poll votes: public can select"
  ON public.poll_votes
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.polls
      WHERE polls.id = poll_votes.poll_id
        AND polls.is_active = true
    )
  );

-- Owners can read all votes for their polls
CREATE POLICY "Poll votes: owners can select all"
  ON public.poll_votes
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.polls
      JOIN public.vent_links ON vent_links.id = polls.vent_link_id
      WHERE polls.id = poll_votes.poll_id
        AND vent_links.owner_id = auth.uid()
    )
  );

