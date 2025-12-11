// @ts-nocheck
// Supabase Edge Function for AI API calls
// Uses Groq first (free), falls back to OpenAI if Groq fails
// This keeps the API keys secure on the server side
// Note: @ts-nocheck is used because this file runs in Deno runtime, not Node.js

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Groq (Primary - Free)
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// OpenAI (Fallback)
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations'

/**
 * Call AI API with Groq first, fallback to OpenAI
 * Returns the response data or throws an error
 */
async function callAIWithFallback(
  prompt: string,
  model: string = 'gpt-4o-mini',
  temperature: number = 0.7,
  options?: { response_format?: { type: string } }
): Promise<any> {
  // Try Groq first (free)
  if (GROQ_API_KEY) {
    try {
      console.log('Attempting Groq API call...')
      const groqResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile', // Groq model (always use this for Groq)
          messages: [{ role: 'user', content: prompt }],
          temperature: temperature,
          ...options,
        }),
      })

      if (groqResponse.ok) {
        const groqData = await groqResponse.json()
        console.log('Groq API call successful')
        return groqData
      } else {
        const errorText = await groqResponse.text()
        console.log('Groq API failed, trying OpenAI fallback:', errorText.substring(0, 100))
        // Fall through to OpenAI
      }
    } catch (error) {
      console.log('Groq API error, trying OpenAI fallback:', error)
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    console.log('Using OpenAI API (fallback)')
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
        ...options,
      }),
    })

    if (!openaiResponse.ok) {
      throw await handleOpenAIError(openaiResponse, 'Failed to generate AI response')
    }

    const openaiData = await openaiResponse.json()
    return openaiData
  }

  throw new Error('No AI provider available. Please configure GROQ_API_KEY or OPENAI_API_KEY.')
}

/**
 * Handle OpenAI API errors and return user-friendly messages
 */
async function handleOpenAIError(response: Response, defaultMessage: string): Promise<Response> {
  const errorData = await response.text()
  let errorMessage = defaultMessage
  let statusCode = response.status

  try {
    const errorJson = JSON.parse(errorData)
    const errorType = errorJson.error?.type || errorJson.error?.code || ''
    const errorMsg = errorJson.error?.message || ''

    // Check for quota/billing errors - be specific to avoid false positives
    if (
      errorType === 'insufficient_quota' ||
      errorJson.error?.code === 'insufficient_quota' ||
      errorMsg.includes('insufficient_quota') ||
      errorMsg.includes('You exceeded your current quota') ||
      errorMsg.includes('You have exceeded your quota') ||
      errorMsg.includes('quota has been exceeded') ||
      (errorMsg.includes('billing') && (errorMsg.includes('quota') || errorMsg.includes('limit')))
    ) {
      errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits at https://platform.openai.com/usage'
      statusCode = 429
    }
    // Check for invalid API key
    else if (
      errorType === 'invalid_api_key' ||
      errorMsg.includes('Invalid API key') ||
      errorMsg.includes('Incorrect API key')
    ) {
      errorMessage = 'Invalid OpenAI API key. Please check your Edge Function secrets.'
      statusCode = 401
    }
    // Check for rate limiting (different from quota - this is requests per minute)
    else if (
      errorType === 'rate_limit_exceeded' ||
      errorJson.error?.code === 'rate_limit_exceeded' ||
      (errorMsg.includes('rate limit') && !errorMsg.includes('quota')) ||
      (statusCode === 429 && errorType !== 'insufficient_quota' && !errorMsg.includes('quota'))
    ) {
      errorMessage = 'OpenAI API rate limit exceeded. Please try again in a few moments.'
      statusCode = 429
    }
    // Use the error message from OpenAI if available
    else if (errorMsg) {
      errorMessage = errorMsg
    }
  } catch (e) {
    // If parsing fails, use the raw error data
    console.error('Failed to parse OpenAI error:', errorData)
  }

  console.error('OpenAI API error:', {
    status: statusCode,
    message: errorMessage,
    rawError: errorData.substring(0, 200), // Log first 200 chars
  })

  return new Response(
    JSON.stringify({ 
      error: errorMessage,
      type: 'openai_error',
      status: statusCode 
    }),
    { 
      status: statusCode, 
      headers: { 'Content-Type': 'application/json' } 
    }
  )
}

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
  // Priority scoring fields
  ai_category?: string
  ai_sentiment?: string
  ai_urgency?: string
  ai_moderation_severity?: string
  ai_self_harm_risk?: string
  created_at?: string
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

    // Check API keys (need at least one)
    if (!GROQ_API_KEY && !OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'No AI API keys configured. Please set GROQ_API_KEY or OPENAI_API_KEY in Edge Function secrets.' }),
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
        return await handleOpenAIError(moderationResponse, 'Failed to moderate message')
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

      let selfHarmAnalysis = { risk_level: 'none', reasoning: '', requires_immediate_attention: false }
      try {
        const selfHarmData = await callAIWithFallback(selfHarmPrompt, 'gpt-4o-mini', 0.3, { response_format: { type: 'json_object' } })
        try {
          selfHarmAnalysis = JSON.parse(selfHarmData.choices[0]?.message?.content || '{}')
        } catch (e) {
          console.error('Failed to parse self-harm analysis:', e)
        }
      } catch (e) {
        console.error('Failed to get self-harm analysis:', e)
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

      const categorizeData = await callAIWithFallback(categorizePrompt, 'gpt-4o-mini', 0.3, { response_format: { type: 'json_object' } })
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

"${messageBody}"${contextInfo}

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

      const priorityData = await callAIWithFallback(priorityPrompt, 'gpt-4o-mini', 0.3, { response_format: { type: 'json_object' } })
      try {
        result = JSON.parse(priorityData.choices[0]?.message?.content || '{}')
      } catch (e) {
        result = { priority_score: 50, error: 'Failed to parse priority score' }
      }
    }
    // Handle reply templates (existing)
    else if (type === 'reply-templates') {
      const prompt = `You are helping a content creator respond to an anonymous message. Read the message carefully and understand what the person is actually saying, asking, or expressing.

MESSAGE TO RESPOND TO:
"${messageBody}"

INSTRUCTIONS:
1. FIRST, analyze what this message is really about:
   - Is it a question? What are they asking?
   - Is it feedback? What kind?
   - Is it emotional? What emotion?
   - Is it a request? What do they want?
   - Is it just a greeting? Keep it simple.

2. THEN, generate 3 thoughtful reply options that:
   - Directly address what the person actually said
   - Are genuine and authentic (not generic or robotic)
   - Match the tone and energy of the original message
   - Are empathetic if the message is emotional
   - Are helpful if the message is a question
   - Are appreciative if the message is positive
   - Are 2-4 sentences each
   - Are labeled 1), 2), 3)

3. Make each reply option different:
   - Option 1: More direct/straightforward approach
   - Option 2: More empathetic/warm approach  
   - Option 3: More casual/friendly approach

IMPORTANT: Base your replies on what the message ACTUALLY says, not generic responses. If the message is just "hi", keep it simple. If it's a deep question, give a thoughtful answer.

Generate the 3 reply options now:`

      const aiData = await callAIWithFallback(prompt, 'gpt-4o-mini', 0.7)
      result = aiData.choices[0]?.message?.content || 'Failed to generate response'
    }
    // Handle theme summary (existing)
    else if (type === 'theme-summary') {
      // Format messages with numbering for better context
      const messageArray = messages!.slice(0, 20)
      const messageList = messageArray
        .map((m, idx) => {
          const messageText = typeof m === 'string' ? m : m.body || m
          return `${idx + 1}. "${messageText}"`
        })
        .join('\n')
      
      const messageCount = messageArray.length
      
      const prompt = `You are analyzing anonymous messages received by a content creator. Your job is to READ each message carefully and provide REAL insights based on what people ACTUALLY wrote.

MESSAGES TO ANALYZE (${messageCount} total):
${messageList}

ANALYSIS PROCESS:
1. Read EVERY message individually - what does each person actually say?
2. Look for REAL patterns:
   - Are there common questions? What are people asking?
   - Are there common topics? What subjects come up?
   - Are there common emotions? How are people feeling?
   - Are there common requests? What do people want?
3. Identify ACTUAL themes (not generic ones):
   - If people ask "when will you...", the theme is about timing/scheduling
   - If people say "I love your...", the theme is appreciation/compliments
   - If people ask "how do you...", the theme is advice/learning
   - If messages are just "hi" or "hello", note these are simple greetings
4. Be SPECIFIC - don't say "communication" if the messages are actually asking specific questions

Provide your analysis in this exact format:

### Main Themes

[3-5 bullet points. Each should be SPECIFIC about what you actually found:
- "People are asking about [specific topic]" (if they are)
- "Several messages express [specific emotion] about [specific thing]"
- "Multiple questions about [specific subject]"
- "Simple greetings and brief messages" (if that's what they are)
- Be concrete and specific, not vague or generic]

### Self-Care Reminders

1. [Practical reminder based on the actual message patterns you found]
2. [Second reminder relevant to managing these specific types of messages]

CRITICAL: Only identify themes that are ACTUALLY in the messages. If messages are mostly greetings, say that. If they're questions, say what they're asking about. Be honest and specific.`

      const aiData = await callAIWithFallback(prompt, 'gpt-4o-mini', 0.7)
      result = aiData.choices[0]?.message?.content || 'Failed to generate response'
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

      const enhancedPrompt = `You are helping a content creator craft the perfect response to an anonymous message. Read the message carefully and understand the full context.

CURRENT MESSAGE TO RESPOND TO:
"${messageBody}"${contextInfo}

ANALYSIS REQUIRED:
1. What is this message really about? (question, feedback, emotion, request, greeting, etc.)
2. What tone does the sender use? (serious, casual, emotional, curious, etc.)
3. What do they need or want? (answer, acknowledgment, support, etc.)
4. If there's message history, how does this message relate to previous ones?

REPLY REQUIREMENTS:
- ${toneInstruction}
- Each reply should be 2-4 sentences
- Be authentic, genuine, and human (not robotic or generic)
- Directly address what the person actually said
- Consider the full context including message history
- Match the energy and tone of the original message
- Label them 1), 2), 3)

REPLY OPTIONS (make each different):
1) More direct/straightforward - gets to the point
2) More empathetic/warm - shows understanding and care
3) More conversational/friendly - builds connection

Generate 3 high-quality, contextually-aware reply options that truly respond to what this person is saying:`

      const aiData = await callAIWithFallback(enhancedPrompt, 'gpt-4o-mini', 0.7)
      result = {
        replies: aiData.choices[0]?.message?.content || 'Failed to generate replies',
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

      const qaPrompt = `You are helping a content creator answer a question in a Q&A session. Read the question carefully and understand what the person is ACTUALLY asking.

QUESTION TO ANSWER:
"${body.questionText}"
${body.qaSessionContext ? `\n\nQ&A SESSION CONTEXT:\n${body.qaSessionContext}` : ''}

INSTRUCTIONS:
1. FIRST, understand what they're really asking:
   - What is the core question?
   - What do they want to know?
   - What information are they seeking?
   - Is there a deeper question behind the words?

2. THEN, generate a helpful answer that:
   - Directly addresses what they're asking (not a generic response)
   - Is clear, well-structured, and easy to understand
   - Is appropriate for the Q&A context
   - Is 2-5 sentences (comprehensive but concise)
   - Shows you actually read and understood their question
   - Provides value and helpful information

3. Make it personal and genuine:
   - Answer as if you're the creator responding
   - Be authentic and human
   - If you don't have enough context, acknowledge that but still try to help

Provide your answer now:`

      const aiData = await callAIWithFallback(qaPrompt, 'gpt-4o-mini', 0.5)
      const answer = aiData.choices[0]?.message?.content || ''

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

      let qualityScore = { overall_score: 7, accuracy: 7, clarity: 7, completeness: 7, appropriateness: 7, feedback: '' }
      try {
        const qualityData = await callAIWithFallback(qualityPrompt, 'gpt-4o-mini', 0.3, { response_format: { type: 'json_object' } })
        try {
          qualityScore = JSON.parse(qualityData.choices[0]?.message?.content || '{}')
        } catch (e) {
          console.error('Failed to parse quality score:', e)
        }
      } catch (e) {
        console.error('Failed to get quality score:', e)
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
          ? (messages as string[]).slice(0, 100).map((m: string, idx: number) => `${idx + 1}. ${m}`).join('\n')
          : (messages as Array<{ body: string; created_at: string; mood?: string }>).slice(0, 100).map((m: any, idx: number) => 
              `${idx + 1}. [${new Date(m.created_at).toLocaleDateString()}] ${m.body}`
            ).join('\n'))
        : ''

      const insightsPrompt = `You are analyzing anonymous messages to provide real, actionable insights. Read each message carefully and identify what people are ACTUALLY saying.

CONTEXT:
- Time Range: ${timeRangeLabel}
- Total Messages: ${messages.length}

MESSAGES:
${messageList}

ANALYSIS REQUIRED:
1. **Main Themes** - What topics, questions, or subjects appear most often? Be SPECIFIC:
   - If people ask questions, what are they asking about?
   - If people give feedback, what kind?
   - If people express emotions, what emotions and about what?
   - List actual themes found, not generic ones

2. **Sentiment Trends** - How do people feel? Be specific:
   - What percentage seems positive/negative/neutral?
   - What are they positive/negative about?
   - Any patterns in emotional tone?

3. **Topic Clustering** - Group similar messages:
   - Questions about [specific topic]
   - Compliments about [specific thing]
   - Requests for [specific action]
   - Simple greetings
   - Be concrete about what groups you find

4. **Content Opportunities** - Based on what people ACTUALLY said:
   - What content would address their questions?
   - What topics are they interested in?
   - What would they find valuable?
   - Base suggestions on actual message content

5. **Key Insights** - Notable patterns:
   - What stands out?
   - What should the creator pay attention to?
   - Any surprises or important observations?

Format as a structured report. Be SPECIFIC and base everything on what the messages actually say, not assumptions.`

      const aiData = await callAIWithFallback(insightsPrompt, 'gpt-4o-mini', 0.7)
      result = {
        insights: aiData.choices[0]?.message?.content || '',
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

      const aiData = await callAIWithFallback(qualityPrompt, 'gpt-4o-mini', 0.3, { response_format: { type: 'json_object' } })
      try {
        result = JSON.parse(aiData.choices[0]?.message?.content || '{}')
      } catch (e) {
        result = { overall_score: 7, empathy: 7, clarity: 7, appropriateness: 7, tone: 7, feedback: '' }
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

