-- Message Folders Feature for GhostInbox
-- Run this in your Supabase SQL Editor

-- Message Folders table
CREATE TABLE IF NOT EXISTS public.message_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_name TEXT NOT NULL,
  color TEXT, -- Optional color for folder
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, folder_name)
);

-- Message Folder Assignments table
CREATE TABLE IF NOT EXISTS public.message_folder_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.vent_messages(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.message_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, folder_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_folders_owner_id ON public.message_folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_message_folder_assignments_message_id ON public.message_folder_assignments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_folder_assignments_folder_id ON public.message_folder_assignments(folder_id);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.message_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_folder_assignments ENABLE ROW LEVEL SECURITY;

-- Message Folders policies
DROP POLICY IF EXISTS "Message folders: owners can manage" ON public.message_folders;
CREATE POLICY "Message folders: owners can manage"
  ON public.message_folders
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Message Folder Assignments policies
DROP POLICY IF EXISTS "Message folder assignments: owners can manage" ON public.message_folder_assignments;
CREATE POLICY "Message folder assignments: owners can manage"
  ON public.message_folder_assignments
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.message_folders
      WHERE message_folders.id = message_folder_assignments.folder_id
        AND message_folders.owner_id = auth.uid()
    )
    AND EXISTS(
      SELECT 1 FROM public.vent_messages
      JOIN public.vent_links ON vent_links.id = vent_messages.vent_link_id
      WHERE vent_messages.id = message_folder_assignments.message_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.message_folders
      WHERE message_folders.id = message_folder_assignments.folder_id
        AND message_folders.owner_id = auth.uid()
    )
    AND EXISTS(
      SELECT 1 FROM public.vent_messages
      JOIN public.vent_links ON vent_links.id = vent_messages.vent_link_id
      WHERE vent_messages.id = message_folder_assignments.message_id
        AND vent_links.owner_id = auth.uid()
    )
  );

