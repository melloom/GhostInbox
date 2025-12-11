-- Real-time Setup for GhostInbox
-- This file sets up Supabase Realtime for all tables that need live updates
-- Run this in your Supabase SQL Editor
--
-- IMPORTANT: Before running this file, make sure you have run:
-- 1. supabase/schema.sql (base schema)
-- 2. supabase/star_archive_schema.sql (adds is_starred and is_archived columns)
-- 3. supabase/polls_schema.sql (polls tables)
-- 4. supabase/features_schema.sql (message tags, notes, responses)
-- 5. supabase/message_folders_schema.sql (message folders)
-- 6. supabase/community_features_schema.sql (community features)
--
-- If you get errors about missing columns (like "is_starred"), run the schema files above first.

-- ============================================================================
-- 1) Trigger Functions for Broadcasting Changes
-- ============================================================================

-- Function for tables with direct vent_link_id
CREATE OR REPLACE FUNCTION public.broadcast_table_changes() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_vent_link_id TEXT;
BEGIN
  -- Get vent_link_id from NEW or OLD
  v_vent_link_id := COALESCE(
    (NEW.vent_link_id::text),
    (OLD.vent_link_id::text)
  );
  
  IF v_vent_link_id IS NOT NULL THEN
    PERFORM realtime.broadcast_changes(
      TG_ARGV[0] || v_vent_link_id,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function for message-related tables (message_tags, message_notes, etc.)
-- These have message_id that references vent_messages
CREATE OR REPLACE FUNCTION public.broadcast_message_table_changes() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_vent_link_id TEXT;
  v_message_id UUID;
BEGIN
  -- Get message_id from NEW or OLD
  v_message_id := COALESCE(
    CASE WHEN NEW IS NOT NULL THEN (NEW.message_id) ELSE NULL END,
    CASE WHEN OLD IS NOT NULL THEN (OLD.message_id) ELSE NULL END
  );
  
  -- Look up vent_link_id from vent_messages (only select vent_link_id, not all columns)
  IF v_message_id IS NOT NULL THEN
    BEGIN
      SELECT vent_link_id::text INTO v_vent_link_id
      FROM public.vent_messages
      WHERE id = v_message_id;
      
      IF v_vent_link_id IS NOT NULL THEN
        BEGIN
          PERFORM realtime.broadcast_changes(
            TG_ARGV[0] || v_vent_link_id,
            TG_OP,
            TG_OP,
            TG_TABLE_NAME,
            TG_TABLE_SCHEMA,
            NEW,
            OLD
          );
        EXCEPTION WHEN OTHERS THEN
          -- If broadcast fails, just return (don't fail the transaction)
          NULL;
        END;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If lookup fails, just return (don't fail the transaction)
      RETURN COALESCE(NEW, OLD);
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function for poll-related tables (poll_options, poll_votes)
-- These have poll_id that references polls
CREATE OR REPLACE FUNCTION public.broadcast_poll_table_changes() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_vent_link_id TEXT;
  v_poll_id UUID;
BEGIN
  -- Get poll_id from NEW or OLD
  v_poll_id := COALESCE(
    (NEW.poll_id),
    (OLD.poll_id)
  );
  
  -- Look up vent_link_id from polls
  IF v_poll_id IS NOT NULL THEN
    SELECT vent_link_id::text INTO v_vent_link_id
    FROM public.polls
    WHERE id = v_poll_id;
    
    IF v_vent_link_id IS NOT NULL THEN
      PERFORM realtime.broadcast_changes(
        TG_ARGV[0] || v_vent_link_id,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function for vote-related tables (vote_options, vote_responses)
-- These have vote_id that references community_votes
CREATE OR REPLACE FUNCTION public.broadcast_vote_table_changes() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_vent_link_id TEXT;
  v_vote_id UUID;
BEGIN
  -- Get vote_id from NEW or OLD
  v_vote_id := COALESCE(
    (NEW.vote_id),
    (OLD.vote_id)
  );
  
  -- Look up vent_link_id from community_votes
  IF v_vote_id IS NOT NULL THEN
    SELECT vent_link_id::text INTO v_vent_link_id
    FROM public.community_votes
    WHERE id = v_vote_id;
    
    IF v_vent_link_id IS NOT NULL THEN
      PERFORM realtime.broadcast_changes(
        TG_ARGV[0] || v_vent_link_id,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function for challenge-related tables (challenge_submissions)
-- These have challenge_id that references challenges
CREATE OR REPLACE FUNCTION public.broadcast_challenge_table_changes() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_vent_link_id TEXT;
  v_challenge_id UUID;
BEGIN
  -- Get challenge_id from NEW or OLD
  v_challenge_id := COALESCE(
    (NEW.challenge_id),
    (OLD.challenge_id)
  );
  
  -- Look up vent_link_id from challenges
  IF v_challenge_id IS NOT NULL THEN
    SELECT vent_link_id::text INTO v_vent_link_id
    FROM public.challenges
    WHERE id = v_challenge_id;
    
    IF v_vent_link_id IS NOT NULL THEN
      PERFORM realtime.broadcast_changes(
        TG_ARGV[0] || v_vent_link_id,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function for feedback-related tables (feedback_responses)
-- These have form_id that references feedback_forms
CREATE OR REPLACE FUNCTION public.broadcast_feedback_table_changes() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_vent_link_id TEXT;
  v_form_id UUID;
BEGIN
  -- Get form_id from NEW or OLD
  v_form_id := COALESCE(
    (NEW.form_id),
    (OLD.form_id)
  );
  
  -- Look up vent_link_id from feedback_forms
  IF v_form_id IS NOT NULL THEN
    SELECT vent_link_id::text INTO v_vent_link_id
    FROM public.feedback_forms
    WHERE id = v_form_id;
    
    IF v_vent_link_id IS NOT NULL THEN
      PERFORM realtime.broadcast_changes(
        TG_ARGV[0] || v_vent_link_id,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function for Q&A-related tables (qa_questions)
-- These have qa_session_id that references qa_sessions
CREATE OR REPLACE FUNCTION public.broadcast_qa_table_changes() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_vent_link_id TEXT;
  v_qa_session_id UUID;
BEGIN
  -- Get qa_session_id from NEW or OLD
  v_qa_session_id := COALESCE(
    (NEW.qa_session_id),
    (OLD.qa_session_id)
  );
  
  -- Look up vent_link_id from qa_sessions
  IF v_qa_session_id IS NOT NULL THEN
    SELECT vent_link_id::text INTO v_vent_link_id
    FROM public.qa_sessions
    WHERE id = v_qa_session_id;
    
    IF v_vent_link_id IS NOT NULL THEN
      PERFORM realtime.broadcast_changes(
        TG_ARGV[0] || v_vent_link_id,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function for project-related tables (project_contributions)
-- These have project_id that references collaborative_projects
CREATE OR REPLACE FUNCTION public.broadcast_project_table_changes() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_vent_link_id TEXT;
  v_project_id UUID;
BEGIN
  -- Get project_id from NEW or OLD
  v_project_id := COALESCE(
    (NEW.project_id),
    (OLD.project_id)
  );
  
  -- Look up vent_link_id from collaborative_projects
  IF v_project_id IS NOT NULL THEN
    SELECT vent_link_id::text INTO v_vent_link_id
    FROM public.collaborative_projects
    WHERE id = v_project_id;
    
    IF v_vent_link_id IS NOT NULL THEN
      PERFORM realtime.broadcast_changes(
        TG_ARGV[0] || v_vent_link_id,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 2) Triggers for vent_messages
-- ============================================================================

DROP TRIGGER IF EXISTS vent_messages_broadcast_trigger ON public.vent_messages;

CREATE TRIGGER vent_messages_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.vent_messages
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- ============================================================================
-- 3) Triggers for Polls System
-- ============================================================================

-- Polls table
DROP TRIGGER IF EXISTS polls_broadcast_trigger ON public.polls;

CREATE TRIGGER polls_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.polls
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- Poll options table
DROP TRIGGER IF EXISTS poll_options_broadcast_trigger ON public.poll_options;

CREATE TRIGGER poll_options_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.poll_options
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_poll_table_changes('room:vent_link:');

-- Poll votes table
DROP TRIGGER IF EXISTS poll_votes_broadcast_trigger ON public.poll_votes;

CREATE TRIGGER poll_votes_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.poll_votes
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_poll_table_changes('room:vent_link:');

-- ============================================================================
-- 4) Triggers for Message Features (Tags, Notes, Responses, Folders)
-- ============================================================================

-- Message tags table
DROP TRIGGER IF EXISTS message_tags_broadcast_trigger ON public.message_tags;

CREATE TRIGGER message_tags_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.message_tags
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_message_table_changes('room:vent_link:');

-- Message notes table
DROP TRIGGER IF EXISTS message_notes_broadcast_trigger ON public.message_notes;

CREATE TRIGGER message_notes_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.message_notes
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_message_table_changes('room:vent_link:');

-- Message responses table
DROP TRIGGER IF EXISTS message_responses_broadcast_trigger ON public.message_responses;

CREATE TRIGGER message_responses_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.message_responses
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_message_table_changes('room:vent_link:');

-- Message folder assignments table
DROP TRIGGER IF EXISTS message_folder_assignments_broadcast_trigger ON public.message_folder_assignments;

CREATE TRIGGER message_folder_assignments_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.message_folder_assignments
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_message_table_changes('room:vent_link:');

-- Message folders table (for folder management)
-- Note: message_folders doesn't have vent_link_id (it has owner_id), so we skip realtime for it
-- Folders are user-specific, not vent_link-specific, so they don't need realtime broadcasting per vent_link
-- If you need realtime for folders, you'd need to broadcast to user-specific channels instead

-- ============================================================================
-- 5) Triggers for Community Features
-- ============================================================================

-- Q&A Sessions
DROP TRIGGER IF EXISTS qa_sessions_broadcast_trigger ON public.qa_sessions;

CREATE TRIGGER qa_sessions_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.qa_sessions
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- Q&A Questions
DROP TRIGGER IF EXISTS qa_questions_broadcast_trigger ON public.qa_questions;

CREATE TRIGGER qa_questions_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.qa_questions
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_qa_table_changes('room:vent_link:');

-- Challenges
DROP TRIGGER IF EXISTS challenges_broadcast_trigger ON public.challenges;

CREATE TRIGGER challenges_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.challenges
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- Challenge Submissions
DROP TRIGGER IF EXISTS challenge_submissions_broadcast_trigger ON public.challenge_submissions;

CREATE TRIGGER challenge_submissions_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.challenge_submissions
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_challenge_table_changes('room:vent_link:');

-- Raffles
DROP TRIGGER IF EXISTS raffles_broadcast_trigger ON public.raffles;

CREATE TRIGGER raffles_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.raffles
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- Raffle Entries
DROP TRIGGER IF EXISTS raffle_entries_broadcast_trigger ON public.raffle_entries;

CREATE TRIGGER raffle_entries_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.raffle_entries
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_challenge_table_changes('room:vent_link:');

-- Community Votes
DROP TRIGGER IF EXISTS community_votes_broadcast_trigger ON public.community_votes;

CREATE TRIGGER community_votes_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.community_votes
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- Vote Options (for community votes)
DROP TRIGGER IF EXISTS vote_options_broadcast_trigger ON public.vote_options;

CREATE TRIGGER vote_options_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.vote_options
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_vote_table_changes('room:vent_link:');

-- Vote Responses (for community votes)
DROP TRIGGER IF EXISTS vote_responses_broadcast_trigger ON public.vote_responses;

CREATE TRIGGER vote_responses_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.vote_responses
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_vote_table_changes('room:vent_link:');

-- Feedback Forms
DROP TRIGGER IF EXISTS feedback_forms_broadcast_trigger ON public.feedback_forms;

CREATE TRIGGER feedback_forms_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.feedback_forms
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- Feedback Responses
DROP TRIGGER IF EXISTS feedback_responses_broadcast_trigger ON public.feedback_responses;

CREATE TRIGGER feedback_responses_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.feedback_responses
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_feedback_table_changes('room:vent_link:');

-- Community Highlights
DROP TRIGGER IF EXISTS community_highlights_broadcast_trigger ON public.community_highlights;

CREATE TRIGGER community_highlights_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.community_highlights
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- Message Reactions
DROP TRIGGER IF EXISTS message_reactions_broadcast_trigger ON public.message_reactions;

CREATE TRIGGER message_reactions_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.message_reactions
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_message_table_changes('room:vent_link:');

-- Community Goals
DROP TRIGGER IF EXISTS community_goals_broadcast_trigger ON public.community_goals;

CREATE TRIGGER community_goals_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.community_goals
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- Community Events
DROP TRIGGER IF EXISTS community_events_broadcast_trigger ON public.community_events;

CREATE TRIGGER community_events_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.community_events
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- Collaborative Projects
DROP TRIGGER IF EXISTS collaborative_projects_broadcast_trigger ON public.collaborative_projects;

CREATE TRIGGER collaborative_projects_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.collaborative_projects
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_table_changes('room:vent_link:');

-- Project Contributions
DROP TRIGGER IF EXISTS project_contributions_broadcast_trigger ON public.project_contributions;

CREATE TRIGGER project_contributions_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.project_contributions
  FOR EACH ROW 
  EXECUTE FUNCTION public.broadcast_project_table_changes('room:vent_link:');

-- ============================================================================
-- 6) Performance Indexes for Real-time Queries
-- ============================================================================

-- Core message indexes
CREATE INDEX IF NOT EXISTS idx_vent_messages_vent_link_id ON public.vent_messages(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_vent_messages_created_at ON public.vent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vent_messages_is_read ON public.vent_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_vent_messages_is_starred ON public.vent_messages(is_starred);
CREATE INDEX IF NOT EXISTS idx_vent_messages_is_archived ON public.vent_messages(is_archived);

-- Poll indexes
CREATE INDEX IF NOT EXISTS idx_polls_vent_link_id ON public.polls(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_polls_is_active ON public.polls(is_active);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON public.poll_votes(option_id);

-- Message feature indexes
CREATE INDEX IF NOT EXISTS idx_message_tags_message_id ON public.message_tags(message_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_tag_name ON public.message_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_message_notes_message_id ON public.message_notes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_notes_owner_id ON public.message_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_message_responses_message_id ON public.message_responses(message_id);
CREATE INDEX IF NOT EXISTS idx_message_responses_owner_id ON public.message_responses(owner_id);
CREATE INDEX IF NOT EXISTS idx_message_folder_assignments_message_id ON public.message_folder_assignments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_folder_assignments_folder_id ON public.message_folder_assignments(folder_id);
CREATE INDEX IF NOT EXISTS idx_message_folders_owner_id ON public.message_folders(owner_id);

-- Community feature indexes
CREATE INDEX IF NOT EXISTS idx_qa_sessions_vent_link_id ON public.qa_sessions(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_qa_questions_qa_session_id ON public.qa_questions(qa_session_id);
CREATE INDEX IF NOT EXISTS idx_challenges_vent_link_id ON public.challenges(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge_id ON public.challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_raffles_vent_link_id ON public.raffles(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_raffles_is_active ON public.raffles(is_active);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_raffle_id ON public.raffle_entries(raffle_id);
CREATE INDEX IF NOT EXISTS idx_community_votes_vent_link_id ON public.community_votes(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_vote_options_vote_id ON public.vote_options(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_responses_vote_id ON public.vote_responses(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_responses_option_id ON public.vote_responses(option_id);
CREATE INDEX IF NOT EXISTS idx_feedback_forms_vent_link_id ON public.feedback_forms(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_form_id ON public.feedback_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_community_highlights_vent_link_id ON public.community_highlights(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_community_goals_vent_link_id ON public.community_goals(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_community_events_vent_link_id ON public.community_events(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_projects_vent_link_id ON public.collaborative_projects(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_project_contributions_project_id ON public.project_contributions(project_id);

-- ============================================================================
-- 7) Realtime Messages RLS Policies
-- ============================================================================

-- Ensure realtime.messages table has RLS enabled
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions first
REVOKE ALL ON realtime.messages FROM PUBLIC;

-- Allow authenticated users to SELECT from topics for vent_link rooms (read)
DROP POLICY IF EXISTS "authenticated_can_select_room" ON realtime.messages;

CREATE POLICY "authenticated_can_select_room" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    topic LIKE 'room:vent_link:%'
  );

-- Allow authenticated users to INSERT into topics for vent_link rooms (write)
DROP POLICY IF EXISTS "authenticated_can_insert_room" ON realtime.messages;

CREATE POLICY "authenticated_can_insert_room" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    topic LIKE 'room:vent_link:%'
  );

-- ============================================================================
-- 8) Grant Permissions
-- ============================================================================

-- Grant minimal rights to authenticated role to insert/select on realtime.messages
GRANT SELECT, INSERT ON realtime.messages TO authenticated;

-- ============================================================================
-- 9) Enable Realtime for Tables
-- ============================================================================

-- Note: Supabase Realtime uses PostgreSQL's logical replication
-- These commands add tables to the supabase_realtime publication
-- If you get permission errors, you may need to run these via the Supabase Dashboard
-- under Database > Replication, or ensure you have the right permissions

-- Core tables
-- Note: ALTER PUBLICATION doesn't support IF NOT EXISTS
-- We'll use exception handling to ignore errors if tables are already in the publication
-- Alternatively, you can enable Realtime for these tables via Supabase Dashboard > Database > Replication

DO $$
BEGIN
  -- Core message and poll tables
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.vent_messages;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Message feature tables
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_tags;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_notes;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_responses;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_folders;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_folder_assignments;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Community feature tables
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_sessions;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_questions;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_submissions;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.raffles;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.raffle_entries;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.community_votes;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.vote_options;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.vote_responses;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_forms;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_responses;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.community_highlights;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.community_goals;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.community_events;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborative_projects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.project_contributions;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. This script sets up real-time broadcasting for all tables that need live updates
-- 2. The trigger function uses 'room:vent_link:{vent_link_id}' as the topic pattern
-- 3. All triggers broadcast INSERT, UPDATE, and DELETE operations
-- 4. RLS policies ensure only authenticated users can access realtime messages
-- 5. Indexes are created to optimize real-time query performance
-- 6. Make sure to enable Realtime in Supabase Dashboard for these tables if needed
-- 7. The publication commands may need to be run separately if you get permission errors
-- ============================================================================

