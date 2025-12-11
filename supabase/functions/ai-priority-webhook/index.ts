// Supabase Edge Function for AI Priority Scoring Webhook
// This endpoint can be called by database triggers or webhooks
// Scores messages 1-100 by importance and auto-adds to "Needs Response" queue

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
}

serve(async (req) => {
  // Handle CORS
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
    // Verify this is an internal call
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

    // Initialize Supabase client with service role
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

    // Check OpenAI API key
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured')
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: WebhookBody = await req.json()
    const { message_id, message_body, vent_link_id, created_at, ai_category, ai_sentiment, ai_urgency } = body

    if (!message_id || !message_body) {
      return new Response(
        JSON.stringify({ error: 'message_id and message_body are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate message length
    if (message_body.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message too long' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const startTime = Date.now()

    // Calculate message age in hours
    let messageAgeHours = 0
    if (created_at) {
      const messageDate = new Date(created_at)
      const now = new Date()
      messageAgeHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60)
    }

    // Build context for priority scoring (use existing AI data if available)
    let contextInfo = ''
    if (ai_category || ai_sentiment || ai_urgency) {
      contextInfo = `\n\nAdditional context:\n`
      if (ai_category) contextInfo += `- Category: ${ai_category}\n`
      if (ai_sentiment) contextInfo += `- Sentiment: ${ai_sentiment}\n`
      if (ai_urgency) contextInfo += `- Urgency: ${ai_urgency}\n`
    }
    if (messageAgeHours > 0) {
      contextInfo += `- Message age: ${Math.round(messageAgeHours)} hours\n`
    }

    // Call OpenAI for priority scoring
    const priorityPrompt = `Score this message's priority (1-100) for response. Higher = more urgent/important.

Consider:
- Urgency: How time-sensitive is this?
- Sentiment: Is this positive, negative, or neutral?
- Content type: Is this a question, complaint, compliment, etc.?
- Age: Older messages may need attention if unanswered
- Emotional intensity: How emotionally charged is this?

"${message_body}"${contextInfo}

Respond with ONLY a JSON object:
{
  "priority_score": 1-100,
  "factors": {
    "urgency": "low" | "medium" | "high",
    "sentiment": "positive" | "negative" | "neutral",
    "requires_response": boolean,
    "is_question": boolean,
    "is_complaint": boolean,
    "emotional_intensity": "low" | "medium" | "high"
  },
  "reasoning": "brief explanation"
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
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!priorityResponse.ok) {
      const errorData = await priorityResponse.text()
      console.error('OpenAI API error:', errorData)
      
      await supabaseClient
        .from('ai_processing_log')
        .insert({
          message_id,
          processing_type: 'priority-score',
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

    // Ensure priority_score is between 1-100
    const priorityScore = Math.max(1, Math.min(100, priorityResult.priority_score || 50))

    // Update message with priority score
    const updateData: any = {
      ai_priority_score: priorityScore,
      ai_processed_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabaseClient
      .from('vent_messages')
      .update(updateData)
      .eq('id', message_id)

    if (updateError) {
      console.error('Error updating message with priority score:', updateError)
    }

    // Auto-add to "Needs Response" queue if priority is high (>= 70) and requires_response is true
    const requiresResponse = priorityResult.factors?.requires_response !== false
    const isHighPriority = priorityScore >= 70

    if (isHighPriority && requiresResponse) {
      // Check if message already has a response
      const { data: existingResponses } = await supabaseClient
        .from('message_responses')
        .select('id')
        .eq('message_id', message_id)
        .limit(1)

      // Only add to queue if no response exists
      if (!existingResponses || existingResponses.length === 0) {
        // We'll use a tag or flag to mark as "needs response"
        // For now, we can add a tag or use a custom field
        // Since we don't have a dedicated "needs_response" field, we'll use tags
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
    }

    // Log processing result
    await supabaseClient.from('ai_processing_log').insert({
      message_id,
      processing_type: 'priority-score',
      result: { ...priorityResult, priority_score: priorityScore },
      processing_time_ms: Date.now() - startTime,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message_id,
        priority_score: priorityScore,
        priority: priorityResult,
        added_to_queue: isHighPriority && requiresResponse,
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
    console.error('Error in AI priority webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
