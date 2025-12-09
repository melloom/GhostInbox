-- Community Engagement Features Schema for GhostInbox
-- Run this in your Supabase SQL Editor

-- ==================== Q&A / AMA Sessions ====================
CREATE TABLE IF NOT EXISTS public.qa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qa_session_id UUID NOT NULL REFERENCES public.qa_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  ip_hash TEXT,
  is_answered BOOLEAN DEFAULT false,
  answer_text TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Challenges & Contests ====================
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL, -- 'contest', 'giveaway', 'challenge'
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  prize_description TEXT,
  rules TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  submission_text TEXT NOT NULL,
  ip_hash TEXT,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Raffles ====================
CREATE TABLE IF NOT EXISTS public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  prize_description TEXT,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  draw_at TIMESTAMPTZ,
  winner_count INTEGER DEFAULT 1,
  is_drawn BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  entry_name TEXT NOT NULL,
  ip_hash TEXT,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(raffle_id, ip_hash)
);

-- ==================== Community Voting ====================
CREATE TABLE IF NOT EXISTS public.community_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES public.community_votes(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES public.community_votes(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.vote_options(id) ON DELETE CASCADE,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vote_id, ip_hash)
);

-- ==================== Feedback Forms ====================
CREATE TABLE IF NOT EXISTS public.feedback_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  form_type TEXT NOT NULL, -- 'survey', 'feedback', 'feature_request'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.feedback_forms(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Community Highlights ====================
CREATE TABLE IF NOT EXISTS public.community_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.vent_messages(id) ON DELETE CASCADE,
  title TEXT,
  highlight_text TEXT,
  is_featured BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Live Reactions ====================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.vent_messages(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL, -- '❤️', '👍', '🎉', '🔥', etc.
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, reaction_type, ip_hash)
);

-- ==================== Community Goals ====================
CREATE TABLE IF NOT EXISTS public.community_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL, -- 'messages', 'engagement', 'polls', 'custom'
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Events & Announcements ====================
CREATE TABLE IF NOT EXISTS public.community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL, -- 'event', 'announcement', 'update'
  event_date TIMESTAMPTZ,
  is_pinned BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Community Wall ====================
-- Uses community_highlights table for featured messages
-- Additional settings stored in vent_links or separate config

-- ==================== Collaborative Projects ====================
CREATE TABLE IF NOT EXISTS public.collaborative_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_link_id UUID NOT NULL REFERENCES public.vent_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL, -- 'idea', 'project', 'collaboration'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.collaborative_projects(id) ON DELETE CASCADE,
  contribution_text TEXT NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Indexes ====================
CREATE INDEX IF NOT EXISTS idx_qa_sessions_vent_link_id ON public.qa_sessions(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_qa_sessions_is_active ON public.qa_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_qa_questions_qa_session_id ON public.qa_questions(qa_session_id);
CREATE INDEX IF NOT EXISTS idx_challenges_vent_link_id ON public.challenges(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_challenges_is_active ON public.challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge_id ON public.challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_raffles_vent_link_id ON public.raffles(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_raffles_is_active ON public.raffles(is_active);
CREATE INDEX IF NOT EXISTS idx_raffles_is_drawn ON public.raffles(is_drawn);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_raffle_id ON public.raffle_entries(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_is_winner ON public.raffle_entries(is_winner);
CREATE INDEX IF NOT EXISTS idx_community_votes_vent_link_id ON public.community_votes(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_community_votes_is_active ON public.community_votes(is_active);
CREATE INDEX IF NOT EXISTS idx_vote_options_vote_id ON public.vote_options(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_responses_vote_id ON public.vote_responses(vote_id);
CREATE INDEX IF NOT EXISTS idx_feedback_forms_vent_link_id ON public.feedback_forms(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_form_id ON public.feedback_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_community_highlights_vent_link_id ON public.community_highlights(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_community_highlights_is_featured ON public.community_highlights(is_featured);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_community_goals_vent_link_id ON public.community_goals(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_community_goals_is_active ON public.community_goals(is_active);
CREATE INDEX IF NOT EXISTS idx_community_events_vent_link_id ON public.community_events(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_community_events_is_active ON public.community_events(is_active);
CREATE INDEX IF NOT EXISTS idx_collaborative_projects_vent_link_id ON public.collaborative_projects(vent_link_id);
CREATE INDEX IF NOT EXISTS idx_project_contributions_project_id ON public.project_contributions(project_id);

-- ==================== Row Level Security (RLS) ====================

-- Enable RLS on all tables
ALTER TABLE public.qa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_contributions ENABLE ROW LEVEL SECURITY;

-- Q&A Sessions policies
DROP POLICY IF EXISTS "QA sessions: owners can manage" ON public.qa_sessions;
CREATE POLICY "QA sessions: owners can manage"
  ON public.qa_sessions
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = qa_sessions.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = qa_sessions.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "QA questions: public can insert, owners can manage" ON public.qa_questions;
DROP POLICY IF EXISTS "QA questions: public can insert" ON public.qa_questions;
DROP POLICY IF EXISTS "QA questions: owners can manage" ON public.qa_questions;
DROP POLICY IF EXISTS "QA questions: public can select active" ON public.qa_questions;

CREATE POLICY "QA questions: public can insert"
  ON public.qa_questions
  FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.qa_sessions
      JOIN public.vent_links ON vent_links.id = qa_sessions.vent_link_id
      WHERE qa_sessions.id = qa_questions.qa_session_id
        AND qa_sessions.is_active = true
    )
  );

CREATE POLICY "QA questions: owners can manage"
  ON public.qa_questions
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.qa_sessions
      JOIN public.vent_links ON vent_links.id = qa_sessions.vent_link_id
      WHERE qa_sessions.id = qa_questions.qa_session_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.qa_sessions
      JOIN public.vent_links ON vent_links.id = qa_sessions.vent_link_id
      WHERE qa_sessions.id = qa_questions.qa_session_id
        AND vent_links.owner_id = auth.uid()
    )
  );

CREATE POLICY "QA questions: public can select active"
  ON public.qa_questions
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.qa_sessions
      WHERE qa_sessions.id = qa_questions.qa_session_id
        AND qa_sessions.is_active = true
    )
  );

-- Challenges policies
DROP POLICY IF EXISTS "Challenges: owners can manage" ON public.challenges;
CREATE POLICY "Challenges: owners can manage"
  ON public.challenges
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = challenges.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = challenges.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Challenge submissions: public can insert, owners can manage" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Challenge submissions: public can insert" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Challenge submissions: owners can manage" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Challenge submissions: public can select active" ON public.challenge_submissions;

CREATE POLICY "Challenge submissions: public can insert"
  ON public.challenge_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.challenges
      WHERE challenges.id = challenge_submissions.challenge_id
        AND challenges.is_active = true
    )
  );

CREATE POLICY "Challenge submissions: owners can manage"
  ON public.challenge_submissions
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.challenges
      JOIN public.vent_links ON vent_links.id = challenges.vent_link_id
      WHERE challenges.id = challenge_submissions.challenge_id
        AND vent_links.owner_id = auth.uid()
    )
  );

CREATE POLICY "Challenge submissions: public can select active"
  ON public.challenge_submissions
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.challenges
      WHERE challenges.id = challenge_submissions.challenge_id
        AND challenges.is_active = true
    )
  );

-- Raffles policies
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Raffles: owners can manage" ON public.raffles;
CREATE POLICY "Raffles: owners can manage"
  ON public.raffles
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = raffles.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = raffles.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Raffles: public can select active" ON public.raffles;
CREATE POLICY "Raffles: public can select active"
  ON public.raffles
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = raffles.vent_link_id
    )
  );

DROP POLICY IF EXISTS "Raffle entries: owners can manage" ON public.raffle_entries;
CREATE POLICY "Raffle entries: owners can manage"
  ON public.raffle_entries
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.raffles
      JOIN public.vent_links ON vent_links.id = raffles.vent_link_id
      WHERE raffles.id = raffle_entries.raffle_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.raffles
      JOIN public.vent_links ON vent_links.id = raffles.vent_link_id
      WHERE raffles.id = raffle_entries.raffle_id
        AND vent_links.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Raffle entries: public can insert for active" ON public.raffle_entries;
CREATE POLICY "Raffle entries: public can insert for active"
  ON public.raffle_entries
  FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.raffles
      WHERE raffles.id = raffle_entries.raffle_id
        AND raffles.is_active = true
        AND raffles.is_drawn = false
    )
  );

DROP POLICY IF EXISTS "Raffle entries: public can select" ON public.raffle_entries;
CREATE POLICY "Raffle entries: public can select"
  ON public.raffle_entries
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.raffles
      WHERE raffles.id = raffle_entries.raffle_id
    )
  );

-- Community Votes policies (similar to polls)
DROP POLICY IF EXISTS "Community votes: owners can manage" ON public.community_votes;
CREATE POLICY "Community votes: owners can manage"
  ON public.community_votes
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = community_votes.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = community_votes.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vote options: owners can manage, public can select active" ON public.vote_options;
DROP POLICY IF EXISTS "Vote options: owners can manage" ON public.vote_options;
DROP POLICY IF EXISTS "Vote options: public can select active" ON public.vote_options;

CREATE POLICY "Vote options: owners can manage"
  ON public.vote_options
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.community_votes
      JOIN public.vent_links ON vent_links.id = community_votes.vent_link_id
      WHERE community_votes.id = vote_options.vote_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.community_votes
      JOIN public.vent_links ON vent_links.id = community_votes.vent_link_id
      WHERE community_votes.id = vote_options.vote_id
        AND vent_links.owner_id = auth.uid()
    )
  );

CREATE POLICY "Vote options: public can select active"
  ON public.vote_options
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.community_votes
      WHERE community_votes.id = vote_options.vote_id
        AND community_votes.is_active = true
    )
  );

DROP POLICY IF EXISTS "Vote responses: public can insert, owners can select" ON public.vote_responses;
DROP POLICY IF EXISTS "Vote responses: public can insert" ON public.vote_responses;
DROP POLICY IF EXISTS "Vote responses: owners can select" ON public.vote_responses;

CREATE POLICY "Vote responses: public can insert"
  ON public.vote_responses
  FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.community_votes
      WHERE community_votes.id = vote_responses.vote_id
        AND community_votes.is_active = true
    )
  );

CREATE POLICY "Vote responses: owners can select"
  ON public.vote_responses
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.community_votes
      JOIN public.vent_links ON vent_links.id = community_votes.vent_link_id
      WHERE community_votes.id = vote_responses.vote_id
        AND vent_links.owner_id = auth.uid()
    )
  );

-- Feedback Forms policies
DROP POLICY IF EXISTS "Feedback forms: owners can manage" ON public.feedback_forms;
CREATE POLICY "Feedback forms: owners can manage"
  ON public.feedback_forms
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = feedback_forms.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = feedback_forms.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Feedback responses: public can insert, owners can select" ON public.feedback_responses;
DROP POLICY IF EXISTS "Feedback responses: public can insert" ON public.feedback_responses;
DROP POLICY IF EXISTS "Feedback responses: owners can select" ON public.feedback_responses;

CREATE POLICY "Feedback responses: public can insert"
  ON public.feedback_responses
  FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.feedback_forms
      WHERE feedback_forms.id = feedback_responses.form_id
        AND feedback_forms.is_active = true
    )
  );

CREATE POLICY "Feedback responses: owners can select"
  ON public.feedback_responses
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.feedback_forms
      JOIN public.vent_links ON vent_links.id = feedback_forms.vent_link_id
      WHERE feedback_forms.id = feedback_responses.form_id
        AND vent_links.owner_id = auth.uid()
    )
  );

-- Community Highlights policies
DROP POLICY IF EXISTS "Community highlights: owners can manage" ON public.community_highlights;
CREATE POLICY "Community highlights: owners can manage"
  ON public.community_highlights
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = community_highlights.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = community_highlights.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Community highlights: public can select featured" ON public.community_highlights;
CREATE POLICY "Community highlights: public can select featured"
  ON public.community_highlights
  FOR SELECT
  USING (is_featured = true);

-- Message Reactions policies
DROP POLICY IF EXISTS "Message reactions: public can insert and select" ON public.message_reactions;
DROP POLICY IF EXISTS "Message reactions: public can insert" ON public.message_reactions;
DROP POLICY IF EXISTS "Message reactions: public can select" ON public.message_reactions;
DROP POLICY IF EXISTS "Message reactions: owners can delete" ON public.message_reactions;

CREATE POLICY "Message reactions: public can insert"
  ON public.message_reactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Message reactions: public can select"
  ON public.message_reactions
  FOR SELECT
  USING (true);

CREATE POLICY "Message reactions: owners can delete"
  ON public.message_reactions
  FOR DELETE
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_messages
      JOIN public.vent_links ON vent_links.id = vent_messages.vent_link_id
      WHERE vent_messages.id = message_reactions.message_id
        AND vent_links.owner_id = auth.uid()
    )
  );

-- Community Goals policies
DROP POLICY IF EXISTS "Community goals: owners can manage" ON public.community_goals;
CREATE POLICY "Community goals: owners can manage"
  ON public.community_goals
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = community_goals.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = community_goals.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Community goals: public can select active" ON public.community_goals;
CREATE POLICY "Community goals: public can select active"
  ON public.community_goals
  FOR SELECT
  USING (is_active = true);

-- Community Events policies
DROP POLICY IF EXISTS "Community events: owners can manage" ON public.community_events;
CREATE POLICY "Community events: owners can manage"
  ON public.community_events
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = community_events.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = community_events.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Community events: public can select active" ON public.community_events;
CREATE POLICY "Community events: public can select active"
  ON public.community_events
  FOR SELECT
  USING (is_active = true);

-- Collaborative Projects policies
DROP POLICY IF EXISTS "Collaborative projects: owners can manage" ON public.collaborative_projects;
CREATE POLICY "Collaborative projects: owners can manage"
  ON public.collaborative_projects
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = collaborative_projects.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.vent_links
      WHERE vent_links.id = collaborative_projects.vent_link_id
        AND vent_links.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Project contributions: public can insert, owners can select" ON public.project_contributions;
DROP POLICY IF EXISTS "Project contributions: public can insert" ON public.project_contributions;
DROP POLICY IF EXISTS "Project contributions: owners can select" ON public.project_contributions;

CREATE POLICY "Project contributions: public can insert"
  ON public.project_contributions
  FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.collaborative_projects
      WHERE collaborative_projects.id = project_contributions.project_id
        AND collaborative_projects.is_active = true
    )
  );

CREATE POLICY "Project contributions: owners can select"
  ON public.project_contributions
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.collaborative_projects
      JOIN public.vent_links ON vent_links.id = collaborative_projects.vent_link_id
      WHERE collaborative_projects.id = project_contributions.project_id
        AND vent_links.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project contributions: public can select active"
  ON public.project_contributions
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.collaborative_projects
      WHERE collaborative_projects.id = project_contributions.project_id
        AND collaborative_projects.is_active = true
    )
  );

