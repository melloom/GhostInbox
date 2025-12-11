import { createClient } from '@supabase/supabase-js'

// Replace these with your Supabase project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  // Only warn in development
  if (import.meta.env.DEV) {
  console.warn('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'ghost-inbox-auth',
  },
  global: {
    headers: {
      'x-client-info': 'ghost-inbox@1.0.0',
    },
  },
})

// Suppress expected 403 errors from RLS policies
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args)
      // Don't log 403 errors as they're expected from RLS policies
      if (response.status === 403 && import.meta.env.DEV) {
        // Silently handle 403s - they're expected for RLS policies
        return response
      }
      return response
    } catch (error: any) {
      // Suppress 403 errors in promise rejections
      if (error?.code === 403 || error?.status === 403) {
        // Return a mock response to prevent unhandled promise rejection
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw error
    }
  }
}

// Database types
export interface Profile {
  id: string
  handle: string
  display_name: string | null
  handle_changed: boolean
  created_at: string
}

export interface VentLink {
  id: string
  owner_id: string
  slug: string
  title: string
  is_active: boolean
  created_at: string
  // Customization fields
  logo_url?: string | null
  background_color?: string | null
  background_image_url?: string | null
  accent_color?: string | null
  custom_links?: Array<{ label: string; url: string; icon?: string }> | null
  custom_css?: string | null
  header_text?: string | null
  description?: string | null
}

export interface VentMessage {
  id: string
  vent_link_id: string
  body: string
  mood: string | null
  ip_hash: string | null
  created_at: string
  is_read: boolean
  is_flagged: boolean
  is_starred?: boolean
  is_archived?: boolean
}

export interface VentSummary {
  id: string
  owner_id: string
  time_range: string
  summary: string
  created_at: string
}

export interface Poll {
  id: string
  vent_link_id: string
  question: string
  description: string | null
  is_active: boolean
  created_at: string
  expires_at: string | null
  max_votes: number | null
}

export interface PollOption {
  id: string
  poll_id: string
  option_text: string
  display_order: number
  created_at: string
}

export interface PollVote {
  id: string
  poll_id: string
  option_id: string
  ip_hash: string | null
  created_at: string
}

export interface PollWithOptions extends Poll {
  options: PollOption[]
  vote_counts?: { [optionId: string]: number }
  total_votes?: number
}

export interface MessageTag {
  id: string
  message_id: string
  tag_name: string
  created_at: string
}

export interface MessageNote {
  id: string
  message_id: string
  owner_id: string
  note_text: string
  created_at: string
  updated_at: string
}

export interface MessageResponse {
  id: string
  message_id: string
  owner_id: string
  response_text: string
  is_sent: boolean
  created_at: string
  updated_at: string
}

export interface ResponseTemplate {
  id: string
  owner_id: string
  template_name: string
  template_text: string
  category: string | null
  created_at: string
  updated_at: string
}

export interface MessageFolder {
  id: string
  owner_id: string
  folder_name: string
  color: string | null
  created_at: string
  updated_at: string
}

export interface MessageFolderAssignment {
  id: string
  message_id: string
  folder_id: string
  created_at: string
}

export interface PollTemplate {
  id: string
  owner_id: string
  template_name: string
  question: string
  options: string[]
  created_at: string
  updated_at: string
}

// Community Engagement Features Types
export interface QASession {
  id: string
  vent_link_id: string
  title: string
  description: string | null
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

export interface QAQuestion {
  id: string
  qa_session_id: string
  question_text: string
  ip_hash: string | null
  is_answered: boolean
  answer_text: string | null
  answered_at: string | null
  created_at: string
}

export interface Challenge {
  id: string
  vent_link_id: string
  title: string
  description: string | null
  challenge_type: 'contest' | 'giveaway' | 'challenge'
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  prize_description: string | null
  rules: string | null
  created_at: string
}

export interface ChallengeSubmission {
  id: string
  challenge_id: string
  submission_text: string
  ip_hash: string | null
  is_winner: boolean
  created_at: string
}

export interface Raffle {
  id: string
  vent_link_id: string
  title: string
  description: string | null
  prize_description: string | null
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  draw_at: string | null
  winner_count: number
  is_drawn: boolean
  created_at: string
}

export interface RaffleEntry {
  id: string
  raffle_id: string
  entry_name: string
  ip_hash: string | null
  is_winner: boolean
  created_at: string
}

export interface CommunityVote {
  id: string
  vent_link_id: string
  title: string
  description: string | null
  is_active: boolean
  ends_at: string | null
  created_at: string
}

export interface VoteOption {
  id: string
  vote_id: string
  option_text: string
  display_order: number
  created_at: string
}

export interface VoteResponse {
  id: string
  vote_id: string
  option_id: string
  ip_hash: string | null
  created_at: string
}

export interface CommunityVoteWithOptions extends CommunityVote {
  options: VoteOption[]
  vote_counts?: { [optionId: string]: number }
  total_votes?: number
}

export interface FeedbackForm {
  id: string
  vent_link_id: string
  title: string
  description: string | null
  form_type: 'survey' | 'feedback' | 'feature_request'
  is_active: boolean
  created_at: string
}

export interface FeedbackResponse {
  id: string
  form_id: string
  response_text: string
  ip_hash: string | null
  created_at: string
}

export interface CommunityHighlight {
  id: string
  vent_link_id: string
  message_id: string | null
  title: string | null
  highlight_text: string | null
  is_featured: boolean
  display_order: number
  created_at: string
}

export interface MessageReaction {
  id: string
  message_id: string
  reaction_type: string
  ip_hash: string | null
  created_at: string
}

export interface CommunityGoal {
  id: string
  vent_link_id: string
  title: string
  description: string | null
  goal_type: 'messages' | 'engagement' | 'polls' | 'custom'
  target_value: number
  current_value: number
  is_active: boolean
  deadline: string | null
  created_at: string
}

export interface CommunityEvent {
  id: string
  vent_link_id: string
  title: string
  description: string | null
  event_type: 'event' | 'announcement' | 'update'
  event_date: string | null
  is_pinned: boolean
  is_active: boolean
  created_at: string
}

export interface CollaborativeProject {
  id: string
  vent_link_id: string
  title: string
  description: string | null
  project_type: 'idea' | 'project' | 'collaboration'
  is_active: boolean
  created_at: string
}

export interface ProjectContribution {
  id: string
  project_id: string
  contribution_text: string
  ip_hash: string | null
  created_at: string
}

