-- GhostInbox Database Schema
-- Run this in your Supabase SQL Editor

-- Profiles table (creators info)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vent Links table
-- Each creator's vent URL
CREATE TABLE IF NOT EXISTS public.vent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vent Messages table
-- Stores anonymous messages
CREATE TABLE IF NOT EXISTS public.vent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  mood TEXT,
  ip_hash TEXT,
  is_read BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vent_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Profiles: user can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: public can select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: user can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: user can update own profile" ON public.profiles;

-- Public can read profiles (needed for /v/:slug to show handle)
CREATE POLICY "Profiles: public can select"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Users can insert their own profile (during signup)
CREATE POLICY "Profiles: user can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Profiles: user can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Vent Links policies
-- Owner can see their own links, public can read for /v/:slug page
CREATE POLICY "Vent links: owners can do everything"
  ON public.vent_links
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Public can read vent_links (needed to render /v/:slug)
CREATE POLICY "Vent links: public can select"
  ON public.vent_links
  FOR SELECT
  USING (true);

-- Vent Messages policies
-- Public: can insert messages (send anonymous)
CREATE POLICY "Vent messages: public can insert"
  ON public.vent_messages
  FOR INSERT
  WITH CHECK (true);

-- Only owner can view their messages
CREATE POLICY "Vent messages: only owner can select"
  ON public.vent_messages
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = vent_messages.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

-- Only owner can update flags/read status
CREATE POLICY "Vent messages: only owner can update"
  ON public.vent_messages
  FOR UPDATE
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = vent_messages.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = vent_messages.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

-- Function to handle profile creation (can be called from client or trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used by a trigger, but we'll create profiles manually from the client
  -- to have more control over handle validation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vent_links_owner_id ON public.vent_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_vent_links_slug ON public.vent_links(slug);
CREATE INDEX IF NOT EXISTS idx_vent_messages_vent_link_id ON public.vent_messages(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_vent_messages_created_at ON public.vent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vent_messages_is_read ON public.vent_messages(is_read);

