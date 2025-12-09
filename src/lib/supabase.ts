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
  },
})

// Database types
export interface Profile {
  id: string
  handle: string
  display_name: string | null
  created_at: string
}

export interface VentLink {
  id: string
  owner_id: string
  slug: string
  title: string
  is_active: boolean
  created_at: string
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

