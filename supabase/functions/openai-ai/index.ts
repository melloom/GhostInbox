// Supabase Edge Function for OpenAI API calls
// This keeps the API key secure on the server side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations'

interface RequestBody {
  type: 'reply-templates' | 'theme-summary' | 'moderation' | 'categorize' | 'priority-score' | 'enhanced-reply' | 'qa-answer' | 'insights' | 'quality-score'
  messageBody?: string
  messages?: string[] | Array<{ body: string; created_at: string; mood?: string }>
  messageId?: string
  questionText?: string
  qaSessionContext?: string
  messageHistory?: Array<{ body: string; created_at: string }>
  tone?: 'empathetic' | 'professional' | 'casual' | 'auto'
  timeRange?: 'week' | 'month' | 'all'
  ventLinkId?: string
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
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check OpenAI API key
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: RequestBody = await req.json()
    const { type, messageBody, messages, messageId } = body

    if (!type) {
      return new Response(
        JSON.stringify({ error: 'Type is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate input based on type
    if ((type === 'reply-templates' || type === 'moderation' || type === 'categorize' || type === 'priority-score') && !messageBody) {
      return new Response(
        JSON.stringify({ error: 'messageBody is required for this type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (type === 'theme-summary' && !messages) {
      return new Response(
        JSON.stringify({ error: 'messages array is required for theme-summary' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate input lengths
    if (messageBody && messageBody.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message too long' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (messages && messages.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Too many messages' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let result: any

    // Handle moderation (uses OpenAI Moderation API - cheaper and faster)
    if (type === 'moderation') {
      const moderationResponse = await fetch(OPENAI_MODERATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: messageBody,
        }),
      })

      if (!moderationResponse.ok) {
        const errorData = await moderationResponse.text()
        console.error('OpenAI Moderation API error:', errorData)
        return new Response(
          JSON.stringify({ error: 'Failed to moderate message' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const moderationData = await moderationResponse.json()
      const categories = moderationData.results[0].categories
      const categoryScores = moderationData.results[0].category_scores
      const flagged = moderationData.results[0].flagged

      // Check for self-harm indicators using GPT (moderation API doesn't catch all)
      const selfHarmPrompt = `Analyze this message for potential self-harm or suicide risk:

"${messageBody}"

Respond with ONLY a JSON object:
{
  "risk_level": "none" | "low" | "medium" | "high",
  "reasoning": "brief explanation",
  "requires_immediate_attention": boolean
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
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })

      let selfHarmAnalysis = { risk_level: 'none', reasoning: '', requires_immediate_attention: false }
      if (selfHarmResponse.ok) {
        const selfHarmData = await selfHarmResponse.json()
        try {
          selfHarmAnalysis = JSON.parse(selfHarmData.choices[0]?.message?.content || '{}')
        } catch (e) {
          console.error('Failed to parse self-harm analysis:', e)
        }
      }

      result = {
        flagged,
        categories,
        category_scores: categoryScores,
        self_harm: selfHarmAnalysis,
        moderation_score: Math.max(...Object.values(categoryScores) as number[]),
      }
    }
    // Handle categorization
    else if (type === 'categorize') {
      const categorizePrompt = `Analyze this anonymous message and categorize it. Respond with ONLY a JSON object:

"${messageBody}"

{
  "primary_category": "question" | "compliment" | "criticism" | "support" | "feedback" | "suggestion" | "other",
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "urgency": "low" | "medium" | "high",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "brief one-sentence summary",
  "confidence": 0.0-1.0
}`

      const categorizeResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: categorizePrompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })

      if (!categorizeResponse.ok) {
        const errorData = await categorizeResponse.text()
        console.error('OpenAI API error:', errorData)
        return new Response(
          JSON.stringify({ error: 'Failed to categorize message' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const categorizeData = await categorizeResponse.json()
      try {
        result = JSON.parse(categorizeData.choices[0]?.message?.content || '{}')
      } catch (e) {
        result = { error: 'Failed to parse categorization' }
      }
    }
    // Handle priority scoring (enhanced version)
    else if (type === 'priority-score') {
      const messageHistory = body.messageHistory || []
      const aiCategory = body.ai_category
      const aiSentiment = body.ai_sentiment
      const aiUrgency = body.ai_urgency
      const aiModerationSeverity = body.ai_moderation_severity
      const aiSelfHarmRisk = body.ai_self_harm_risk
      const created_at = body.created_at

      // Build comprehensive context
      let contextInfo = ''
      if (aiCategory || aiSentiment || aiUrgency) {
        contextInfo += `\n\nAI Analysis:\n`
        if (aiCategory) contextInfo += `- Category: ${aiCategory}\n`
        if (aiSentiment) contextInfo += `- Sentiment: ${aiSentiment}\n`
        if (aiUrgency) contextInfo += `- Urgency: ${aiUrgency}\n`
      }
      if (aiModerationSeverity || aiSelfHarmRisk) {
        contextInfo += `\nModeration: `
        if (aiModerationSeverity) contextInfo += `Severity: ${aiModerationSeverity}, `
        if (aiSelfHarmRisk && aiSelfHarmRisk !== 'none') contextInfo += `Self-Harm Risk: ${aiSelfHarmRisk} (CRITICAL PRIORITY)\n`
      }
      if (messageHistory.length > 0) {
        contextInfo += `\nPrevious messages from sender: ${messageHistory.length} messages\n`
      }
      if (created_at) {
        const age = Math.round((Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60))
        contextInfo += `\nMessage age: ${age} hours${age > 48 ? ' (OLD - priority decreases)' : ''}\n`
      }

      const priorityPrompt = `Score this message's priority (1-100) for response. Higher = more urgent/important.

Consider:
- Content type (questions, complaints = HIGH priority)
- Sentiment (negative = HIGH priority, needs support)
- Urgency indicators (time-sensitive language, deadlines)
- Message history (first-time sender = HIGHER, repeat with low response rate = HIGHER)
- Time decay (older messages = LOWER priority, unless urgent/crisis)
- Crisis indicators (self-harm risk = CRITICAL priority 100)
- Engagement value (relationship building opportunities)

"${message_body}"${contextInfo}

Respond with ONLY a JSON object:
{
  "priority_score": 1-100,
  "base_score": 1-100,
  "factors": {
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
  "reasoning": "detailed explanation considering all factors",
  "recommendations": ["action1", "action2"]
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
        return new Response(
          JSON.stringify({ error: 'Failed to score message priority' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const priorityData = await priorityResponse.json()
      try {
        result = JSON.parse(priorityData.choices[0]?.message?.content || '{}')
      } catch (e) {
        result = { priority_score: 50, error: 'Failed to parse priority score' }
      }
    }
    // Handle reply templates (existing)
    else if (type === 'reply-templates') {
      const prompt = `You are a supportive friend. The user received this anonymous vent:

"${messageBody}"

Write 3 short reply templates they could send back privately. 
- Be empathetic but not fake.
- Max 3 sentences each.
- Label them 1), 2), 3).`

      const openaiResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      })

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text()
        console.error('OpenAI API error:', errorData)
        return new Response(
          JSON.stringify({ error: 'Failed to generate AI response' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const openaiData = await openaiResponse.json()
      result = openaiData.choices[0]?.message?.content || 'Failed to generate response'
    }
    // Handle theme summary (existing)
    else if (type === 'theme-summary') {
      const combined = messages!.slice(0, 20).map((m) => `- ${m}`).join('\n')
      const prompt = `These are anonymous vents someone received:

${combined}

1) Summarize the main themes in 3–5 bullet points.
2) Then give 2 short self-care reminders for the person reading them.`

      const openaiResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      })

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text()
        console.error('OpenAI API error:', errorData)
        return new Response(
          JSON.stringify({ error: 'Failed to generate AI response' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const openaiData = await openaiResponse.json()
      result = openaiData.choices[0]?.message?.content || 'Failed to generate response'
    }
    // Handle enhanced reply (context-aware, tone matching)
    else if (type === 'enhanced-reply') {
      if (!messageBody) {
        return new Response(
          JSON.stringify({ error: 'messageBody is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const messageHistory = body.messageHistory || []
      const tone = body.tone || 'auto'

      let contextInfo = ''
      if (messageHistory.length > 0) {
        const recentMessages = messageHistory.slice(-5).map((m: any, idx: number) => 
          `Message ${idx + 1} (${new Date(m.created_at).toLocaleDateString()}): ${m.body}`
        ).join('\n')
        contextInfo = `\n\nPrevious messages from this sender:\n${recentMessages}`
      }

      const toneInstruction = tone === 'auto' 
        ? 'Match the tone of the message naturally (empathetic for emotional messages, professional for formal ones, casual for friendly ones).'
        : tone === 'empathetic'
        ? 'Be warm, understanding, and empathetic. Show genuine care and concern.'
        : tone === 'professional'
        ? 'Be professional, clear, and respectful. Maintain appropriate boundaries.'
        : 'Be friendly, casual, and conversational. Keep it light and approachable.'

      const enhancedPrompt = `You are a supportive friend helping someone respond to an anonymous message. Generate 3 high-quality reply options.

Current message:
"${messageBody}"${contextInfo}

Guidelines:
- ${toneInstruction}
- Each reply should be 2-4 sentences
- Be authentic and genuine (not robotic)
- Consider the message history for context
- Label them 1), 2), 3)

Generate 3 distinct reply options that vary in approach but all maintain the ${tone} tone.`

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: enhancedPrompt }],
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('OpenAI API error:', errorData)
        return new Response(
          JSON.stringify({ error: 'Failed to generate enhanced reply' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      result = {
        replies: data.choices[0]?.message?.content || 'Failed to generate replies',
        tone: tone,
        context_used: messageHistory.length,
      }
    }
    // Handle Q&A answer generation
    else if (type === 'qa-answer') {
      if (!body.questionText) {
        return new Response(
          JSON.stringify({ error: 'questionText is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const qaPrompt = `You are helping answer a question in a Q&A session. Generate a helpful, accurate answer.

Question: "${body.questionText}"
${body.qaSessionContext ? `\nQ&A Session Context: ${body.qaSessionContext}` : ''}

Generate a comprehensive answer that:
- Directly addresses the question
- Is clear and well-structured
- Is appropriate for the context
- Can be 2-5 sentences

Provide the answer:`

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: qaPrompt }],
          temperature: 0.5,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('OpenAI API error:', errorData)
        return new Response(
          JSON.stringify({ error: 'Failed to generate Q&A answer' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      const answer = data.choices[0]?.message?.content || ''

      // Score answer quality
      const qualityPrompt = `Rate this Q&A answer on a scale of 1-10 for:
- Accuracy (1-10)
- Clarity (1-10)
- Completeness (1-10)
- Appropriateness (1-10)

Answer: "${answer}"

Respond with ONLY a JSON object:
{
  "overall_score": 1-10,
  "accuracy": 1-10,
  "clarity": 1-10,
  "completeness": 1-10,
  "appropriateness": 1-10,
  "feedback": "brief feedback on how to improve"
}`

      const qualityResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: qualityPrompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })

      let qualityScore = { overall_score: 7, accuracy: 7, clarity: 7, completeness: 7, appropriateness: 7, feedback: '' }
      if (qualityResponse.ok) {
        const qualityData = await qualityResponse.json()
        try {
          qualityScore = JSON.parse(qualityData.choices[0]?.message?.content || '{}')
        } catch (e) {
          console.error('Failed to parse quality score:', e)
        }
      }

      result = {
        answer,
        quality_score: qualityScore,
      }
    }
    // Handle insights generation
    else if (type === 'insights') {
      if (!messages || messages.length === 0) {
        return new Response(
          JSON.stringify({ error: 'messages array is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const timeRange = body.timeRange || 'all'
      const timeRangeLabel = timeRange === 'week' ? 'last week' : timeRange === 'month' ? 'last month' : 'all time'
      
      // Handle both string array and object array formats
      const messageList = Array.isArray(messages) && messages.length > 0
        ? (typeof messages[0] === 'string'
          ? messages.slice(0, 100).map((m: string, idx: number) => `${idx + 1}. ${m}`).join('\n')
          : messages.slice(0, 100).map((m: any, idx: number) => 
              `${idx + 1}. [${new Date(m.created_at).toLocaleDateString()}] ${m.body}`
            ).join('\n'))
        : ''

      const insightsPrompt = `Analyze these anonymous messages and generate comprehensive insights.

Time Range: ${timeRangeLabel}
Total Messages: ${messages.length}

Messages:
${messageList}

Generate a detailed analysis with:
1. **Main Themes** (3-5 key topics that appear frequently)
2. **Sentiment Trends** (how sentiment has changed over time)
3. **Topic Clustering** (group similar messages together)
4. **Content Opportunities** (suggestions for content, responses, or engagement)
5. **Key Insights** (notable patterns or observations)

Format as a structured report with clear sections.`

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: insightsPrompt }],
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('OpenAI API error:', errorData)
        return new Response(
          JSON.stringify({ error: 'Failed to generate insights' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      result = {
        insights: data.choices[0]?.message?.content || '',
        time_range: timeRange,
        message_count: messages.length,
        generated_at: new Date().toISOString(),
      }
    }
    // Handle quality scoring
    else if (type === 'quality-score') {
      if (!messageBody) {
        return new Response(
          JSON.stringify({ error: 'messageBody is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const qualityPrompt = `Rate this response message on a scale of 1-10 for quality.

Response: "${messageBody}"

Rate for:
- Empathy (1-10)
- Clarity (1-10)
- Appropriateness (1-10)
- Tone (1-10)

Respond with ONLY a JSON object:
{
  "overall_score": 1-10,
  "empathy": 1-10,
  "clarity": 1-10,
  "appropriateness": 1-10,
  "tone": 1-10,
  "feedback": "brief feedback on how to improve"
}`

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: qualityPrompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('OpenAI API error:', errorData)
        return new Response(
          JSON.stringify({ error: 'Failed to score response quality' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      try {
        result = JSON.parse(data.choices[0]?.message?.content || '{}')
      } catch (e) {
        result = { overall_score: 7, error: 'Failed to parse quality score' }
      }
    }

    return new Response(
      JSON.stringify({ result }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error in OpenAI function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

