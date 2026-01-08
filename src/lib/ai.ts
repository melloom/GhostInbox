import { supabase } from './supabase'

/**
 * Verify that an Edge Function is accessible
 */
async function verifyFunctionAccessible(functionName: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false
    
    // Try a minimal request to check if function exists
    const { error } = await supabase.functions.invoke(functionName, {
      body: { type: 'test' },
    })
    
    // If we get a 404 or "not found", function doesn't exist
    // If we get other errors (auth, validation), function exists but request was invalid
    return !error?.message?.includes('not found') && !error?.message?.includes('404')
  } catch {
    return false
  }
}

/**
 * Generate 3 reply templates for an anonymous vent message
 * Now uses Supabase Edge Function to keep API key secure
 */
export async function generateReplyTemplates(messageBody: string): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('You must be logged in to use AI features')
    }

    if (!messageBody || messageBody.trim().length === 0) {
      throw new Error('Message body is required')
    }

    // Diagnostic logging
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('Missing VITE_SUPABASE_URL environment variable')
      throw new Error('Supabase configuration is missing. Please check your .env file.')
    }

    console.log('Calling Edge Function:', {
      functionName: 'openai-ai',
      supabaseUrl: supabaseUrl.substring(0, 30) + '...',
      hasSession: !!session,
      sessionUserId: session?.user?.id
    })

    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'reply-templates',
        messageBody,
      },
    })

    if (error) {
      console.error('Error calling OpenAI function:', {
        error,
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
        fullError: JSON.stringify(error, null, 2),
        responseData: data
      })
      
      // Check response data for quota errors (Edge Function returns error in data)
      // Be specific to avoid false positives
      if (data?.error && (
          data.error.includes('insufficient_quota') ||
          data.error.includes('quota exceeded') ||
          data.error.includes('exceeded your quota') ||
          (data.error.includes('billing') && data.error.includes('quota'))
        )) {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits at https://platform.openai.com/usage')
      }
      
      // Check for specific error types
      if (error.message?.includes('Function not found') || 
          error.message?.includes('404') || 
          error.message?.includes('not found')) {
        throw new Error('AI service is not available. Please ensure the Edge Function "openai-ai" is deployed in Supabase.')
      }
      
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('network') ||
          error.message?.includes('Failed to send') ||
          error.message?.includes('Network error') ||
          error.message?.includes('Failed to send a request') ||
          error.name === 'TypeError') {
        // Provide more specific guidance
        console.error('Network error details:', {
          error,
          errorName: error.name,
          errorMessage: error.message,
          functionName: 'openai-ai',
          hasSession: !!session,
          supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'
        })
        
        // Check if it's a CORS or URL issue
        if (error.message?.includes('CORS') || error.message?.includes('cross-origin')) {
          throw new Error('CORS error: The Edge Function may not be properly configured. Please check your Supabase project settings.')
        }
        
        throw new Error(`Network error connecting to AI service. Please check: 1) Your internet connection, 2) Edge Function "openai-ai" is deployed (Supabase Dashboard → Edge Functions), 3) You are logged in, 4) OPENAI_API_KEY is set in Edge Function secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets). Error: ${error.message || error.name || 'Unknown'}`)
      }
      
      if (error.message?.includes('Unauthorized') || 
          error.message?.includes('401') ||
          error.message?.includes('Missing authorization')) {
        throw new Error('Authentication failed. Please log in again.')
      }
      
      if (error.message?.includes('OpenAI API key not configured') ||
          error.message?.includes('500')) {
        throw new Error('AI service configuration error: OPENAI_API_KEY is not set in Edge Function secrets. Please go to Supabase Dashboard → Project Settings → Edge Functions → Secrets and add OPENAI_API_KEY.')
      }
      
      // Check for quota errors - be specific to avoid false positives
      if (error.message?.includes('insufficient_quota') ||
          error.message?.includes('quota exceeded') ||
          error.message?.includes('exceeded your quota') ||
          (error.message?.includes('billing') && error.message?.includes('quota'))) {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits at https://platform.openai.com/usage')
      }
      
      // Generic error with more context
      const errorMsg = error.message || data?.error || 'Unknown error occurred'
      throw new Error(`Failed to generate replies: ${errorMsg}`)
    }

    if (!data) {
      throw new Error('AI service returned no data. Please try again.')
    }

    if (!data.result) {
      throw new Error('AI service returned an empty response. Please try again.')
    }

    return data.result
  } catch (error: any) {
    console.error('Error generating reply templates:', error)
    
    // Re-throw if it's already a formatted error
    if (error?.message && (
      error.message.startsWith('AI service') || 
      error.message.startsWith('Network') || 
      error.message.startsWith('Authentication') ||
      error.message.startsWith('Failed to generate replies')
    )) {
      throw error
    }
    
    // Format unknown errors
    throw new Error(`Failed to generate replies: ${error?.message || 'Unknown error occurred'}`)
  }
}

/**
 * Summarize themes from the last 20 messages and provide self-care reminders
 */
export async function summarizeThemes(messages: string[]): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('You must be logged in to use AI features')
    }

    if (!messages || messages.length === 0) {
      throw new Error('No messages provided to summarize')
    }

    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'theme-summary',
        messages: messages.slice(0, 20),
      },
    })

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error calling OpenAI function:', error)
      }
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

    if (!data?.result) {
      throw new Error('AI service returned an empty response. Please try again.')
    }

    return data.result
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('Error generating theme summary:', error)
    }
    if (error?.message && (error.message.startsWith('AI service') || error.message.startsWith('Network') || error.message.startsWith('Authentication'))) {
      throw error
    }
    throw new Error(`Failed to generate summary: ${error?.message || 'Unknown error occurred'}`)
  }
}

/**
 * Enhanced Moderation - Multi-layer analysis with context awareness
 */
export interface ModerationResult {
  flagged: boolean
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
  combined_score: number
  baseline_score: number
  categories: Record<string, boolean>
  category_scores: Record<string, number>
  self_harm: {
    risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical'
    reasoning: string
    requires_immediate_attention: boolean
    crisis_resources_needed: boolean
    specific_indicators: string[]
    recommended_action: 'none' | 'monitor' | 'alert' | 'intervene'
  }
  moderation_score: number
  layers?: {
    baseline_moderation: any
    advanced_analysis: any
    self_harm: any
    spam_detection: any
    threat_detection: any
  }
  requires_human_review?: boolean
  recommended_action?: string
  false_positive_risk?: 'low' | 'medium' | 'high'
  should_block?: boolean
  block_reason?: string | null
}

export async function moderateMessage(
  messageBody: string,
  options?: {
    messageHistory?: Array<{ body: string; created_at: string }>
    isPreSubmission?: boolean
    ventLinkId?: string
  }
): Promise<ModerationResult> {
  try {
    if (!messageBody || messageBody.trim().length === 0) {
      throw new Error('Message body is required')
    }

    // Use enhanced moderation for better accuracy
    const { data, error } = await supabase.functions.invoke('ai-moderation-enhanced', {
      body: {
        message_body: messageBody,
        message_history: options?.messageHistory || [],
        is_pre_submission: options?.isPreSubmission || false,
        vent_link_id: options?.ventLinkId,
      },
    })

    if (error) {
      throw new Error(error.message || 'Failed to moderate message')
    }

    if (!data?.moderation) {
      throw new Error('AI service returned an empty response.')
    }

    return {
      ...data.moderation,
      should_block: data.should_block || false,
      block_reason: data.block_reason || null,
    } as ModerationResult
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('Error moderating message:', error)
    }
    throw new Error(`Failed to moderate message: ${error?.message || 'Unknown error occurred'}`)
  }
}

/**
 * Categorize a message
 */
export interface CategorizationResult {
  primary_category: 'question' | 'compliment' | 'criticism' | 'support' | 'feedback' | 'suggestion' | 'other'
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  urgency: 'low' | 'medium' | 'high'
  tags: string[]
  summary: string
  confidence: number
}

export async function categorizeMessage(messageBody: string): Promise<CategorizationResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('You must be logged in to use AI features')
    }

    if (!messageBody || messageBody.trim().length === 0) {
      throw new Error('Message body is required')
    }

    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'categorize',
        messageBody,
      },
    })

    if (error) {
      throw new Error(error.message || 'Failed to categorize message')
    }

    if (!data?.result) {
      throw new Error('AI service returned an empty response.')
    }

    return data.result as CategorizationResult
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('Error categorizing message:', error)
    }
    throw new Error(`Failed to categorize message: ${error?.message || 'Unknown error occurred'}`)
  }
}

/**
 * Score message priority (1-100)
 */
export interface PriorityScoreResult {
  priority_score: number
  base_score?: number
  time_decay_adjusted?: number
  factors: {
    urgency: 'low' | 'medium' | 'high' | 'critical'
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
    requires_response: boolean
    is_question: boolean
    is_complaint: boolean
    is_crisis?: boolean
    emotional_intensity: 'low' | 'medium' | 'high'
    engagement_value?: 'low' | 'medium' | 'high'
    time_sensitivity?: 'low' | 'medium' | 'high'
  }
  weighted_factors?: {
    content_type_priority?: number
    sentiment_priority?: number
    urgency_priority?: number
    engagement_priority?: number
    crisis_priority?: number
  }
  reasoning: string
  recommendations?: string[]
}

export async function scoreMessagePriority(
  messageBody: string,
  options?: {
    messageHistory?: Array<{ body: string; created_at: string; has_response?: boolean }>
    aiCategory?: string
    aiSentiment?: string
    aiUrgency?: string
    aiModerationSeverity?: string
    aiSelfHarmRisk?: string
    created_at?: string
    ventLinkId?: string
    messageId?: string
  }
): Promise<PriorityScoreResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('You must be logged in to use AI features')
    }

    if (!messageBody || messageBody.trim().length === 0) {
      throw new Error('Message body is required')
    }

    // Use enhanced priority scoring if messageId provided (for webhook)
    if (options?.messageId) {
      const { data, error } = await supabase.functions.invoke('ai-priority-enhanced', {
        body: {
          message_id: options.messageId,
          message_body: messageBody,
          vent_link_id: options.ventLinkId,
          created_at: options.created_at,
          ai_category: options.aiCategory,
          ai_sentiment: options.aiSentiment,
          ai_urgency: options.aiUrgency,
          ai_moderation_severity: options.aiModerationSeverity,
          ai_self_harm_risk: options.aiSelfHarmRisk,
          message_history: options.messageHistory,
        },
      })

      if (error) {
        throw new Error(error.message || 'Failed to score message priority')
      }

      if (!data?.priority) {
        throw new Error('AI service returned an empty response.')
      }

      return data.priority as PriorityScoreResult
    }

    // Use standard priority scoring (for client-side calls)
    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'priority-score',
        messageBody,
        messageHistory: options?.messageHistory,
        ai_category: options?.aiCategory,
        ai_sentiment: options?.aiSentiment,
        ai_urgency: options?.aiUrgency,
        ai_moderation_severity: options?.aiModerationSeverity,
        ai_self_harm_risk: options?.aiSelfHarmRisk,
        created_at: options?.created_at,
      },
    })

    if (error) {
      throw new Error(error.message || 'Failed to score message priority')
    }

    if (!data?.result) {
      throw new Error('AI service returned an empty response.')
    }

    return data.result as PriorityScoreResult
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('Error scoring message priority:', error)
    }
    throw new Error(`Failed to score message priority: ${error?.message || 'Unknown error occurred'}`)
  }
}

/**
 * Enhanced Response Assistant - Context-aware with tone matching
 */
export interface EnhancedReplyResult {
  replies: string
  tone: 'empathetic' | 'professional' | 'casual' | 'auto'
  context_used: number
}

export async function generateEnhancedReply(
  messageBody: string,
  options?: {
    messageHistory?: Array<{ body: string; created_at: string }>
    tone?: 'empathetic' | 'professional' | 'casual' | 'auto'
  }
): Promise<EnhancedReplyResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('You must be logged in to use AI features')
    }

    if (!messageBody || messageBody.trim().length === 0) {
      throw new Error('Message body is required')
    }

    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'enhanced-reply',
        messageBody,
        messageHistory: options?.messageHistory || [],
        tone: options?.tone || 'auto',
      },
    })

    if (error) {
      throw new Error(error.message || 'Failed to generate enhanced reply')
    }

    if (!data?.result) {
      throw new Error('AI service returned an empty response.')
    }

    return data.result as EnhancedReplyResult
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('Error generating enhanced reply:', error)
    }
    throw new Error(`Failed to generate enhanced reply: ${error?.message || 'Unknown error occurred'}`)
  }
}

/**
 * AI Question Answerer - Generate answer suggestions for Q&A sessions
 */
export interface QAAnswerResult {
  answer: string
  quality_score: {
    overall_score: number
    accuracy: number
    clarity: number
    completeness: number
    appropriateness: number
    feedback: string
  }
}

export async function generateQAAnswer(
  questionText: string,
  qaSessionContext?: string
): Promise<QAAnswerResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('You must be logged in to use AI features')
    }

    if (!questionText || questionText.trim().length === 0) {
      throw new Error('Question text is required')
    }

    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'qa-answer',
        questionText,
        qaSessionContext,
      },
    })

    if (error) {
      throw new Error(error.message || 'Failed to generate Q&A answer')
    }

    if (!data?.result) {
      throw new Error('AI service returned an empty response.')
    }

    return data.result as QAAnswerResult
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('Error generating Q&A answer:', error)
    }
    throw new Error(`Failed to generate Q&A answer: ${error?.message || 'Unknown error occurred'}`)
  }
}

/**
 * AI Insight Generator - Generate trend reports and analytics
 */
export interface InsightsResult {
  insights: string
  time_range: 'week' | 'month' | 'all'
  message_count: number
  generated_at: string
}

export async function generateInsights(
  messages: Array<{ body: string; created_at: string; mood?: string }>,
  timeRange?: 'week' | 'month' | 'all'
): Promise<InsightsResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('You must be logged in to use AI features')
    }

    if (!messages || messages.length === 0) {
      throw new Error('Messages array is required')
    }

    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'insights',
        messages,
        timeRange: timeRange || 'all',
      },
    })

    if (error) {
      throw new Error(error.message || 'Failed to generate insights')
    }

    if (!data?.result) {
      throw new Error('AI service returned an empty response.')
    }

    return data.result as InsightsResult
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('Error generating insights:', error)
    }
    throw new Error(`Failed to generate insights: ${error?.message || 'Unknown error occurred'}`)
  }
}

/**
 * Quality Score for Responses
 */
export interface QualityScoreResult {
  overall_score: number
  empathy: number
  clarity: number
  appropriateness: number
  tone: number
  feedback: string
}

export async function scoreResponseQuality(responseText: string): Promise<QualityScoreResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('You must be logged in to use AI features')
    }

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Response text is required')
    }

    const { data, error } = await supabase.functions.invoke('openai-ai', {
      body: {
        type: 'quality-score',
        messageBody: responseText,
      },
    })

    if (error) {
      throw new Error(error.message || 'Failed to score response quality')
    }

    if (!data?.result) {
      throw new Error('AI service returned an empty response.')
    }

    return data.result as QualityScoreResult
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('Error scoring response quality:', error)
    }
    throw new Error(`Failed to score response quality: ${error?.message || 'Unknown error occurred'}`)
  }
}
