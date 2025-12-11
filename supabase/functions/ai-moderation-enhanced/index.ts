// Enhanced AI Moderation System
// Multi-layer analysis with context awareness, better accuracy, and crisis intervention

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations'
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface WebhookBody {
  message_id?: string
  message_body: string
  vent_link_id?: string
  ip_hash?: string
  message_history?: Array<{ body: string; created_at: string }>
  is_pre_submission?: boolean
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
        JSON.stringify({ error: 'Unauthorized' }),
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
    const { message_id, message_body, vent_link_id, ip_hash, message_history, is_pre_submission } = body

    if (!message_body || message_body.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'message_body is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (message_body.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message too long' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const startTime = Date.now()

    // ============================================================================
    // LAYER 1: OpenAI Moderation API (Fast, cheap baseline)
    // ============================================================================
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

    let moderationData: any = null
    let baselineFlagged = false
    let categoryScores: Record<string, number> = {}
    let categories: Record<string, boolean> = {}

    if (moderationResponse.ok) {
      moderationData = await moderationResponse.json()
      categories = moderationData.results[0].categories
      categoryScores = moderationData.results[0].category_scores
      baselineFlagged = moderationData.results[0].flagged
    }

    // ============================================================================
    // LAYER 2: Advanced Context-Aware Analysis (GPT-4o-mini)
    // ============================================================================
    const contextInfo = message_history && message_history.length > 0
      ? `\n\nPrevious messages from this sender:\n${message_history.slice(-3).map((m, idx) => 
          `${idx + 1}. ${m.body}`
        ).join('\n')}`
      : ''

    const advancedAnalysisPrompt = `Analyze this message for harmful content with high accuracy. Consider context and nuance.

Message: "${message_body}"${contextInfo}

Perform a comprehensive analysis and respond with ONLY a JSON object:
{
  "overall_risk": "none" | "low" | "medium" | "high" | "critical",
  "issues": {
    "spam": boolean,
    "toxicity": boolean,
    "harassment": boolean,
    "threats": boolean,
    "hate_speech": boolean,
    "sexual_content": boolean,
    "violence": boolean
  },
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why flagged or not",
  "false_positive_risk": "low" | "medium" | "high",
  "requires_human_review": boolean,
  "severity_breakdown": {
    "spam_severity": 0-10,
    "toxicity_severity": 0-10,
    "harassment_severity": 0-10,
    "threat_severity": 0-10
  }
}`

    const advancedResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: advancedAnalysisPrompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    let advancedAnalysis: any = {
      overall_risk: 'none',
      issues: {},
      confidence: 0.5,
      reasoning: '',
      false_positive_risk: 'low',
      requires_human_review: false,
      severity_breakdown: {},
    }

    if (advancedResponse.ok) {
      const advancedData = await advancedResponse.json()
      try {
        advancedAnalysis = JSON.parse(advancedData.choices[0]?.message?.content || '{}')
      } catch (e) {
        console.error('Failed to parse advanced analysis:', e)
      }
    }

    // ============================================================================
    // LAYER 3: Enhanced Self-Harm Detection
    // ============================================================================
    const selfHarmPrompt = `Analyze this message for potential self-harm, suicide risk, or mental health crisis. Be thorough but avoid false positives.

Message: "${message_body}"${contextInfo}

Consider:
- Direct statements about self-harm or suicide
- Indirect expressions of hopelessness or despair
- References to ending life or not wanting to live
- Expressions of severe emotional distress
- Context from previous messages

Respond with ONLY a JSON object:
{
  "risk_level": "none" | "low" | "medium" | "high" | "critical",
  "reasoning": "detailed explanation",
  "requires_immediate_attention": boolean,
  "crisis_resources_needed": boolean,
  "specific_indicators": ["indicator1", "indicator2"],
  "recommended_action": "none" | "monitor" | "alert" | "intervene"
}`

    const selfHarmResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: selfHarmPrompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    let selfHarmAnalysis: any = {
      risk_level: 'none',
      reasoning: '',
      requires_immediate_attention: false,
      crisis_resources_needed: false,
      specific_indicators: [],
      recommended_action: 'none',
    }

    if (selfHarmResponse.ok) {
      const selfHarmData = await selfHarmResponse.json()
      try {
        selfHarmAnalysis = JSON.parse(selfHarmData.choices[0]?.message?.content || '{}')
      } catch (e) {
        console.error('Failed to parse self-harm analysis:', e)
      }
    }

    // ============================================================================
    // LAYER 4: Spam Pattern Detection
    // ============================================================================
    const spamPatterns = [
      /(?:buy|sell|discount|offer|deal|limited|act now|click here|free money)/i,
      /(?:http|https|www\.|\.com|\.net|\.org)/i,
      /(?:repeated.{0,10}){3,}/i, // Repeated phrases
    ]

    const spamScore = spamPatterns.reduce((score, pattern) => {
      const matches = (message_body.match(pattern) || []).length
      return score + Math.min(matches * 0.2, 1.0)
    }, 0)

    // Check for excessive repetition
    const words = message_body.toLowerCase().split(/\s+/)
    const wordFrequency: Record<string, number> = {}
    words.forEach(word => {
      if (word.length > 3) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1
      }
    })
    const maxRepetition = Math.max(...Object.values(wordFrequency))
    const isRepetitiveSpam = maxRepetition > 10 && words.length < 50

    // ============================================================================
    // LAYER 5: Threat Detection Enhancement
    // ============================================================================
    const threatPatterns = [
      /(?:kill|murder|harm|hurt|attack|violence|weapon|gun|knife|bomb)/i,
      /(?:threat|threaten|warning|consequence|payback|revenge)/i,
    ]

    const threatScore = threatPatterns.reduce((score, pattern) => {
      return score + ((message_body.match(pattern) || []).length * 0.3)
    }, 0)

    // ============================================================================
    // COMBINE ALL LAYERS - Intelligent Decision Making
    // ============================================================================
    const baselineScore = Math.max(...Object.values(categoryScores), 0)
    const advancedRiskScore = advancedAnalysis.overall_risk === 'critical' ? 1.0
      : advancedAnalysis.overall_risk === 'high' ? 0.8
      : advancedAnalysis.overall_risk === 'medium' ? 0.6
      : advancedAnalysis.overall_risk === 'low' ? 0.3
      : 0.1

    // Weighted combination
    const combinedScore = (
      baselineScore * 0.3 +
      advancedRiskScore * 0.4 +
      (spamScore > 0.5 ? spamScore : 0) * 0.1 +
      (threatScore > 0.3 ? Math.min(threatScore, 1.0) : 0) * 0.2
    )

    // Determine if message should be flagged
    const shouldFlag = 
      selfHarmAnalysis.risk_level === 'critical' ||
      selfHarmAnalysis.risk_level === 'high' ||
      selfHarmAnalysis.requires_immediate_attention ||
      (combinedScore > 0.7 && advancedAnalysis.false_positive_risk !== 'high') ||
      (baselineFlagged && advancedAnalysis.false_positive_risk !== 'high') ||
      (isRepetitiveSpam && spamScore > 0.6) ||
      (threatScore > 0.5 && advancedAnalysis.issues.threats)

    // Determine severity
    const severity = 
      selfHarmAnalysis.risk_level === 'critical' ? 'critical'
      : selfHarmAnalysis.risk_level === 'high' ? 'high'
      : combinedScore > 0.8 ? 'high'
      : combinedScore > 0.6 ? 'medium'
      : combinedScore > 0.4 ? 'low'
      : 'none'

    // ============================================================================
    // PREPARE RESULT
    // ============================================================================
    const moderationResult = {
      flagged: shouldFlag,
      severity,
      combined_score: combinedScore,
      baseline_score: baselineScore,
      layers: {
        baseline_moderation: {
          flagged: baselineFlagged,
          categories,
          category_scores: categoryScores,
        },
        advanced_analysis: advancedAnalysis,
        self_harm: selfHarmAnalysis,
        spam_detection: {
          score: spamScore,
          is_repetitive: isRepetitiveSpam,
          detected: spamScore > 0.5 || isRepetitiveSpam,
        },
        threat_detection: {
          score: threatScore,
          detected: threatScore > 0.3,
        },
      },
      context_used: message_history ? message_history.length : 0,
      requires_human_review: advancedAnalysis.requires_human_review || selfHarmAnalysis.recommended_action === 'intervene',
      recommended_action: selfHarmAnalysis.recommended_action || (shouldFlag ? 'flag' : 'none'),
    }

    // ============================================================================
    // UPDATE DATABASE (if message_id provided)
    // ============================================================================
    if (message_id && !is_pre_submission) {
      const updateData: any = {
        ai_moderation_score: combinedScore,
        ai_moderation_flagged: shouldFlag,
        ai_moderation_categories: {
          ...categories,
          ...advancedAnalysis.issues,
          spam: spamScore > 0.5 || isRepetitiveSpam,
          threat: threatScore > 0.3,
        },
        ai_self_harm_risk: selfHarmAnalysis.risk_level,
        ai_processed_at: new Date().toISOString(),
      }

      // Auto-flag based on severity
      if (severity === 'critical' || severity === 'high' || selfHarmAnalysis.requires_immediate_attention) {
        updateData.is_flagged = true
      }

      await supabaseClient
        .from('vent_messages')
        .update(updateData)
        .eq('id', message_id)

      // Log processing
      await supabaseClient.from('ai_processing_log').insert({
        message_id,
        processing_type: 'moderation-enhanced',
        result: moderationResult,
        processing_time_ms: Date.now() - startTime,
      })

      // Crisis intervention alert
      if (selfHarmAnalysis.risk_level === 'critical' || selfHarmAnalysis.requires_immediate_attention) {
        console.error(
          `🚨 CRITICAL SELF-HARM RISK for message ${message_id}:`,
          selfHarmAnalysis.reasoning,
          '\nRecommended Action:',
          selfHarmAnalysis.recommended_action
        )
        
        // Store crisis alert
        await supabaseClient.from('ai_processing_log').insert({
          message_id,
          processing_type: 'crisis-alert',
          result: {
            risk_level: selfHarmAnalysis.risk_level,
            reasoning: selfHarmAnalysis.reasoning,
            indicators: selfHarmAnalysis.specific_indicators,
            recommended_action: selfHarmAnalysis.recommended_action,
            resources_needed: selfHarmAnalysis.crisis_resources_needed,
          },
          processing_time_ms: Date.now() - startTime,
        })
      }
    }

    // ============================================================================
    // RETURN RESULT
    // ============================================================================
    return new Response(
      JSON.stringify({
        success: true,
        message_id: message_id || null,
        moderation: moderationResult,
        is_pre_submission: is_pre_submission || false,
        should_block: shouldFlag && is_pre_submission,
        block_reason: shouldFlag && is_pre_submission 
          ? (selfHarmAnalysis.risk_level === 'critical' || selfHarmAnalysis.risk_level === 'high'
              ? 'This message contains content that may indicate a crisis. Please seek help or contact support.'
              : 'This message contains inappropriate content and cannot be sent.')
          : null,
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
    console.error('Error in enhanced moderation:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
