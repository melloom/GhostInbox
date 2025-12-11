// Enhanced AI Priority Scoring System
// Multi-factor analysis with context awareness, engagement patterns, and time decay

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface WebhookBody {
  message_id: string
  message_body: string
  vent_link_id: string
  created_at?: string
  ai_category?: string
  ai_sentiment?: string
  ai_urgency?: string
  ai_moderation_severity?: string
  ai_self_harm_risk?: string
  message_history?: Array<{ body: string; created_at: string; has_response: boolean }>
  total_messages_from_sender?: number
  response_rate_to_sender?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const apiKey = req.headers.get('apikey')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    const isInternalCall = 
      (authHeader && authHeader.includes(serviceRoleKey || '')) ||
      (apiKey === serviceRoleKey)

    if (!isInternalCall && !authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - internal endpoint only' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body: WebhookBody = await req.json()
    const { 
      message_id, 
      message_body, 
      vent_link_id, 
      created_at, 
      ai_category, 
      ai_sentiment, 
      ai_urgency,
      ai_moderation_severity,
      ai_self_harm_risk,
      message_history,
      total_messages_from_sender,
      response_rate_to_sender,
    } = body

    if (!message_id || !message_body) {
      return new Response(
        JSON.stringify({ error: 'message_id and message_body are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const startTime = Date.now()

    // ============================================================================
    // GATHER CONTEXT DATA
    // ============================================================================
    
    // Get message history if not provided
    let history = message_history || []
    if (history.length === 0) {
      // Get recent messages from same vent_link (likely same sender)
      const { data: recentMessages } = await supabaseClient
        .from('vent_messages')
        .select('id, body, created_at')
        .eq('vent_link_id', vent_link_id)
        .neq('id', message_id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentMessages) {
        // Check which have responses
        const messageIds = recentMessages.map(m => m.id)
        const { data: responses } = await supabaseClient
          .from('message_responses')
          .select('message_id')
          .in('message_id', messageIds)

        const respondedIds = new Set(responses?.map(r => r.message_id) || [])
        
        history = recentMessages.map(m => ({
          body: m.body,
          created_at: m.created_at,
          has_response: respondedIds.has(m.id),
        }))
      }
    }

    // Calculate message age and time decay
    let messageAgeHours = 0
    let timeDecayMultiplier = 1.0
    if (created_at) {
      const messageDate = new Date(created_at)
      const now = new Date()
      messageAgeHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60)
      
      // Exponential decay: messages lose priority over time
      // After 24 hours: 0.9x, 48 hours: 0.8x, 72 hours: 0.7x, etc.
      timeDecayMultiplier = Math.max(0.5, 1.0 - (messageAgeHours / 240)) // Decay over 10 days
    }

    // Get response statistics if not provided
    let totalMessages = total_messages_from_sender || 0
    let responseRate = response_rate_to_sender || 0
    if (totalMessages === 0) {
      const { data: allMessages } = await supabaseClient
        .from('vent_messages')
        .select('id')
        .eq('vent_link_id', vent_link_id)
        .neq('id', message_id)

      totalMessages = allMessages?.length || 0

      if (totalMessages > 0) {
        const messageIds = allMessages.map(m => m.id)
        const { data: allResponses } = await supabaseClient
          .from('message_responses')
          .select('message_id')
          .in('message_id', messageIds)

        const uniqueRespondedMessages = new Set(allResponses?.map(r => r.message_id) || [])
        responseRate = uniqueRespondedMessages.size / totalMessages
      }
    }

    // Check if this message already has a response
    const { data: existingResponses } = await supabaseClient
      .from('message_responses')
      .select('id')
      .eq('message_id', message_id)
      .limit(1)

    const hasResponse = existingResponses && existingResponses.length > 0

    // ============================================================================
    // BUILD COMPREHENSIVE CONTEXT
    // ============================================================================
    
    let contextInfo = ''
    
    // AI categorization data
    if (ai_category || ai_sentiment || ai_urgency) {
      contextInfo += `\n\nAI Analysis:\n`
      if (ai_category) contextInfo += `- Category: ${ai_category}\n`
      if (ai_sentiment) contextInfo += `- Sentiment: ${ai_sentiment}\n`
      if (ai_urgency) contextInfo += `- Urgency: ${ai_urgency}\n`
    }

    // Moderation data (crisis messages are high priority)
    if (ai_moderation_severity || ai_self_harm_risk) {
      contextInfo += `\nModeration Status:\n`
      if (ai_moderation_severity) contextInfo += `- Severity: ${ai_moderation_severity}\n`
      if (ai_self_harm_risk && ai_self_harm_risk !== 'none') {
        contextInfo += `- Self-Harm Risk: ${ai_self_harm_risk} (HIGH PRIORITY)\n`
      }
    }

    // Message history context
    if (history.length > 0) {
      const historySummary = history.slice(0, 3).map((m, idx) => {
        const age = Math.round((Date.now() - new Date(m.created_at).getTime()) / (1000 * 60 * 60))
        return `${idx + 1}. [${age}h ago, ${m.has_response ? 'responded' : 'no response'}] ${m.body.substring(0, 100)}`
      }).join('\n')
      contextInfo += `\n\nPrevious Messages from This Sender:\n${historySummary}\n`
      contextInfo += `- Total messages from sender: ${totalMessages}\n`
      contextInfo += `- Response rate to sender: ${(responseRate * 100).toFixed(0)}%\n`
    }

    // Time context
    if (messageAgeHours > 0) {
      contextInfo += `\n- Message age: ${Math.round(messageAgeHours)} hours (${messageAgeHours > 48 ? 'OLD - priority decreases' : messageAgeHours > 24 ? 'getting old' : 'recent'})\n`
    }

    // Response status
    if (hasResponse) {
      contextInfo += `\n- Status: Already has a response (lower priority)\n`
    }

    // ============================================================================
    // ENHANCED PRIORITY SCORING PROMPT
    // ============================================================================
    
    const priorityPrompt = `Score this message's priority (1-100) for response. Higher = more urgent/important to respond to.

Message: "${message_body}"${contextInfo}

Consider ALL these factors:

1. **Content Type & Intent**:
   - Questions = HIGH priority (needs answer)
   - Complaints/Criticism = HIGH priority (needs addressing)
   - Compliments = MEDIUM priority (nice to respond)
   - Support requests = HIGH priority
   - General feedback = MEDIUM priority

2. **Sentiment & Emotional State**:
   - Negative sentiment = HIGH priority (needs support)
   - Positive sentiment = MEDIUM priority (appreciation)
   - Neutral = LOW-MEDIUM priority
   - Emotional intensity matters

3. **Urgency Indicators**:
   - Time-sensitive language ("urgent", "asap", "need help now")
   - Crisis indicators (self-harm risk = CRITICAL priority)
   - Questions with deadlines
   - Requests for immediate action

4. **Message History & Engagement**:
   - First-time sender = HIGHER priority (new relationship)
   - Repeat sender with low response rate = HIGHER priority (engagement opportunity)
   - Sender with many unanswered messages = HIGHER priority
   - Sender you typically respond to = HIGHER priority

5. **Time Decay**:
   - Recent messages (< 24h) = FULL priority
   - Older messages (24-48h) = REDUCED priority
   - Very old messages (> 72h) = SIGNIFICANTLY REDUCED priority
   - BUT: Crisis/urgent messages maintain high priority regardless of age

6. **Response Status**:
   - Already responded = LOWER priority
   - No response = HIGHER priority

7. **Moderation Flags**:
   - Crisis/self-harm risk = CRITICAL priority (100)
   - High severity moderation = HIGH priority
   - Normal messages = standard priority

Calculate a comprehensive priority score considering ALL factors above.

Respond with ONLY a JSON object:
{
  "priority_score": 1-100,
  "base_score": 1-100,
  "time_decay_adjusted": 1-100,
  "factors": {
    "content_type_priority": 1-100,
    "sentiment_priority": 1-100,
    "urgency_priority": 1-100,
    "engagement_priority": 1-100,
    "crisis_priority": 1-100
  },
  "weighted_factors": {
    "urgency": "low" | "medium" | "high" | "critical",
    "sentiment": "positive" | "negative" | "neutral" | "mixed",
    "requires_response": boolean,
    "is_question": boolean,
    "is_complaint": boolean,
    "is_crisis": boolean,
    "emotional_intensity": "low" | "medium" | "high",
    "engagement_value": "low" | "medium" | "high",
    "time_sensitivity": "low" | "medium" | "high"
  },
  "reasoning": "detailed explanation of score calculation",
  "recommendations": ["recommendation1", "recommendation2"]
}`

    const priorityResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: priorityPrompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!priorityResponse.ok) {
      const errorData = await priorityResponse.text()
      console.error('OpenAI API error:', errorData)
      
      await supabaseClient.from('ai_processing_log').insert({
        message_id,
        processing_type: 'priority-score-enhanced',
        result: { error: 'Priority scoring API failed', details: errorData },
        processing_time_ms: Date.now() - startTime,
      })
      
      return new Response(
        JSON.stringify({ error: 'Failed to score message priority' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const priorityData = await priorityResponse.json()
    let priorityResult: any = {}
    
    try {
      priorityResult = JSON.parse(priorityData.choices[0]?.message?.content || '{}')
    } catch (e) {
      console.error('Failed to parse priority score:', e)
      priorityResult = { priority_score: 50, error: 'Failed to parse priority score' }
    }

    // ============================================================================
    // APPLY TIME DECAY AND CRISIS BOOST
    // ============================================================================
    
    let baseScore = priorityResult.priority_score || priorityResult.base_score || 50
    let finalScore = baseScore

    // Crisis messages get maximum priority regardless of other factors
    if (ai_self_harm_risk === 'critical' || ai_self_harm_risk === 'high') {
      finalScore = 100
    } else if (ai_moderation_severity === 'critical') {
      finalScore = 95
    } else {
      // Apply time decay (unless it's a question or complaint)
      const isQuestion = priorityResult.weighted_factors?.is_question
      const isComplaint = priorityResult.weighted_factors?.is_complaint
      const isCrisis = priorityResult.weighted_factors?.is_crisis
      
      if (!isQuestion && !isComplaint && !isCrisis && messageAgeHours > 24) {
        finalScore = Math.round(baseScore * timeDecayMultiplier)
      }
    }

    // Reduce priority if already responded
    if (hasResponse) {
      finalScore = Math.max(1, Math.round(finalScore * 0.3))
    }

    // Ensure score is between 1-100
    finalScore = Math.max(1, Math.min(100, finalScore))

    // ============================================================================
    // UPDATE DATABASE
    // ============================================================================
    
    const updateData: any = {
      ai_priority_score: finalScore,
      ai_processed_at: new Date().toISOString(),
    }

    await supabaseClient
      .from('vent_messages')
      .update(updateData)
      .eq('id', message_id)

    // ============================================================================
    // AUTO-ADD TO "NEEDS RESPONSE" QUEUE
    // ============================================================================
    
    const requiresResponse = priorityResult.weighted_factors?.requires_response !== false
    const isHighPriority = finalScore >= 70
    const isCrisis = ai_self_harm_risk === 'critical' || ai_self_harm_risk === 'high'
    const isQuestion = priorityResult.weighted_factors?.is_question
    const isComplaint = priorityResult.weighted_factors?.is_complaint

    // Add to queue if:
    // - High priority (>= 70) AND requires response AND no response yet
    // - OR crisis message
    // - OR question/complaint with no response
    if (!hasResponse && (
      (isHighPriority && requiresResponse) ||
      isCrisis ||
      (isQuestion && finalScore >= 50) ||
      (isComplaint && finalScore >= 60)
    )) {
      const { data: existingTag } = await supabaseClient
        .from('message_tags')
        .select('id')
        .eq('message_id', message_id)
        .eq('tag_name', 'needs-response')
        .single()

      if (!existingTag) {
        await supabaseClient
          .from('message_tags')
          .insert({
            message_id,
            tag_name: 'needs-response',
          })
      }
    }

    // ============================================================================
    // LOG RESULT
    // ============================================================================
    
    await supabaseClient.from('ai_processing_log').insert({
      message_id,
      processing_type: 'priority-score-enhanced',
      result: {
        ...priorityResult,
        priority_score: finalScore,
        base_score: baseScore,
        time_decay_applied: timeDecayMultiplier,
        message_age_hours: messageAgeHours,
        has_response: hasResponse,
        context_used: {
          message_history_count: history.length,
          total_messages_from_sender: totalMessages,
          response_rate: responseRate,
        },
      },
      processing_time_ms: Date.now() - startTime,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message_id,
        priority_score: finalScore,
        base_score: baseScore,
        priority: {
          ...priorityResult,
          priority_score: finalScore,
        },
        added_to_queue: !hasResponse && (isHighPriority || isCrisis || isQuestion || isComplaint),
        context: {
          message_history_count: history.length,
          message_age_hours: messageAgeHours,
          time_decay: timeDecayMultiplier,
          has_response: hasResponse,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error in enhanced priority scoring:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
