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

    // Validate message body
    if (!messageBody || messageBody.trim().length === 0) {
      throw new Error('Message body is required')
    }

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'reply-templates',
        messageBody,
      },
    })

    if (error) {
      // Log detailed error in development
      if (import.meta.env.DEV) {
        console.error('Error calling OpenAI function:', {
          error,
          message: error.message,
          context: error.context,
          status: error.status,
        })
      }

      // Provide more specific error messages
      if (error.message?.includes('Function not found') || error.message?.includes('404')) {
        throw new Error('AI service is not available. Please ensure the Edge Function is deployed.')
      }
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
        throw new Error('Network error. Please check your connection and try again.')
      }

      if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        throw new Error('Authentication failed. Please log in again.')
      }

      throw new Error(error.message || 'Failed to generate replies')
    }

    if (!data) {
      throw new Error('No response from AI service. The function may not be deployed or configured correctly.')
    }

    if (!data.result) {
      throw new Error('AI service returned an empty response. Please try again.')
    }

    return data.result
  } catch (error: any) {
    // Log error securely (only in development)
    if (import.meta.env.DEV) {
      console.error('Error generating reply templates:', error)
    }
    
    // Re-throw if it's already a formatted error
    if (error?.message && (error.message.startsWith('AI service') || error.message.startsWith('Network') || error.message.startsWith('Authentication'))) {
      throw error
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

    // Validate messages array
    if (!messages || messages.length === 0) {
      throw new Error('No messages provided to summarize')
    }

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'theme-summary',
        messages: messages.slice(0, 20), // Limit to 20 messages
      },
    })

    if (error) {
      // Log detailed error in development
      if (import.meta.env.DEV) {
        console.error('Error calling OpenAI function:', {
          error,
          message: error.message,
          context: error.context,
          status: error.status,
        })
      }

      // Provide more specific error messages
      if (error.message?.includes('Function not found') || error.message?.includes('404')) {
        throw new Error('AI service is not available. Please ensure the Edge Function is deployed.')
      }
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
        throw new Error('Network error. Please check your connection and try again.')
      }

      if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        throw new Error('Authentication failed. Please log in again.')
      }

      throw new Error(error.message || 'Failed to generate summary')
    }

    if (!data) {
      throw new Error('No response from AI service. The function may not be deployed or configured correctly.')
    }

    if (!data.result) {
      throw new Error('AI service returned an empty response. Please try again.')
    }

    return data.result
  } catch (error: any) {
    // Log error securely (only in development)
    if (import.meta.env.DEV) {
      console.error('Error generating theme summary:', error)
    }
    
    // Re-throw if it's already a formatted error
    if (error?.message && error.message.startsWith('AI service') || error.message.startsWith('Network') || error.message.startsWith('Authentication')) {
      throw error
    }
    
    const errorMessage = error?.message || 'Unknown error occurred'
    throw new Error(`Failed to generate summary: ${errorMessage}`)
  }
}

