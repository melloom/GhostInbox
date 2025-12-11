// Supabase Edge Function for AI Moderation Webhook
// This endpoint can be called by database triggers or webhooks
// No authentication required (uses service role key for internal calls)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations'
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface WebhookBody {
  message_id: string
  message_body: string
  vent_link_id: string
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
    // Verify this is an internal call (from database trigger or webhook)
    const authHeader = req.headers.get('Authorization')
    const apiKey = req.headers.get('apikey')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    // Allow calls with service role key (from database triggers)
    const isInternalCall = 
      (authHeader && authHeader.includes(serviceRoleKey || '')) ||
      (apiKey === serviceRoleKey)

    if (!isInternalCall && !authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - internal endpoint only' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role (for database updates)
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
    const { message_id, message_body, vent_link_id } = body

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

    // Call OpenAI Moderation API
    const moderationResponse = await fetch(OPENAI_MODERATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: message_body,
      }),
    })

    if (!moderationResponse.ok) {
      const errorData = await moderationResponse.text()
      console.error('OpenAI Moderation API error:', errorData)
      
      // Log error but don't fail completely
      await supabaseClient
        .from('ai_processing_log')
        .insert({
          message_id,
          processing_type: 'moderation',
          result: { error: 'Moderation API failed', details: errorData },
          processing_time_ms: Date.now() - startTime,
        })
      
      return new Response(
        JSON.stringify({ error: 'Failed to moderate message' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const moderationData = await moderationResponse.json()
    const categories = moderationData.results[0].categories
    const categoryScores = moderationData.results[0].category_scores
    const flagged = moderationData.results[0].flagged
    const moderationScore = Math.max(...Object.values(categoryScores) as number[])

    // Check for self-harm indicators using GPT
    const selfHarmPrompt = `Analyze this message for potential self-harm or suicide risk:

"${message_body}"

Respond with ONLY a JSON object:
{
  "risk_level": "none" | "low" | "medium" | "high",
  "reasoning": "brief explanation",
  "requires_immediate_attention": boolean
}`

    let selfHarmAnalysis = {
      risk_level: 'none' as 'none' | 'low' | 'medium' | 'high',
      reasoning: '',
      requires_immediate_attention: false,
    }

    try {
      const selfHarmResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: selfHarmPrompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })

      if (selfHarmResponse.ok) {
        const selfHarmData = await selfHarmResponse.json()
        try {
          selfHarmAnalysis = JSON.parse(
            selfHarmData.choices[0]?.message?.content || '{}'
          )
        } catch (e) {
          console.error('Failed to parse self-harm analysis:', e)
        }
      }
    } catch (e) {
      console.error('Self-harm analysis failed:', e)
      // Continue without self-harm analysis
    }

    // Prepare moderation result
    const moderationResult = {
      flagged,
      categories,
      category_scores: categoryScores,
      self_harm: selfHarmAnalysis,
      moderation_score: moderationScore,
    }

    // Update message with moderation results
    const updateData: any = {
      ai_moderation_score: moderationScore,
      ai_moderation_flagged: flagged || selfHarmAnalysis.requires_immediate_attention,
      ai_moderation_categories: categories,
      ai_self_harm_risk: selfHarmAnalysis.risk_level,
      ai_processed_at: new Date().toISOString(),
    }

    // Auto-flag if moderation score is high or self-harm risk is medium/high
    if (moderationScore > 0.7 || selfHarmAnalysis.risk_level === 'high' || selfHarmAnalysis.risk_level === 'medium') {
      updateData.is_flagged = true
    }

    const { error: updateError } = await supabaseClient
      .from('vent_messages')
      .update(updateData)
      .eq('id', message_id)

    if (updateError) {
      console.error('Error updating message with moderation results:', updateError)
    }

    // Log processing result
    await supabaseClient.from('ai_processing_log').insert({
      message_id,
      processing_type: 'moderation',
      result: moderationResult,
      processing_time_ms: Date.now() - startTime,
    })

    // If high self-harm risk, log for potential alert
    if (selfHarmAnalysis.risk_level === 'high' || selfHarmAnalysis.requires_immediate_attention) {
      console.warn(
        `⚠️ HIGH SELF-HARM RISK detected for message ${message_id}:`,
        selfHarmAnalysis.reasoning
      )
      // In production, you might want to send an alert/notification here
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id,
        moderation: moderationResult,
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
    console.error('Error in AI moderation webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
