import { supabase } from './supabase'

/**
 * Generate 3 reply templates for an anonymous vent message
 * Now uses Supabase Edge Function to keep API key secure
 */
export async function generateReplyTemplates(messageBody: string): Promise<string> {
  try {
    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('You must be logged in to use AI features')
    }

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'reply-templates',
        messageBody,
      },
    })

    if (error) {
      // Log error securely (only in development)
      if (import.meta.env.DEV) {
        console.error('Error calling OpenAI function:', error)
      }
      throw new Error(error.message || 'Failed to generate replies')
    }

    if (!data || !data.result) {
      throw new Error('No response from AI service')
    }

    return data.result
  } catch (error: any) {
    // Log error securely (only in development)
    if (import.meta.env.DEV) {
      console.error('Error generating reply templates:', error)
    }
    const errorMessage = error?.message || 'Unknown error occurred'
    throw new Error(`Failed to generate replies: ${errorMessage}`)
  }
}

/**
 * Summarize themes from the last 20 messages and provide self-care reminders
 * Now uses Supabase Edge Function to keep API key secure
 */
export async function summarizeThemes(messages: string[]): Promise<string> {
  try {
    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('You must be logged in to use AI features')
    }

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'theme-summary',
        messages: messages.slice(0, 20), // Limit to 20 messages
      },
    })

    if (error) {
      // Log error securely (only in development)
      if (import.meta.env.DEV) {
        console.error('Error calling OpenAI function:', error)
      }
      throw new Error(error.message || 'Failed to generate summary')
    }

    if (!data || !data.result) {
      throw new Error('No response from AI service')
    }

    return data.result
  } catch (error: any) {
    // Log error securely (only in development)
    if (import.meta.env.DEV) {
      console.error('Error generating theme summary:', error)
    }
    const errorMessage = error?.message || 'Unknown error occurred'
    throw new Error(`Failed to generate summary: ${errorMessage}`)
  }
}

